import React from 'react';
import { AlertTriangle, Upload, X } from 'lucide-react';
import { ValidationResult } from '@/types/documentProfile';
import { getDocumentProfile } from '@/config/documentProfiles';
import {
  ModernUploadDialog,
  ModernUploadDialogContent,
  ModernUploadDialogHeader,
  ModernUploadDialogTitle,
  ModernUploadDialogDescription,
  ModernUploadDialogFooter,
} from '@/components/ui/modern-upload-dialog';

interface LowConfidenceModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onReupload: () => void;
  validationResult: ValidationResult | null;
  fileName: string;
  expectedDocType?: string;
  isConfirming?: boolean;
}

const LowConfidenceModal: React.FC<LowConfidenceModalProps> = ({
  open,
  onClose,
  onConfirm,
  onReupload,
  validationResult,
  fileName,
  expectedDocType,
  isConfirming = false
}) => {
  if (!validationResult) return null;
  
  const expectedProfile = expectedDocType ? getDocumentProfile(expectedDocType) : null;
  const detectedProfile = getDocumentProfile(validationResult.best.docTypeId);
  
  const confidence = validationResult.best.confidence;
  const isWrongType = expectedProfile && detectedProfile && 
    validationResult.best.docTypeId !== expectedDocType;
  
  // Determine message based on scenario
  const getMessage = () => {
    if (isWrongType) {
      return {
        title: 'Anderer Dokumenttyp erkannt',
        description: `Erwartet: "${expectedProfile?.label}". Erkannt: "${detectedProfile?.label}" (${confidence}%).`
      };
    }
    
    if (confidence < 40) {
      return {
        title: 'Dokument konnte nicht erkannt werden',
        description: 'Bitte prüfe, ob die Qualität ausreichend ist und das richtige Dokument ausgewählt wurde.'
      };
    }
    
    return {
      title: 'Dokument nicht eindeutig erkannt',
      description: `Das Dokument wurde als "${detectedProfile?.label || 'Unbekannt'}" erkannt, aber mit niedriger Sicherheit (${confidence}%).`
    };
  };
  
  const message = getMessage();
  
  return (
    <ModernUploadDialog open={open} onOpenChange={(open) => !open && onClose()}>
      <ModernUploadDialogContent className="sm:max-w-md">
        <ModernUploadDialogHeader>
          {/* Warning indicator */}
          <div className="flex items-center justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-amber-500" />
            </div>
          </div>
          
          <ModernUploadDialogTitle className="text-center">
            {message.title}
          </ModernUploadDialogTitle>
          
          <ModernUploadDialogDescription className="text-center">
            {message.description}
          </ModernUploadDialogDescription>
        </ModernUploadDialogHeader>
        
        {/* File info */}
        <div className="mt-2 text-center">
          <span className="text-xs text-slate-400 truncate block max-w-full">
            {fileName}
          </span>
        </div>
        
        <ModernUploadDialogFooter className="flex flex-col sm:flex-row gap-3 mt-6">
          {/* Primary: Try another document */}
          <button
            onClick={onReupload}
            disabled={isConfirming}
            className="flex-1 h-11 px-4 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 text-white font-medium text-sm transition-all hover:from-blue-600 hover:to-blue-700 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Anderes Dokument hochladen
          </button>
          
          {/* Secondary: Submit anyway */}
          <button
            onClick={onConfirm}
            disabled={isConfirming}
            className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-slate-600 font-medium text-sm transition-all hover:bg-slate-50 active:scale-[0.98] disabled:opacity-50"
          >
            {isConfirming ? 'Wird hochgeladen...' : 'Trotzdem einreichen'}
          </button>
        </ModernUploadDialogFooter>
      </ModernUploadDialogContent>
    </ModernUploadDialog>
  );
};

export default LowConfidenceModal;
