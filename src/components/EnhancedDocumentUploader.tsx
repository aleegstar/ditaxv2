import React, { useState, useRef, useEffect } from 'react';
import { FramerButton } from "@/components/ui/framer-button";
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
import { validateFile } from '@/utils/fileValidation';

// Component props interface
export interface DocumentUploaderProps {
  checklistItem?: ChecklistItem;
  onBack: () => void;
  onDocumentSubmitted: () => void;
  hasUploadedFiles?: boolean;
  onPreviewChange?: (hasPreview: boolean) => void;
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

// Global PDF.js type declaration
declare global {
  interface Window {
    pdfjsLib: any;
  }
}

const EnhancedDocumentUploader: React.FC<DocumentUploaderProps> = ({
  checklistItem,
  onBack,
  onDocumentSubmitted,
  hasUploadedFiles: externalHasUploadedFiles,
  onPreviewChange
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
  const { toast } = useToast();
  const uploadRequestId = useRef(uuidv4()).current;
  const encryptedDocService = EncryptedDocumentService.getInstance();
  const MAX_FILES = 10;

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

  useEffect(() => {
    return () => {
      imagePreviews.forEach(preview => {
        URL.revokeObjectURL(preview.dataUrl);
      });
    };
  }, [imagePreviews]);

  // Notify parent component when files are in uploader
  useEffect(() => {
    const hasFilesInUploader = files.length > 0 || screenshots.length > 0 || imagePreviews.length > 0;
    onPreviewChange?.(hasFilesInUploader);
  }, [files, screenshots, imagePreviews, onPreviewChange]);

  const convertPageToScreenshot = async (page: any, pageNumber: number): Promise<Screenshot> => {
    try {
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });
      
      if (!context) {
        throw new Error('Could not get canvas context');
      }
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      const renderContext = {
        canvasContext: context,
        viewport: viewport
      };
      
      await page.render(renderContext).promise;
      
      const dataUrl = canvas.toDataURL('image/png');
      
      // Verify we got valid data
      if (!dataUrl || dataUrl === 'data:,' || dataUrl.length < 100) {
        throw new Error('Generated invalid canvas data');
      }
      
      return {
        id: `page-${pageNumber}`,
        dataUrl: dataUrl,
        pageNumber
      };
    } catch (error) {
      console.error(`Error converting page ${pageNumber}:`, error);
      throw error;
    }
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
    console.log('🚀 handleFileUpload called!');
    const selectedFiles = Array.from(event.target.files || []);
    console.log('📁 Selected files:', selectedFiles.map(f => ({ name: f.name, type: f.type, size: f.size })));
    if (!selectedFiles.length) {
      console.log('⚠️ No files selected, returning early');
      return;
    }
    setError(null);

    if (files.length + selectedFiles.length > MAX_FILES) {
      setError(`Maximale Anzahl von ${MAX_FILES} Dateien würde überschritten. Du kannst noch ${MAX_FILES - files.length} Datei(en) hinzufügen.`);
      return;
    }

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
        // Enhanced validation with magic number verification
        const validationResult = await validateFile(selectedFile, 10 * 1024 * 1024);
        
        if (!validationResult.isValid) {
          setError(`"${selectedFile.name}": ${validationResult.error}`);
          toast({
            title: "Sicherheitswarnung",
            description: validationResult.error,
            variant: "destructive"
          });
          continue;
        }
        
        console.log(`✅ File validated: ${selectedFile.name} (detected: ${validationResult.detectedType})`);
        
        // Use original file without any processing
        let processedFile = selectedFile;
        
        console.log(`🎯 Final file type: ${processedFile.type}`);
        const fileWithPreview: FileWithPreview = {
          file: processedFile,
          id: uuidv4(),
          uploading: false,
          progress: 0,
          uploaded: false
        };

        if (processedFile.type.startsWith('image/')) {
          console.log(`✅ Adding to imageFiles: ${processedFile.name}`);
          imageFiles.push(processedFile);
        } else if (processedFile.type === 'application/pdf') {
          console.log(`✅ Setting as PDF: ${processedFile.name}`);
          newPdfFile = processedFile;
        } else {
          console.warn(`⚠️ Unknown file type ${processedFile.type} for ${processedFile.name}`);
        }
        newFiles.push(fileWithPreview);
      }
      
      console.log(`📊 Processing summary - Total files: ${newFiles.length}, Image files: ${imageFiles.length}, PDF: ${newPdfFile ? 'Yes' : 'No'}`);

      if (imageFiles.length > 0) {
        for (const imageFile of imageFiles) {
          try {
            console.log('Creating preview for:', imageFile.name, 'type:', imageFile.type, 'size:', imageFile.size);
            const imagePreview = await createImagePreview(imageFile);
            console.log('Preview created successfully:', imagePreview.fileName, 'dataUrl length:', imagePreview.dataUrl?.length || 0);
            newImagePreviews.push(imagePreview);
          } catch (err) {
            console.error('Error creating image preview:', err);
            setError(`Vorschau für "${imageFile.name}" konnte nicht erstellt werden`);
          }
        }

        if (!newPdfFile && imageFiles.length > 0) {
          setCurrentFile(imageFiles[0]);
        }
      }
      
      console.log('Total image previews to add:', newImagePreviews.length);

      if (newPdfFile && pdfLibLoaded) {
        setCurrentFile(newPdfFile);
        try {
          console.log('📄 Processing PDF:', newPdfFile.name, 'size:', newPdfFile.size);
          const arrayBuffer = await newPdfFile.arrayBuffer();
          console.log('📄 ArrayBuffer loaded, size:', arrayBuffer.byteLength);
          
          const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          console.log('📄 PDF loaded successfully, pages:', pdf.numPages);
          
          const newScreenshots: Screenshot[] = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            console.log(`📄 Rendering page ${pageNum}/${pdf.numPages}`);
            const page = await pdf.getPage(pageNum);
            const screenshot = await convertPageToScreenshot(page, pageNum);
            newScreenshots.push(screenshot);
            console.log(`✅ Page ${pageNum} rendered successfully`);
          }

          console.log(`📄 All ${newScreenshots.length} pages rendered successfully`);
          setScreenshots(prev => [...prev, ...newScreenshots]);
        } catch (err) {
          console.error('❌ Error processing PDF:', err);
          console.error('❌ Error details:', {
            name: err.name,
            message: err.message,
            stack: err.stack
          });
          setError(`PDF konnte nicht verarbeitet werden: ${err.message}`);
        }
      } else if (newPdfFile && !pdfLibLoaded) {
        console.warn('⚠️ PDF.js library not loaded yet, cannot preview PDF');
        setError('PDF-Bibliothek wird noch geladen...');
      }

      setFiles(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => {
        const updated = [...prev, ...newImagePreviews];
        console.log('Image previews state updated. Total count:', updated.length);
        return updated;
      });
    } catch (error) {
      console.error('❌ Error in handleFileUpload:', error);
      setError('Fehler beim Hochladen der Datei(en)');
    } finally {
      console.log('🏁 handleFileUpload finished, setting isProcessing to false');
      setIsProcessing(false);
    }

    if (event.target) event.target.value = '';
  };

  const handleClear = () => {
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
      setFiles(prev => prev.filter(f => f.id !== fileId));

      if (currentFile?.name === removedFile.file.name) {
        setCurrentFile(null);
      }

      if (removedFile.file.type.startsWith('image/')) {
        const previewToRemove = imagePreviews.find(p => p.fileName === removedFile.file.name);
        if (previewToRemove) {
          URL.revokeObjectURL(previewToRemove.dataUrl);
          setImagePreviews(prev => prev.filter(p => p.fileName !== removedFile.file.name));
        }
      } else if (removedFile.file.type === 'application/pdf') {
        setScreenshots([]);
      }
    }
  };

  const uploadSingleFile = async (fileWithPreview: FileWithPreview): Promise<boolean> => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData.session) {
        throw new Error('Du musst angemeldet sein, um Dokumente hochzuladen.');
      }
      const userId = sessionData.session.user.id;
      setFiles(prev => prev.map(f => f.id === fileWithPreview.id ? { ...f, uploading: true, progress: 20 } : f));
      setFiles(prev => prev.map(f => f.id === fileWithPreview.id ? { ...f, progress: 50 } : f));
      await encryptedDocService.uploadEncryptedDocument(
        fileWithPreview.file, 
        checklistItem?.id || null, 
        userId, 
        taxYear
      );
      setFiles(prev => prev.map(f => f.id === fileWithPreview.id ? { ...f, progress: 100, uploaded: true, uploading: false } : f));
      return true;
    } catch (err: any) {
      console.error('Upload error:', err);
      setFiles(prev => prev.map(f => f.id === fileWithPreview.id ? { ...f, error: err.message, uploading: false, progress: 0 } : f));
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
        setTimeout(() => {
          onBack();
        }, 800);
      }
    } else {
      setError('Keine Dateien konnten erfolgreich hochgeladen werden.');
    }
  };

  const hasValidFiles = files.some(f => !f.error);
  const internalHasUploadedFiles = files.some(f => f.uploaded);
  const uploadableFiles = files.filter(f => !f.uploaded && !f.error);
  
  // Use external prop if provided, otherwise use internal state
  const hasUploadedFiles = externalHasUploadedFiles !== undefined 
    ? externalHasUploadedFiles 
    : internalHasUploadedFiles;

  return (
    <div 
      className="w-full" 
      data-uploader-preview={screenshots.length > 0 || imagePreviews.length > 0 ? "true" : undefined}
    >
      {/* File Upload Component */}
      <FileUpload 
        onFileUpload={handleFileUpload} 
        onClear={handleClear} 
        isProcessing={isProcessing} 
        pdfLibLoaded={pdfLibLoaded} 
        error={error} 
        file={currentFile} 
        screenshots={screenshots} 
        imagePreviews={imagePreviews} 
        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,application/pdf" 
        maxFiles={MAX_FILES}
        hasUploadedFiles={hasUploadedFiles}
      />

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3 px-6">
          <h4 className="text-white font-medium">Ausgewählte Dateien:</h4>
          {files.map(fileWithPreview => (
            <div key={fileWithPreview.id} className="rounded-xl p-4 border border-white/10 bg-[#0a0a0a]">
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center min-w-0 flex-1">
                  <span className="font-medium text-white mr-2 truncate" title={fileWithPreview.file.name}>
                    {fileWithPreview.file.name}
                  </span>
                  <span className="text-xs text-white/50 whitespace-nowrap shrink-0">
                    {(fileWithPreview.file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {fileWithPreview.uploaded && (
                    <span className="text-green-400 text-sm">✓ Hochgeladen</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveFile(fileWithPreview.id)}
                    disabled={fileWithPreview.uploading}
                    className="text-white/50 hover:text-white hover:bg-white/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {fileWithPreview.error && (
                <div className="mb-2 p-2 bg-red-500/20 text-red-400 rounded border border-red-500/30 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  <span className="text-sm">{fileWithPreview.error}</span>
                </div>
              )}
              
              {fileWithPreview.uploading && (
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-white/50">Upload läuft</span>
                      <span className="text-white/50">{Math.round(fileWithPreview.progress)}%</span>
                    </div>
                  <Progress value={fileWithPreview.progress} className="h-2" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col gap-4 mt-2">
        {hasValidFiles && (
          <FramerButton
            onClick={handleUploadAll}
            disabled={uploading || uploadableFiles.length === 0}
            variant="desktop"
            className="w-full"
          >
            {uploading ? 'Wird hochgeladen...' : 'Hochladen'}
          </FramerButton>
        )}

      </div>
    </div>
  );
};

export default EnhancedDocumentUploader;
