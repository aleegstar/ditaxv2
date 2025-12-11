import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X, AlertCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { ChecklistItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { useFormContext } from '@/contexts';

import { FileUpload, Screenshot } from './ui/pdf-preview-page';
interface InlineDocumentUploaderProps {
  checklistItem: ChecklistItem;
  onDocumentSubmitted: () => void;
  onClose: () => void;
}
interface FileWithPreview {
  file: File;
  preview?: string;
  id: string;
  uploading: boolean;
  progress: number;
  error?: string;
  uploaded: boolean;
}
interface ImagePreview {
  id: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
}
declare global {
  interface Window {
    pdfjsLib: any;
  }
}
const InlineDocumentUploader: React.FC<InlineDocumentUploaderProps> = ({
  checklistItem,
  onDocumentSubmitted,
  onClose
}) => {
  const { taxYear } = useFormContext();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pdfLibLoaded, setPdfLibLoaded] = useState(false);
  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [imagePreviews, setImagePreviews] = useState<ImagePreview[]>([]);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const {
    toast
  } = useToast();
  const encryptedDocService = EncryptedDocumentService.getInstance();
  const MAX_FILES = 10;

  // Load PDF.js library
  useEffect(() => {
    if (window.pdfjsLib) {
      setPdfLibLoaded(true);
      return;
    }
    const mainScript = document.createElement("script");
    mainScript.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
    mainScript.async = true;
    mainScript.onload = () => {
      const workerUrl = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      setTimeout(() => {
        setPdfLibLoaded(true);
      }, 500);
    };
    mainScript.onerror = () => {
      setError("PDF-Verarbeitungsbibliothek konnte nicht geladen werden");
    };
    document.body.appendChild(mainScript);
    return () => {
      if (document.body.contains(mainScript)) {
        document.body.removeChild(mainScript);
      }
    };
  }, []);

  // Cleanup image preview URLs when component unmounts
  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        URL.revokeObjectURL(preview.dataUrl);
      });
    };
  }, [imagePreviews]);
  const convertPageToScreenshot = async (page: any, pageNumber: number): Promise<Screenshot> => {
    const viewport = page.getViewport({
      scale: 1.5
    });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const renderContext = {
      canvasContext: context,
      viewport: viewport
    };
    await page.render(renderContext).promise;
    return {
      id: `page-${pageNumber}`,
      dataUrl: canvas.toDataURL('image/png'),
      pageNumber
    };
  };
  const createImagePreview = async (file: File): Promise<ImagePreview> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({
          id: uuidv4(),
          dataUrl: reader.result as string,
          fileName: file.name,
          fileSize: file.size
        });
      };
      reader.onerror = () => {
        reject(new Error(`Failed to read image: ${file.name}`));
      };
      reader.readAsDataURL(file);
    });
  };
  const checkForDuplicates = (newFiles: File[], existingFiles: FileWithPreview[]) => {
    const existingNames = existingFiles.map(f => f.file.name.toLowerCase());
    return newFiles.filter(file => !existingNames.includes(file.name.toLowerCase()));
  };
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
    setError(null);

    // Check if adding new files would exceed the maximum
    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`Maximale Anzahl von ${MAX_FILES} Dateien würde überschritten. Du kannst noch ${MAX_FILES - files.length} Datei(en) hinzufügen.`);
      return;
    }

    // Check for duplicates
    const uniqueFiles = checkForDuplicates(selectedFiles, files);
    if (uniqueFiles.length !== selectedFiles.length) {
      const duplicateCount = selectedFiles.length - uniqueFiles.length;
      toast({
        title: "Duplicate Dateien ignoriert",
        description: `${duplicateCount} Datei(en) mit gleichem Namen bereits vorhanden.`,
        variant: "default"
      });
    }
    if (uniqueFiles.length === 0) {
      return;
    }
    const newFiles: FileWithPreview[] = [];
    const newImagePreviews: ImagePreview[] = [];
    const imageFiles: File[] = [];
    let newPdfFile: File | null = null;
    setIsProcessing(true);
    try {
      for (const selectedFile of uniqueFiles) {
        // File validation
        if (selectedFile.size > 10 * 1024 * 1024) {
          setError(`Die Datei "${selectedFile.name}" ist zu groß (max. 10 MB).`);
          continue;
        }
        const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp', 'application/pdf'];
        if (!allowedTypes.includes(selectedFile.type)) {
          setError(`Die Datei "${selectedFile.name}" hat ein ungültiges Format.`);
          continue;
        }
        const fileWithPreview: FileWithPreview = {
          file: selectedFile,
          id: uuidv4(),
          uploading: false,
          progress: 0,
          uploaded: false
        };

        // Separate image and PDF files for processing
        if (selectedFile.type.startsWith('image/')) {
          imageFiles.push(selectedFile);
        } else if (selectedFile.type === 'application/pdf') {
          newPdfFile = selectedFile;
        }
        newFiles.push(fileWithPreview);
      }

      // Process all image files
      if (imageFiles.length > 0) {
        for (const imageFile of imageFiles) {
          try {
            const imagePreview = await createImagePreview(imageFile);
            newImagePreviews.push(imagePreview);
          } catch (err) {
            console.error('Error creating image preview:', err);
            setError(`Vorschau für "${imageFile.name}" konnte nicht erstellt werden`);
          }
        }

        // Set current file to the first image if no PDF
        if (!newPdfFile && imageFiles.length > 0) {
          setCurrentFile(imageFiles[0]);
        }
      }

      // Process PDF file
      if (newPdfFile && pdfLibLoaded) {
        setCurrentFile(newPdfFile);
        try {
          const arrayBuffer = await newPdfFile.arrayBuffer();
          const pdf = await window.pdfjsLib.getDocument({
            data: arrayBuffer
          }).promise;
          const newScreenshots: Screenshot[] = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const screenshot = await convertPageToScreenshot(page, pageNum);
            newScreenshots.push(screenshot);
          }

          // Append new screenshots to existing ones
          setScreenshots(prev => [...prev, ...newScreenshots]);
        } catch (err) {
          console.error('Error processing PDF:', err);
          setError('PDF konnte nicht verarbeitet werden');
        }
      }

      // Append new files and previews to state
      setFiles(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...newImagePreviews]);
    } finally {
      setIsProcessing(false);
    }

    // Reset file input
    if (event.target) event.target.value = '';
  };
  const handleClear = () => {
    // Cleanup existing image preview URLs
    imagePreviews.forEach(preview => {
      URL.revokeObjectURL(preview.dataUrl);
    });
    setFiles([]);
    setScreenshots([]);
    setImagePreviews([]);
    setCurrentFile(null);
    setError(null);
  };
  const handleRemoveFile = (fileId: string) => {
    const removedFile = files.find(f => f.id === fileId);
    if (removedFile) {
      // Remove from files
      setFiles(prev => prev.filter(f => f.id !== fileId));

      // If this was the current file, clear it
      if (currentFile?.name === removedFile.file.name) {
        setCurrentFile(null);
      }

      // Remove associated previews
      if (removedFile.file.type.startsWith('image/')) {
        const previewToRemove = imagePreviews.find(p => p.fileName === removedFile.file.name);
        if (previewToRemove) {
          URL.revokeObjectURL(previewToRemove.dataUrl);
          setImagePreviews(prev => prev.filter(p => p.fileName !== removedFile.file.name));
        }
      } else if (removedFile.file.type === 'application/pdf') {
        // Clear all screenshots if it was the current PDF
        setScreenshots([]);
      }
    }
  };

  // Upload single file logic
  const uploadSingleFile = async (fileWithPreview: FileWithPreview): Promise<boolean> => {
    try {
      const {
        data: sessionData,
        error: sessionError
      } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Du musst angemeldet sein, um Dokumente hochzuladen.');
      }
      const userId = sessionData.session.user.id;
      setFiles(prev => prev.map(f => f.id === fileWithPreview.id ? {
        ...f,
        uploading: true,
        progress: 20
      } : f));
      setFiles(prev => prev.map(f => f.id === fileWithPreview.id ? {
        ...f,
        progress: 50
      } : f));
      await encryptedDocService.uploadEncryptedDocument(fileWithPreview.file, checklistItem.id, userId, taxYear);
      setFiles(prev => prev.map(f => f.id === fileWithPreview.id ? {
        ...f,
        progress: 100,
        uploaded: true,
        uploading: false
      } : f));
      return true;
    } catch (err: any) {
      console.error('Upload error:', err);
      setFiles(prev => prev.map(f => f.id === fileWithPreview.id ? {
        ...f,
        error: err.message,
        uploading: false,
        progress: 0
      } : f));
      return false;
    }
  };
  const handleUploadAll = async () => {
    if (!files.length) {
      setError('Bitte wählen Sie mindestens eine Datei aus.');
      return;
    }
    const filesToUpload = files.filter(f => !f.uploaded && !f.error);
    if (!filesToUpload.length) {
      setError('Keine Dateien zum Hochladen vorhanden.');
      return;
    }
    setUploading(true);
    setError(null);
    let successCount = 0;
    for (const file of filesToUpload) {
      const success = await uploadSingleFile(file);
      if (success) successCount++;
    }
    setUploading(false);
    if (successCount > 0) {
      toast({
        title: "Dokumente hochgeladen",
        description: `${successCount} von ${filesToUpload.length} Dateien erfolgreich hochgeladen.`
      });
      onDocumentSubmitted();
      if (successCount === filesToUpload.length) {
        // Auto-close after successful upload
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } else {
      setError('Keine Dateien konnten erfolgreich hochgeladen werden.');
    }
  };
  const hasValidFiles = files.some(f => !f.error);
  const hasUploadedFiles = files.some(f => f.uploaded);
  const uploadableFiles = files.filter(f => !f.uploaded && !f.error);
  return <div className="w-full">
      {/* File Upload Component */}
      <FileUpload onFileUpload={handleFileUpload} onClear={handleClear} isProcessing={isProcessing} pdfLibLoaded={pdfLibLoaded} error={error} file={currentFile} screenshots={screenshots} imagePreviews={imagePreviews} accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,application/pdf" maxFiles={MAX_FILES} />

      {/* File List */}
      {files.length > 0 && <div className="mt-6 space-y-3">
          <h4 className="text-white font-medium">Ausgewählte Dateien:</h4>
          {files.map(fileWithPreview => <div key={fileWithPreview.id} className="rounded-xl p-4 border border-white/20 bg-white/5 backdrop-blur-[20px]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="font-medium text-white mr-2">{fileWithPreview.file.name}</span>
                  <span className="text-xs text-white/60">
                    {(fileWithPreview.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {fileWithPreview.uploaded && <span className="text-green-400 text-sm">✓ Hochgeladen</span>}
                  <Button variant="ghost" size="sm" onClick={() => handleRemoveFile(fileWithPreview.id)} disabled={fileWithPreview.uploading} className="text-white/60 hover:text-white hover:bg-white/10">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {fileWithPreview.error && <div className="mb-2 p-2 bg-red-500/20 text-red-300 rounded border border-red-500/30 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">{fileWithPreview.error}</span>
                </div>}
              
              {fileWithPreview.uploading && <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-white/70">Upload läuft</span>
                    <span className="text-white/70">{Math.round(fileWithPreview.progress)}%</span>
                  </div>
                  <Progress value={fileWithPreview.progress} className="h-2" />
                </div>}
            </div>)}
        </div>}

      {/* Upload Button */}
      {hasValidFiles && <div className="flex justify-between mt-6">
          <Button onClick={onClose} variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
            Schließen
          </Button>
          <Button onClick={handleUploadAll} disabled={uploading || uploadableFiles.length === 0} className="min-w-32 text-white bg-[#0eca7b]">
            {uploading ? <div className="flex items-center gap-2">
                <span>Upload läuft...</span>
              </div> : <>
                {uploadableFiles.length} Datei{uploadableFiles.length !== 1 ? 'en' : ''} 
                hochladen
              </>}
          </Button>
        </div>}
    </div>;
};
export default InlineDocumentUploader;