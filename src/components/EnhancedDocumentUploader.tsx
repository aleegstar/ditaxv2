import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X, AlertCircle, Check, Loader2 } from 'lucide-react';
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

// Get file extension badge color
const getExtensionColor = (ext: string) => {
  switch (ext.toLowerCase()) {
    case 'pdf':
      return 'bg-red-500';
    case 'png':
      return 'bg-blue-500';
    case 'jpg':
    case 'jpeg':
      return 'bg-green-500';
    case 'gif':
      return 'bg-purple-500';
    case 'webp':
      return 'bg-orange-500';
    default:
      return 'bg-gray-500';
  }
};

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
    const selectedFiles = Array.from(event.target.files || []);
    if (!selectedFiles.length) return;
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
    if (uniqueFiles.length === 0) return;

    const newFiles: FileWithPreview[] = [];
    const newImagePreviews: ImagePreview[] = [];
    const imageFiles: File[] = [];
    let newPdfFile: File | null = null;
    setIsProcessing(true);

    try {
      for (const selectedFile of uniqueFiles) {
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
        
        let processedFile = selectedFile;
        
        const fileWithPreview: FileWithPreview = {
          file: processedFile,
          id: uuidv4(),
          uploading: false,
          progress: 0,
          uploaded: false
        };

        if (processedFile.type.startsWith('image/')) {
          imageFiles.push(processedFile);
        } else if (processedFile.type === 'application/pdf') {
          newPdfFile = processedFile;
        }
        newFiles.push(fileWithPreview);
      }

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

        if (!newPdfFile && imageFiles.length > 0) {
          setCurrentFile(imageFiles[0]);
        }
      }

      if (newPdfFile && pdfLibLoaded) {
        setCurrentFile(newPdfFile);
        try {
          const arrayBuffer = await newPdfFile.arrayBuffer();
          const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          
          const newScreenshots: Screenshot[] = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const screenshot = await convertPageToScreenshot(page, pageNum);
            newScreenshots.push(screenshot);
          }

          setScreenshots(prev => [...prev, ...newScreenshots]);
        } catch (err: any) {
          console.error('Error processing PDF:', err);
          setError(`PDF konnte nicht verarbeitet werden: ${err.message}`);
        }
      } else if (newPdfFile && !pdfLibLoaded) {
        setError('PDF-Bibliothek wird noch geladen...');
      }

      setFiles(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...newImagePreviews]);
    } catch (error) {
      console.error('Error in handleFileUpload:', error);
      setError('Fehler beim Hochladen der Datei(en)');
    } finally {
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
  const uploadableFiles = files.filter(f => !f.uploaded && !f.error);

  return (
    <div className="min-h-screen bg-[#050505] pb-24">
      {/* Ambient Glow */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#1d64ff]/20 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="relative z-10 px-5 pt-6">
        {/* File Upload Component */}
        <FileUpload 
          onFileUpload={handleFileUpload} 
          onClear={handleClear}
          onBack={onBack}
          isProcessing={isProcessing} 
          pdfLibLoaded={pdfLibLoaded} 
          error={error} 
          file={currentFile} 
          screenshots={screenshots} 
          imagePreviews={imagePreviews} 
          accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,application/pdf" 
          maxFiles={MAX_FILES}
        />

        {/* Selected Files Section */}
        {files.length > 0 && (
          <div className="mt-8">
            {/* Section Header */}
            <h4 className="text-xs font-semibold text-white/60 tracking-wider uppercase mb-4">
              Ausgewählte Dateien
            </h4>
            
            {/* File List */}
            <div className="space-y-3">
              {files.map(fileWithPreview => {
                const ext = fileWithPreview.file.name.split('.').pop()?.toUpperCase() || 'FILE';
                const fileSizeMB = (fileWithPreview.file.size / (1024 * 1024)).toFixed(2);
                
                return (
                  <div 
                    key={fileWithPreview.id} 
                    className="flex items-center gap-3 p-3 rounded-xl border border-white/10 bg-[#0d0d0d]"
                  >
                    {/* Extension Badge */}
                    <div className={`w-10 h-10 rounded-lg ${getExtensionColor(ext)} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-[10px] font-bold text-white">{ext}</span>
                    </div>
                    
                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">
                        {fileWithPreview.file.name}
                      </p>
                      <p className="text-xs text-[#1d64ff]">
                        {fileSizeMB} MB
                      </p>
                    </div>
                    
                    {/* Status / Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {fileWithPreview.uploading ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 text-[#1d64ff] animate-spin" />
                          <span className="text-xs text-white/60">{Math.round(fileWithPreview.progress)}%</span>
                        </div>
                      ) : fileWithPreview.uploaded ? (
                        <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Check className="w-3.5 h-3.5 text-green-400" />
                        </div>
                      ) : fileWithPreview.error ? (
                        <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center">
                          <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        </div>
                      ) : (
                        <span className="text-xs text-white/40">Bereit</span>
                      )}
                      
                      {!fileWithPreview.uploading && !fileWithPreview.uploaded && (
                        <button
                          onClick={() => handleRemoveFile(fileWithPreview.id)}
                          className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
                        >
                          <X className="w-4 h-4 text-white/60" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Error for specific files */}
            {files.some(f => f.error) && (
              <div className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                {files.filter(f => f.error).map(f => (
                  <p key={f.id} className="text-sm text-red-400">
                    {f.file.name}: {f.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Fixed Upload Button at Bottom */}
      {hasValidFiles && (
        <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#050505] via-[#050505] to-transparent">
          <button
            onClick={handleUploadAll}
            disabled={uploading || uploadableFiles.length === 0}
            className="w-full py-4 rounded-2xl bg-white text-black font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed hover:bg-white/90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
          >
            {uploading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                Wird hochgeladen...
              </span>
            ) : (
              'Hochladen'
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default EnhancedDocumentUploader;
