import React from 'react';
import { FileText, Image, ScanLine } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadActionSheetProps {
  open: boolean;
  onClose: () => void;
  onPhoto: () => void;
  onScan: () => void;
  onFile: () => void;
}

const UploadActionSheet: React.FC<UploadActionSheetProps> = ({
  open,
  onClose,
  onPhoto,
  onScan,
  onFile,
}) => {
  const actions = [
    {
      icon: Image,
      label: 'Fotos hochladen',
      onClick: onPhoto,
    },
    {
      icon: ScanLine,
      label: 'Dokument scannen',
      onClick: onScan,
    },
    {
      icon: FileText,
      label: 'Dateien (PDF, Docs...)',
      onClick: onFile,
    },
  ];

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop - transparent, just for closing */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            onClick={onClose}
          />
          
          {/* Dropdown Menu - positioned directly above center button */}
          <div className="fixed bottom-[88px] left-0 right-0 z-[101] flex justify-center pointer-events-none">
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="pointer-events-auto"
            >
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden min-w-[220px]">
                <div className="py-2">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick();
                        onClose();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                        <action.icon className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-medium text-slate-700">{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UploadActionSheet;
