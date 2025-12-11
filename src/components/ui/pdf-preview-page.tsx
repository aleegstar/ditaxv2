import { cn } from "@/lib/utils";
import { useState, useRef, useEffect } from "react";
import { ArrowLeft, Eye, Image, CloudUpload } from 'lucide-react';

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
  autoTriggerUpload?: boolean;
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
  hasUploadedFiles = false,
  autoTriggerUpload = false
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const hasTriggered = useRef(false);
  
  // Auto trigger file dialog on mount
  useEffect(() => {
    if (autoTriggerUpload && pdfLibLoaded && !hasTriggered.current) {
      hasTriggered.current = true;
      setTimeout(() => {
        fileInputRef.current?.click();
      }, 100);
    }
  }, [autoTriggerUpload, pdfLibLoaded]);
  
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
      {/* Header - Only show when there are previews */}
      {hasAnyPreview && (
        <div className="w-full px-0 pt-2 pb-4 flex items-center justify-center relative">
          {/* Back Button */}
          {onBack && (
            <button 
              onClick={onBack}
              className="absolute left-0 w-10 h-10 rounded-full border border-white/[0.08] bg-white/[0.02] flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 hover:bg-white/[0.06] transition-all duration-300 group shadow-lg"
            >
              <ArrowLeft className="w-5 h-5 opacity-70 group-hover:opacity-100 transition-opacity" />
            </button>
          )}
          
          {/* Title */}
          <h1 className="font-medium text-lg tracking-tight text-white/90 leading-tight">
            Upload
          </h1>
        </div>
      )}

      {/* Add More Documents Trigger */}
      <button 
        className="w-full group relative outline-none focus:outline-none mt-2"
        onClick={handleUploadClick}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Border Glow on Hover */}
        <div className={cn(
          "absolute -inset-0.5 bg-gradient-to-r from-[#1D64FF]/50 to-[#1D64FF]/0 rounded-2xl blur transition duration-500",
          isDragOver ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )} />
        
        <div className={cn(
          "relative w-full bg-[#0A0C10] border border-white/[0.08] hover:border-white/[0.15] rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 overflow-hidden",
          isDragOver && "border-white/[0.15]"
        )}>
          {/* Shimmer Animation */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-r from-transparent via-white/[0.03] to-transparent animate-[shimmer_3s_infinite_linear] bg-[length:200%_100%]" />
          
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
        <div className="absolute inset-0 bg-[#020408]/90 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-[#1D64FF] border-t-transparent"></div>
            <p className="mt-3 text-zinc-200 text-sm">
              {file?.type.startsWith('image/') ? 'Bilder werden verarbeitet...' : 'PDF wird verarbeitet...'}
            </p>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {hasAnyPreview && (
        <div className="mt-8 space-y-3">
          {/* Preview Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-widest">
              Vorschau ({totalPreviewCount} {totalPreviewCount === 1 ? 'Element' : 'Elemente'})
            </span>
            <span className="text-[11px] font-medium text-[#1D64FF] hover:text-[#1D64FF]/80 cursor-pointer transition-colors">
              Bearbeiten
            </span>
          </div>
          
          {/* Preview Cards */}
          <div className="space-y-3">
            {/* Image Previews */}
            {imagePreviews.map(preview => (
              <div 
                key={preview.id} 
                className="relative w-full aspect-[1.8/1] rounded-2xl border border-white/[0.08] bg-[#050608] overflow-hidden group shadow-2xl cursor-pointer"
                onClick={() => openFullPreview(preview.dataUrl)}
              >
                {/* Image */}
                <img 
                  src={preview.dataUrl} 
                  alt={preview.fileName} 
                  className="w-full h-full object-cover"
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
                  <button className="bg-white/10 hover:bg-white/20 text-white rounded-full p-3 backdrop-blur-md border border-white/20 transition-all transform scale-90 group-hover:scale-100">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* PDF Screenshots */}
            {screenshots.map(shot => (
              <div 
                key={shot.id} 
                className="relative w-full aspect-[1.8/1] rounded-2xl border border-white/[0.08] bg-[#050608] overflow-hidden group shadow-2xl cursor-pointer"
                onClick={() => openFullPreview(shot.dataUrl)}
              >
                {/* Image */}
                <img 
                  src={shot.dataUrl} 
                  alt={`Seite ${shot.pageNumber}`} 
                  className="w-full h-full object-cover"
                />

                {/* Type Badge */}
                <div className="absolute top-4 left-4 z-20">
                  <div className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 flex items-center gap-2 shadow-lg">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <span className="text-[11px] font-medium text-white/90 tracking-wide">Seite {shot.pageNumber}</span>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                  <button className="bg-white/10 hover:bg-white/20 text-white rounded-full p-3 backdrop-blur-md border border-white/20 transition-all transform scale-90 group-hover:scale-100">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
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
