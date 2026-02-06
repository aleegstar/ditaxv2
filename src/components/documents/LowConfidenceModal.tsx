import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Upload, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ValidationResult } from '@/types/documentProfile';
import { getDocumentProfile } from '@/config/documentProfiles';

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
  
  const modalContent = (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          
          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-[9999]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-2 bg-white rounded-t-[28px]">
              <div className="w-10 h-1 bg-slate-300 rounded-full" />
            </div>
            
            {/* Content */}
            <div className="bg-white px-6 pb-8 pt-2 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)]">
              {/* Warning Icon - Soft amber gradient */}
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                </div>
              </div>
              
              {/* Title */}
              <h2 className="text-xl font-semibold text-slate-900 text-center mb-2">
                {message.title}
              </h2>
              
              {/* Description */}
              <p className="text-sm text-slate-500 text-center leading-relaxed mb-2">
                {message.description}
              </p>
              
              {/* File name */}
              <p className="text-xs text-slate-400 text-center truncate max-w-full mb-6">
                {fileName}
              </p>
              
              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                {/* Primary: Try another document - Blue gradient pill */}
                <button
                  onClick={onReupload}
                  disabled={isConfirming}
                  className="w-full h-12 rounded-full bg-gradient-to-r from-primary to-blue-500 text-white font-semibold text-sm transition-all hover:shadow-[0_8px_24px_rgba(29,100,255,0.35)] active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Anderes Dokument hochladen
                </button>
                
                {/* Secondary: Submit anyway - Outline */}
                <button
                  onClick={onConfirm}
                  disabled={isConfirming}
                  className="w-full h-12 rounded-full border border-slate-200 bg-white text-slate-600 font-medium text-sm transition-all hover:bg-slate-50 hover:border-slate-300 active:scale-[0.98] disabled:opacity-50"
                >
                  {isConfirming ? 'Wird hochgeladen...' : 'Trotzdem einreichen'}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
  
  // Use portal to render at document.body level
  return createPortal(modalContent, document.body);
};

export default LowConfidenceModal;
