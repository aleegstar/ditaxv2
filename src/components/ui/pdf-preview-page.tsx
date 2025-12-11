import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert } from '@/components/ui/alert';
import { Plus } from 'lucide-react';
interface Screenshot {
  id: string;
  dataUrl: string;
  pageNumber: number;
}
interface ImagePreview {
  id: string;
  dataUrl: string;
  fileName: string;
  fileSize: number;
}
interface FileUploadProps {
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onClear: () => void;
  isProcessing: boolean;
  pdfLibLoaded: boolean;
  error: string | null;
  file: File | null;
  screenshots: Screenshot[];
  imagePreviews?: ImagePreview[];
  accept?: string;
  maxFiles?: number;
  hasUploadedFiles?: boolean;
}
export const FileUpload = ({
  onFileUpload,
  onClear,
  isProcessing,
  pdfLibLoaded,
  error,
  file,
  screenshots,
  imagePreviews = [],
  accept = ".pdf,image/*",
  maxFiles = 10,
  hasUploadedFiles = false
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  const handleUploadClick = () => {
    console.log('🎯 Upload button clicked!');
    console.log('📎 fileInputRef.current exists:', !!fileInputRef.current);
    if (fileInputRef.current) {
      console.log('✅ Triggering file input click');
      fileInputRef.current.click();
    } else {
      console.error('❌ fileInputRef.current is null!');
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      // Create a synthetic event to match the onChange handler
      const syntheticEvent = {
        target: {
          files: e.dataTransfer.files
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      onFileUpload(syntheticEvent);
      
      // Reset file input after upload
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  const hasScreenshots = screenshots.length > 0;
  const hasImagePreviews = imagePreviews.length > 0;
  const hasAnyPreview = hasScreenshots || hasImagePreviews;
  const totalPreviewCount = screenshots.length + imagePreviews.length;
  
  // Only show compact/white style when a preview is actually being displayed
  const shouldUseCompactStyle = hasAnyPreview;
  
  return <div className="relative pb-0 pt-0">
      
      <div className={`relative flex flex-col ${hasAnyPreview ? 'md:flex-row gap-8 items-start' : 'items-center'}`}>
        <div className={`flex flex-col items-center w-full`}>
          
          {/* Upload area with dark theme styling */}
          <div 
            className={cn(
              "w-full cursor-pointer group/upload relative transition-all duration-300",
              isDragOver ? "scale-[1.02]" : "",
              shouldUseCompactStyle 
                ? "p-4 md:p-8 rounded-2xl bg-[#0a0a0a] border border-white/10" 
                : "px-8 pt-6 pb-16 rounded-[2.5rem] bg-[#0a0a0a] border border-white/10"
            )}
            onClick={handleUploadClick}
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input 
              ref={fileInputRef} 
              type="file" 
              accept={accept} 
              onChange={(e) => {
                console.log('📥 File input onChange triggered!', e.target.files);
                onFileUpload(e);
                // Reset file input to allow selecting the same file again
                if (fileInputRef.current) {
                  console.log('🔄 Resetting file input value');
                  fileInputRef.current.value = '';
                }
              }} 
              className="hidden" 
              multiple={maxFiles > 1} 
            />
            
            <div className={cn(
              "relative flex items-center gap-4",
              shouldUseCompactStyle ? "flex-row" : "flex-col"
            )}>
              <div className="relative flex-shrink-0">
                <div className={cn(
                  "rounded-2xl flex items-center justify-center transform group-hover/upload:scale-110 transition-all duration-300",
                  shouldUseCompactStyle 
                    ? "w-12 h-12 md:w-20 md:h-20 bg-[#1d64ff]" 
                    : "w-16 h-16 bg-[#1d64ff]"
                )}>
                  <svg 
                    width={shouldUseCompactStyle ? "24" : "32"} 
                    height={shouldUseCompactStyle ? "24" : "32"} 
                    viewBox="0 0 44 40" 
                    fill="none" 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="text-white"
                  >
                    <path d="M32.9551 14.1608C32.9701 14.1607 32.985 14.1607 33 14.1607C37.9706 14.1607 42 18.1975 42 23.1772C42 27.8182 38.5 31.6403 34 32.1387M32.9551 14.1608C32.9848 13.8308 33 13.4966 33 13.1588C33 7.07257 28.0751 2.13867 22 2.13867C16.2465 2.13867 11.5247 6.56401 11.0408 12.2025M32.9551 14.1608C32.7507 16.4338 31.8572 18.5079 30.4857 20.1717M11.0408 12.2025C5.96796 12.6861 2 16.9665 2 22.1754C2 27.0221 5.43552 31.0651 10 31.9933M11.0408 12.2025C11.3565 12.1724 11.6765 12.157 12 12.157C14.2516 12.157 16.3295 12.9026 18.001 14.1607" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M22 22.1387L22 38.1387M22 22.1387C20.5995 22.1387 17.9831 26.1273 17 27.1387M22 22.1387C23.4005 22.1387 26.0169 26.1273 27 27.1387" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                {!shouldUseCompactStyle && (
                  <div className="absolute -right-2 -bottom-2 w-7 h-7 rounded-full flex items-center justify-center group-hover/upload:scale-110 transition-transform bg-[#1d64ff]">
                    <Plus className="w-3.5 h-3.5 text-white" />
                  </div>
                )}
              </div>
              
              <div className={shouldUseCompactStyle ? "text-left" : "text-center"}>
                {shouldUseCompactStyle ? (
                  <>
                    <h3 className="text-base md:text-lg font-semibold text-white">
                      {!pdfLibLoaded ? 'Initialisierung...' : 'Weitere Dokumente hinzufügen'}
                    </h3>
                    <p className="text-xs md:text-sm text-white/50">
                      Max. 10 MB • PDF, JPG, PNG, GIF, WebP
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold text-white mb-1">
                      {!pdfLibLoaded ? 'Initialisierung...' : 'Dokumente hier ablegen'}
                    </h3>
                    <p className="text-sm text-white/50">
                      Max. 10 MB • PDF, JPG, PNG
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>


        </div>
        
        {isProcessing && <div className="absolute inset-0 bg-gray-900/80 backdrop-blur-sm flex items-center justify-center rounded-3xl z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-400 border-t-transparent"></div>
              <p className="mt-4 text-white font-medium">
                {file?.type.startsWith('image/') ? 'Bilder werden verarbeitet...' : 'PDF wird verarbeitet...'}
              </p>
            </div>
          </div>}

        {/* Enhanced Preview section */}
        {hasAnyPreview && <div className="w-full md:w-1/2 max-h-[500px] overflow-auto pr-1">
            <div className="space-y-4">
              {/* Header for preview section */}
              {totalPreviewCount > 0 && <div className="flex items-center justify-between mb-4">
                  <h4 className="text-foreground font-medium">
                    Vorschau ({totalPreviewCount} {totalPreviewCount === 1 ? 'Element' : 'Elemente'})
                  </h4>
                  {hasScreenshots && hasImagePreviews && <div className="flex items-center gap-2 text-xs text-white/60">
                      <span>{screenshots.length} PDF-Seiten</span>
                      <span className="inline-block w-1 h-1 rounded-full bg-white/40"></span>
                      <span>{imagePreviews.length} Bilder</span>
                    </div>}
                </div>}
              
              <div className="grid grid-cols-1 gap-4">
                {/* Image Previews */}
                {imagePreviews.map(preview => <div key={preview.id} className="relative border border-white/20 rounded-lg overflow-hidden bg-white/5 backdrop-blur-md group">
                    <span className="absolute top-2 left-2 z-10 text-xs font-medium px-2 py-0.5 rounded-full bg-white/20 border border-white/20 backdrop-blur-sm text-white flex items-center gap-1">
                      <svg className="w-3 h-3 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                      </svg>
                      Bild
                    </span>
                    
                    {/* File info overlay */}
                    <div className="absolute bottom-2 left-2 right-2 z-10 text-xs text-white bg-black/50 rounded px-2 py-1 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="truncate font-medium">{preview.fileName}</div>
                      <div className="text-white/70">{(preview.fileSize / 1024 / 1024).toFixed(2)} MB</div>
                    </div>
                    
                    <img src={preview.dataUrl} alt={`Vorschau: ${preview.fileName}`} className="w-full h-auto max-h-64 object-contain cursor-pointer" onClick={() => {
                // Optional: Open full-size preview in modal
                const img = new Image();
                img.src = preview.dataUrl;
                const newWindow = window.open();
                newWindow?.document.write(`<img src="${preview.dataUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" />`);
              }} />
                  </div>)}
                
                {/* PDF Screenshots */}
                {screenshots.map(shot => <div key={shot.id} className="relative border border-border rounded-lg overflow-hidden bg-muted/50 backdrop-blur-md">
                    <span className="absolute top-2 left-2 z-10 text-xs font-medium px-2 py-0.5 rounded-full bg-muted/80 border border-border backdrop-blur-sm flex items-center gap-1 text-muted-foreground">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                      Seite {shot.pageNumber}
                    </span>
                    <img src={shot.dataUrl} alt={`Seite ${shot.pageNumber}`} className="w-full h-auto cursor-pointer" onClick={() => {
                // Optional: Open full-size preview in modal
                const img = new Image();
                img.src = shot.dataUrl;
                const newWindow = window.open();
                newWindow?.document.write(`<img src="${shot.dataUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" />`);
              }} />
                  </div>)}
              </div>
            </div>
          </div>}
      </div>
      
      {error && <Alert variant="destructive" className="mt-6 border-2 border-red-500/30 bg-red-500/10 backdrop-blur-sm">
          <span className="text-red-300">{error}</span>
        </Alert>}
    </div>;
};
export type { Screenshot, ImagePreview };