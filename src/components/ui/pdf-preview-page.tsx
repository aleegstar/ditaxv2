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
  hideBackButton?: boolean;
  hideHeader?: boolean;
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
  autoTriggerUpload = false,
  hideBackButton = false,
  hideHeader = false
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
      {/* Header removed - parent component handles this */}

      {/* Add More Documents Trigger - Larger when no previews */}
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
          "absolute -inset-0.5 bg-gradient-to-r from-blue-500/30 to-blue-500/0 rounded-2xl blur transition duration-500",
          isDragOver ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        )} />
        
        <div className={cn(
          "relative w-full bg-white border border-slate-200 hover:border-indigo-200 rounded-2xl transition-all duration-300 overflow-hidden shadow-sm hover:shadow-md",
          isDragOver && "border-indigo-300 shadow-md",
          // Larger padding and centered layout when no previews
          hasAnyPreview ? "p-4 flex items-center gap-4" : "p-8 md:p-12 flex flex-col items-center justify-center text-center"
        )}>
          
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
          
          {/* Icon Box - Larger when no previews */}
          <div className={cn(
            "rounded-xl bg-blue-500 flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-300",
            hasAnyPreview ? "w-12 h-12" : "w-16 h-16 md:w-20 md:h-20 mb-4"
          )}>
            <CloudUpload className={cn(
              "text-white",
              hasAnyPreview ? "w-6 h-6" : "w-8 h-8 md:w-10 md:h-10"
            )} />
          </div>
          
          {/* Text Content */}
          <div className={cn(
            "flex flex-col",
            hasAnyPreview ? "items-start text-left" : "items-center text-center"
          )}>
            <span className={cn(
              "font-semibold text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors",
              hasAnyPreview ? "text-[15px]" : "text-lg md:text-xl"
            )}>
              {!pdfLibLoaded ? 'Initialisierung...' : hasAnyPreview ? 'Weitere Dokumente hinzufügen' : 'Dokumente hochladen'}
            </span>
            <span className={cn(
              "text-slate-500 font-medium tracking-wide",
              hasAnyPreview ? "text-[11px] mt-1" : "text-sm mt-2"
            )}>
              {hasAnyPreview 
                ? 'Max. 10 MB • PDF, JPG, PNG, GIF, WebP' 
                : 'Klicken oder Dateien hierher ziehen • Max. 10 MB'
              }
            </span>
            {!hasAnyPreview && (
              <span className="text-xs text-slate-400 mt-1">
                PDF, JPG, PNG, GIF, WebP
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Processing Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex items-center justify-center rounded-2xl z-10">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-2 border-blue-500 border-t-transparent"></div>
            <p className="mt-3 text-slate-700 text-sm">
              {file?.type.startsWith('image/') ? 'Bilder werden verarbeitet...' : 'PDF wird verarbeitet...'}
            </p>
          </div>
        </div>
      )}

      {/* Preview Section */}
      {hasAnyPreview && (
        <div className="mt-6 space-y-3">
          {/* Preview Header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
              Vorschau ({totalPreviewCount} {totalPreviewCount === 1 ? 'Element' : 'Elemente'})
            </span>
            <span className="text-xs font-medium text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">
              Bearbeiten
            </span>
          </div>
          
          {/* Preview Cards */}
          <div className="space-y-3">
            {/* Image Previews */}
            {imagePreviews.map(preview => (
              <div 
                key={preview.id} 
                className="relative w-full aspect-[1.8/1] rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden group shadow-sm cursor-pointer"
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
                  <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 flex items-center gap-2 shadow-sm">
                    <Image className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[11px] font-medium text-slate-700 tracking-wide">Bild</span>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                  <button className="bg-white/90 hover:bg-white text-slate-700 rounded-full p-3 shadow-lg border border-slate-200 transition-all transform scale-90 group-hover:scale-100">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            
            {/* PDF Screenshots */}
            {screenshots.map(shot => (
              <div 
                key={shot.id} 
                className="relative w-full aspect-[1.8/1] rounded-2xl border border-slate-200 bg-slate-50 overflow-hidden group shadow-sm cursor-pointer"
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
                  <div className="px-3 py-1.5 rounded-full bg-white/90 backdrop-blur-md border border-slate-200 flex items-center gap-2 shadow-sm">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                    <span className="text-[11px] font-medium text-slate-700 tracking-wide">Seite {shot.pageNumber}</span>
                  </div>
                </div>

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-[2px]">
                  <button className="bg-white/90 hover:bg-white text-slate-700 rounded-full p-3 shadow-lg border border-slate-200 transition-all transform scale-90 group-hover:scale-100">
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
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-600 text-sm">
          {error}
        </div>
      )}
    </div>
  );
};

export type { Screenshot, ImagePreview };
