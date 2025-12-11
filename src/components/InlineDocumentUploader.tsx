import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { X, AlertCircle, CloudUpload, Image, FileText, Eye } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { ChecklistItem } from '../types';
import { v4 as uuidv4 } from 'uuid';
import EncryptedDocumentService from '@/services/EncryptedDocumentService';
import { useFormContext } from '@/contexts';

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

interface Screenshot {
  id: string;
  dataUrl: string;
  pageNumber: number;
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
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
    const viewport = page.getViewport({ scale: 1.5 });
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

        if (selectedFile.type.startsWith('image/')) {
          imageFiles.push(selectedFile);
        } else if (selectedFile.type === 'application/pdf') {
          newPdfFile = selectedFile;
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
          const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const newScreenshots: Screenshot[] = [];
          for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const screenshot = await convertPageToScreenshot(page, pageNum);
            newScreenshots.push(screenshot);
          }
          setScreenshots(prev => [...prev, ...newScreenshots]);
        } catch (err) {
          console.error('Error processing PDF:', err);
          setError('PDF konnte nicht verarbeitet werden');
        }
      }

      setFiles(prev => [...prev, ...newFiles]);
      setImagePreviews(prev => [...prev, ...newImagePreviews]);
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
      await encryptedDocService.uploadEncryptedDocument(fileWithPreview.file, checklistItem.id, userId, taxYear);
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
          onClose();
        }, 1000);
      }
    } else {
      setError('Keine Dateien konnten erfolgreich hochgeladen werden.');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const hasValidFiles = files.some(f => !f.error);
  const uploadableFiles = files.filter(f => !f.uploaded && !f.error);
  const hasAnyPreview = imagePreviews.length > 0 || screenshots.length > 0;

  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toUpperCase() || 'FILE';
  };

  return (
    <div className="w-full flex flex-col min-h-[60vh]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/jpg,image/gif,image/webp,application/pdf"
        onChange={handleFileUpload}
        className="hidden"
        multiple={MAX_FILES > 1}
      />

      {/* Upload Trigger Button */}
      <button
        onClick={handleUploadClick}
        className="w-full group relative outline-none focus:outline-none"
        disabled={isProcessing}
      >
        {/* Border Glow on Hover */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-[#1D64FF]/50 to-[#1D64FF]/0 rounded-2xl opacity-0 group-hover:opacity-100 blur transition duration-500" />
        
        <div className="relative w-full bg-[#0A0C10] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 overflow-hidden">
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent bg-[length:200%_100%] opacity-0 group-hover:opacity-100 group-hover:animate-pulse transition-opacity duration-500 pointer-events-none" />
          
          {/* Icon Box */}
          <div className="w-12 h-12 rounded-xl bg-[#1D64FF] flex items-center justify-center shadow-[0_0_15px_-3px_rgba(29,100,255,0.4)] shrink-0 group-hover:scale-105 transition-transform duration-300">
            <CloudUpload className="w-6 h-6 text-white" />
          </div>
          
          {/* Text Content */}
          <div className="flex flex-col items-start text-left">
            <span className="text-[15px] font-semibold text-white tracking-tight group-hover:text-blue-100 transition-colors">
              {!pdfLibLoaded ? 'Initialisierung...' : 'Weitere Dokumente hinzufügen'}
            </span>
            <span className="text-[11px] text-zinc-500 mt-1 font-medium tracking-wide">
              Max. 10 MB • PDF, JPG, PNG, GIF, WebP
            </span>
          </div>
        </div>
      </button>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="mt-4 p-4 bg-[#0A0C10] border border-white/[0.08] rounded-2xl flex items-center justify-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-[#1D64FF] border-t-transparent" />
          <span className="text-white/70 text-sm">Wird verarbeitet...</span>
        </div>
      )}

      {/* Preview Section */}
      {hasAnyPreview && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Vorschau ({imagePreviews.length + screenshots.length} {imagePreviews.length + screenshots.length === 1 ? 'Element' : 'Elemente'})
            </span>
          </div>

          {/* Image Previews */}
          {imagePreviews.map(preview => (
            <div
              key={preview.id}
              className="relative w-full aspect-[1.8/1] rounded-2xl border border-white/[0.08] bg-[#050608] overflow-hidden group shadow-2xl"
            >
              <img
                src={preview.dataUrl}
                alt={`Vorschau: ${preview.fileName}`}
                className="w-full h-full object-contain"
              />

              {/* Type Badge */}
              <div className="absolute top-4 left-4 z-20">
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-lg">
                  <Image className="w-3.5 h-3.5 text-[#1D64FF]" />
                  <span className="text-[11px] font-medium text-white/90 tracking-wide">Bild</span>
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <button
                  onClick={() => {
                    const newWindow = window.open();
                    newWindow?.document.write(`<img src="${preview.dataUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" />`);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-full p-3 backdrop-blur-md border border-white/20 transition-all transform scale-90 group-hover:scale-100"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}

          {/* PDF Screenshots */}
          {screenshots.map(shot => (
            <div
              key={shot.id}
              className="relative w-full aspect-[1.8/1] rounded-2xl border border-white/[0.08] bg-[#050608] overflow-hidden group shadow-2xl"
            >
              <img
                src={shot.dataUrl}
                alt={`Seite ${shot.pageNumber}`}
                className="w-full h-full object-contain"
              />

              {/* Type Badge */}
              <div className="absolute top-4 left-4 z-20">
                <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-lg">
                  <FileText className="w-3.5 h-3.5 text-[#1D64FF]" />
                  <span className="text-[11px] font-medium text-white/90 tracking-wide">Seite {shot.pageNumber}</span>
                </div>
              </div>

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                <button
                  onClick={() => {
                    const newWindow = window.open();
                    newWindow?.document.write(`<img src="${shot.dataUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" />`);
                  }}
                  className="bg-white/10 hover:bg-white/20 text-white rounded-full p-3 backdrop-blur-md border border-white/20 transition-all transform scale-90 group-hover:scale-100"
                >
                  <Eye className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Ausgewählte Dateien
            </span>
          </div>

          {files.map(fileWithPreview => (
            <div
              key={fileWithPreview.id}
              className="group relative flex items-center gap-3.5 p-3 pr-4 rounded-xl bg-[#0A0C10] border border-white/[0.08] hover:border-white/[0.15] hover:bg-[#0F1218] transition-all duration-300 shadow-sm"
            >
              {/* Thumbnail/Icon */}
              <div className="w-10 h-10 rounded-lg bg-[#16191F] border border-white/5 flex items-center justify-center shrink-0 group-hover:border-[#1D64FF]/30 transition-colors">
                <span className="text-[10px] font-bold text-zinc-400 group-hover:text-[#1D64FF] transition-colors">
                  {getFileExtension(fileWithPreview.file.name)}
                </span>
              </div>
              
              {/* File Info */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <p className="text-sm font-medium text-zinc-200 truncate group-hover:text-white transition-colors">
                  {fileWithPreview.file.name}
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-zinc-500 font-medium">
                    {(fileWithPreview.file.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  {fileWithPreview.uploaded && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
                        ✓ Hochgeladen
                      </span>
                    </>
                  )}
                  {fileWithPreview.uploading && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span className="text-[11px] text-[#1D64FF] font-medium">
                        {Math.round(fileWithPreview.progress)}%
                      </span>
                    </>
                  )}
                  {!fileWithPreview.uploaded && !fileWithPreview.uploading && !fileWithPreview.error && (
                    <>
                      <div className="w-1 h-1 rounded-full bg-zinc-700" />
                      <span className="text-[11px] text-emerald-500 font-medium">
                        Ready
                      </span>
                    </>
                  )}
                </div>

                {/* Progress bar when uploading */}
                {fileWithPreview.uploading && (
                  <Progress value={fileWithPreview.progress} className="h-1 mt-1" />
                )}

                {/* Error message */}
                {fileWithPreview.error && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertCircle className="h-3 w-3 text-red-400" />
                    <span className="text-[11px] text-red-400">{fileWithPreview.error}</span>
                  </div>
                )}
              </div>

              {/* Delete Action */}
              <button
                onClick={() => handleRemoveFile(fileWithPreview.id)}
                disabled={fileWithPreview.uploading}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all duration-200 opacity-70 group-hover:opacity-100 disabled:opacity-30"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Spacer to push button to bottom */}
      <div className="flex-1 min-h-8" />

      {/* Bottom Action Area */}
      {hasValidFiles && (
        <div className="mt-6 pt-4 bg-gradient-to-t from-background via-background to-transparent">
          <button
            onClick={handleUploadAll}
            disabled={uploading || uploadableFiles.length === 0}
            className="w-full relative group disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Glow Effect */}
            <div className="absolute -inset-1 bg-white/20 rounded-full blur-xl opacity-0 group-hover:opacity-40 transition-opacity duration-500" />
            
            {/* Button */}
            <div className="relative w-full h-12 bg-white hover:bg-zinc-100 text-[#020408] rounded-full flex items-center justify-center gap-2.5 font-semibold text-[15px] shadow-[0_0_25px_-5px_rgba(255,255,255,0.2)] hover:shadow-[0_0_35px_-5px_rgba(255,255,255,0.4)] hover:scale-[1.01] active:scale-[0.98] transition-all duration-300">
              {uploading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#020408] border-t-transparent" />
                  <span>Upload läuft...</span>
                </div>
              ) : (
                <span>Hochladen</span>
              )}
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default InlineDocumentUploader;
