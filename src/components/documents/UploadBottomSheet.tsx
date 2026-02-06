import React, { useRef, useEffect, useState } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { ChecklistItem } from '@/types';
import { CloudUpload, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import EnhancedDocumentUploader from '@/components/EnhancedDocumentUploader';

interface UploadBottomSheetProps {
  open: boolean;
  onClose: () => void;
  checklistItem: ChecklistItem | null;
  onSuccess: () => void;
  autoTriggerUpload?: boolean;
}

const UploadBottomSheet: React.FC<UploadBottomSheetProps> = ({
  open,
  onClose,
  checklistItem,
  onSuccess,
  autoTriggerUpload = true
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const hasTriggeredRef = useRef(false);

  // Auto-trigger file selection when sheet opens
  useEffect(() => {
    if (open && autoTriggerUpload && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      // Small delay to let the drawer animation start
      const timer = setTimeout(() => {
        fileInputRef.current?.click();
      }, 300);
      return () => clearTimeout(timer);
    }
    
    if (!open) {
      hasTriggeredRef.current = false;
      setSelectedFiles([]);
    }
  }, [open, autoTriggerUpload]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setSelectedFiles(files);
    }
    // Reset input
    if (e.target) e.target.value = '';
  };

  const handleClose = () => {
    setSelectedFiles([]);
    onClose();
  };

  const handleSuccess = () => {
    setSelectedFiles([]);
    onSuccess();
    onClose();
  };

  if (!checklistItem) return null;

  return (
    <>
      {/* Hidden file input for auto-trigger */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,image/jpeg,image/png,image/gif,image/webp"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />

      <Drawer open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
        <DrawerContent className="h-[90vh] max-h-[90vh] rounded-t-3xl">
          {/* Custom Header with close button */}
          <div className="relative px-4 pt-4 pb-2">
            {/* Drag handle */}
            <div className="mx-auto w-12 h-1.5 flex-shrink-0 rounded-full bg-slate-200 mb-4" />
            
            {/* Close button */}
            <button
              onClick={handleClose}
              className="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-colors"
            >
              <X className="h-4 w-4 text-slate-500" />
            </button>

            {/* Title */}
            <DrawerHeader className="p-0">
              <DrawerTitle className="text-xl font-semibold text-slate-900">
                {checklistItem.title}
              </DrawerTitle>
            </DrawerHeader>

            {/* Description */}
            <div className="mt-2 mb-4">
              <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5 text-center">
                <p className="text-sm text-slate-600">
                  {checklistItem.description}
                </p>
              </div>
            </div>
          </div>

          {/* Content - Full uploader */}
          <div className="flex-1 overflow-auto px-4 pb-safe">
            <EnhancedDocumentUploader
              checklistItem={checklistItem}
              onBack={handleClose}
              onDocumentSubmitted={handleSuccess}
              hideBackButton={true}
              hideHeader={true}
              initialFiles={selectedFiles}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default UploadBottomSheet;
