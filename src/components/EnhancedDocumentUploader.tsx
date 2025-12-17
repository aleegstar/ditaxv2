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
  autoTriggerUpload?: boolean;
  hideBackButton?: boolean;
  hideHeader?: boolean;
  initialFiles?: File[];
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
  onPreviewChange,
  autoTriggerUpload = false,
  hideBackButton = false,
  hideHeader = false,
  initialFiles
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

  // Extracted file processing logic to be reusable
  const processFiles = async (selectedFiles: File[]) => {
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
      console.error('Error in processFiles:', error);
      setError('Fehler beim Hochladen der Datei(en)');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    await processFiles(selectedFiles);
    if (event.target) event.target.value = '';
  };

  // Process initial files when provided
  const initialFilesProcessedRef = useRef(false);
  useEffect(() => {
    if (initialFiles && initialFiles.length > 0 && !initialFilesProcessedRef.current) {
      initialFilesProcessedRef.current = true;
      processFiles(initialFiles);
    }
  }, [initialFiles]);

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
    <div className="min-h-full text-slate-800 antialiased selection:bg-indigo-100">
      <div className="relative flex-1 flex flex-col pb-32 overflow-y-auto">
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
          autoTriggerUpload={autoTriggerUpload}
          hideBackButton={hideBackButton}
          hideHeader={hideHeader}
        />

        {/* File List Section */}
        {files.length > 0 && (
          <div className="mt-6 space-y-3">
            {/* Section Header */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                Ausgewählte Dateien
              </span>
            </div>
            
            {/* File Items */}
            {files.map(fileWithPreview => {
              const ext = fileWithPreview.file.name.split('.').pop()?.toUpperCase() || 'FILE';
              const fileSizeMB = (fileWithPreview.file.size / (1024 * 1024)).toFixed(2);
              
              return (
                <div 
                  key={fileWithPreview.id} 
                  className="group relative flex items-center gap-3.5 p-3 pr-4 rounded-2xl bg-white border border-slate-200 hover:border-indigo-200 hover:shadow-md transition-all duration-300"
                >
                  {/* Thumbnail/Icon */}
                  <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:border-indigo-200 transition-colors">
                    <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
                      {ext}
                    </span>
                  </div>
                  
                  {/* File Info */}
                  <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                    <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900 transition-colors">
                      {fileWithPreview.file.name}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {fileSizeMB} MB
                      </span>
                      <div className="w-1 h-1 rounded-full bg-slate-300" />
                      {fileWithPreview.uploading ? (
                        <span className="text-[11px] text-blue-500 font-medium flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          {Math.round(fileWithPreview.progress)}%
                        </span>
                      ) : fileWithPreview.uploaded ? (
                        <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                          <Check className="w-3 h-3" />
                          Hochgeladen
                        </span>
                      ) : fileWithPreview.error ? (
                        <span className="text-[11px] text-red-500 font-medium flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Fehler
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 font-medium">
                          Ready
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Delete Action */}
                  {!fileWithPreview.uploading && !fileWithPreview.uploaded && (
                    <button 
                      onClick={() => handleRemoveFile(fileWithPreview.id)}
                      className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
            
            {/* Error for specific files */}
            {files.some(f => f.error) && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                {files.filter(f => f.error).map(f => (
                  <p key={f.id} className="text-sm text-red-600">
                    {f.file.name}: {f.error}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Area */}
      {hasValidFiles && (
        <div className="fixed bottom-0 left-0 w-full p-6 pt-4 bg-gradient-to-t from-white via-white to-transparent z-30">
          <div className="max-w-2xl mx-auto">
            <button 
              onClick={handleUploadAll}
              disabled={uploading || uploadableFiles.length === 0}
              className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {/* Button */}
              <div className="relative w-full h-14 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center gap-2.5 font-semibold text-[15px] shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all duration-300">
                {uploading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Wird hochgeladen...
                  </span>
                ) : (
                  <span>Hochladen</span>
                )}
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedDocumentUploader;
