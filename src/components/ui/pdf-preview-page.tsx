import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { ArrowLeft, Eye } from 'lucide-react';

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
  onBack?: () => void;
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
  onBack,
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
    if (fileInputRef.current) {
      fileInputRef.current.click();
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
      const syntheticEvent = {
        target: {
          files: e.dataTransfer.files
        }
      } as React.ChangeEvent<HTMLInputElement>;
      
      onFileUpload(syntheticEvent);
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const hasScreenshots = screenshots.length > 0;
  const hasImagePreviews = imagePreviews.length > 0;
  const hasAnyPreview = hasScreenshots || hasImagePreviews;
  const totalPreviewCount = screenshots.length + imagePreviews.length;
  
  const openFullPreview = (dataUrl: string) => {
    const newWindow = window.open();
    newWindow?.document.write(`<img src="${dataUrl}" style="max-width:100%; max-height:100vh; object-fit:contain;" />`);
  };

  return (
    <div className="relative">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button 
            onClick={onBack}
            className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
        )}
        <h1 className="text-xl font-semibold text-white">Upload</h1>
      </div>

      {/* Upload Box */}
      <div 
        className={cn(
          "relative cursor-pointer group/upload transition-all duration-300 rounded-2xl border border-white/10 bg-[#0d0d0d] p-5",
          isDragOver && "border-[#1d64ff] bg-[#1d64ff]/10"
        )}
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Shimmer effect */}
        <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover/upload:translate-x-full transition-transform duration-1000" />
        </div>

        <input 
          ref={fileInputRef} 
          type="file" 
          accept={accept} 
          onChange={(e) => {
            onFileUpload(e);
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
          }} 
          className="hidden" 
          multiple={maxFiles > 1} 
        />
        
        <div className="flex items-center gap-4">
          {/* Blue Icon Box */}
          <div className="w-14 h-14 rounded-xl bg-[#1d64ff] flex items-center justify-center flex-shrink-0 group-hover/upload:scale-105 transition-transform">
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 44 40" 
              fill="none" 
              xmlns="http://www.w3.org/2000/svg" 
              className="text-white"
            >
              <path d="M32.9551 14.1608C32.9701 14.1607 32.985 14.1607 33 14.1607C37.9706 14.1607 42 18.1975 42 23.1772C42 27.8182 38.5 31.6403 34 32.1387M32.9551 14.1608C32.9848 13.8308 33 13.4966 33 13.1588C33 7.07257 28.0751 2.13867 22 2.13867C16.2465 2.13867 11.5247 6.56401 11.0408 12.2025M32.9551 14.1608C32.7507 16.4338 31.8572 18.5079 30.4857 20.1717M11.0408 12.2025C5.96796 12.6861 2 16.9665 2 22.1754C2 27.0221 5.43552 31.0651 10 31.9933M11.0408 12.2025C11.3565 12.1724 11.6765 12.157 12 12.157C14.2516 12.157 16.3295 12.9026 18.001 14.1607" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M22 22.1387L22 38.1387M22 22.1387C20.5995 22.1387 17.9831 26.1273 17 27.1387M22 22.1387C23.4005 22.1387 26.0169 26.1273 27 27.1387" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          
          {/* Text */}
          <div className="flex-1">
            <h3 className="text-base font-semibold text-white">
              {!pdfLibLoaded ? 'Initialisierung...' : 'Weitere Dokumente hinzufügen'}
            </h3>
            <p className="text-sm text-white/50 mt-0.5">
              Max. 10 MB • PDF, JPG, PNG, GIF, WebP
            </p>
          </div>
        </div>
      </div>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-3 border-[#1d64ff] border-t-transparent"></div>
            <p className="mt-3 text-white text-sm">
              {file?.type.startsWith('image/') ? 'Bilder werden verarbeitet...' : 'PDF wird verarbeitet...'}
            </p>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {hasAnyPreview && (
        <div className="mt-6">
          {/* Preview Header */}
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-xs font-semibold text-white/60 tracking-wider uppercase">
              Vorschau ({totalPreviewCount} {totalPreviewCount === 1 ? 'Element' : 'Elemente'})
            </h4>
            <button className="text-xs text-[#1d64ff] hover:text-[#1d64ff]/80 transition-colors">
              Bearbeiten
            </button>
          </div>
          
          {/* Preview Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Image Previews */}
            {imagePreviews.map(preview => (
              <div 
                key={preview.id} 
                className="relative rounded-xl overflow-hidden bg-[#0d0d0d] border border-white/10 aspect-square group cursor-pointer"
                onClick={() => openFullPreview(preview.dataUrl)}
              >
                {/* Bild Badge */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                  <svg className="w-3 h-3 text-[#1d64ff]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                  </svg>
                  <span className="text-xs text-white font-medium">Bild</span>
                </div>
                
                {/* Eye Icon on Hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                
                <img 
                  src={preview.dataUrl} 
                  alt={preview.fileName} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
            
            {/* PDF Screenshots */}
            {screenshots.map(shot => (
              <div 
                key={shot.id} 
                className="relative rounded-xl overflow-hidden bg-[#0d0d0d] border border-white/10 aspect-square group cursor-pointer"
                onClick={() => openFullPreview(shot.dataUrl)}
              >
                {/* Page Badge */}
                <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/60 backdrop-blur-sm">
                  <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  <span className="text-xs text-white font-medium">Seite {shot.pageNumber}</span>
                </div>
                
                {/* Eye Icon on Hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-10">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                
                <img 
                  src={shot.dataUrl} 
                  alt={`Seite ${shot.pageNumber}`} 
                  className="w-full h-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Error Message */}
      {error && (
        <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export type { Screenshot, ImagePreview };
