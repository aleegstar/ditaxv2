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
              <div className="bg-card rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12),0_2px_8px_rgba(0,0,0,0.08)] border border-border/40 overflow-hidden min-w-[240px] backdrop-blur-sm">
                <div className="py-2 px-1.5 space-y-1">
                  {actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        action.onClick();
                        onClose();
                      }}
                      className="group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl hover:bg-primary/[0.06] transition-all duration-200 text-left active:scale-[0.97]"
                    >
                      <div className="w-9 h-9 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] flex items-center justify-center shadow-[0_2px_6px_hsl(222,100%,56%,0.3)]">
                        <action.icon className="w-4 h-4 text-white" strokeWidth={1.5} />
                      </div>
                      <span className="text-sm font-semibold text-foreground">{action.label}</span>
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
