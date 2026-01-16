import React from 'react';
import { X, ScanLine, Camera, FolderOpen, Image, FileText, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface UploadActionSheetProps {
  open: boolean;
  onClose: () => void;
  onScan: () => void;
  onPhoto: () => void;
  onFile: () => void;
}

const UploadActionSheet: React.FC<UploadActionSheetProps> = ({
  open,
  onClose,
  onScan,
  onPhoto,
  onFile,
}) => {
  if (!open) return null;

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
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100]"
            onClick={onClose}
          />
          
          {/* Desktop: Dropdown Menu above button */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="hidden md:block fixed bottom-20 left-1/2 -translate-x-1/2 z-[101]"
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
              
              {/* Separator and Inspiration-like option */}
              <div className="border-t border-slate-100">
                <button
                  onClick={onClose}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                    <Plus className="w-4 h-4 text-slate-600" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Abbrechen</span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* Mobile: Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="md:hidden fixed bottom-0 left-0 right-0 z-[101] px-4 pb-8"
          >
            <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg mx-auto overflow-hidden">
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-slate-200 rounded-full" />
              </div>
              
              {/* Header */}
              <div className="px-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                    <ScanLine className="w-6 h-6 text-white" strokeWidth={1.5} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900">Dokument hinzufügen</h3>
                    <p className="text-sm text-blue-500">Wähle eine Option</p>
                  </div>
                </div>
                <button 
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                >
                  <X className="w-5 h-5" strokeWidth={1.5} />
                </button>
              </div>
              
              {/* Actions */}
              <div className="px-4 pb-6 space-y-2">
                {[
                  {
                    icon: ScanLine,
                    label: 'Dokument scannen',
                    description: 'Beleg mit Kamera erfassen',
                    onClick: onScan,
                    iconBg: 'bg-blue-50',
                    iconColor: 'text-blue-600',
                  },
                  {
                    icon: Camera,
                    label: 'Foto aufnehmen',
                    description: 'Foto mit Kamera machen',
                    onClick: onPhoto,
                    iconBg: 'bg-emerald-50',
                    iconColor: 'text-emerald-600',
                  },
                  {
                    icon: FolderOpen,
                    label: 'Datei auswählen',
                    description: 'Von Gerät hochladen',
                    onClick: onFile,
                    iconBg: 'bg-violet-50',
                    iconColor: 'text-violet-600',
                  },
                ].map((action, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      action.onClick();
                      onClose();
                    }}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-100 bg-white hover:bg-slate-50 hover:border-slate-200 transition-all group"
                  >
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105",
                      action.iconBg
                    )}>
                      <action.icon className={cn("w-5 h-5", action.iconColor)} strokeWidth={1.5} />
                    </div>
                    <div className="text-left flex-1">
                      <div className="font-medium text-slate-900">{action.label}</div>
                      <div className="text-sm text-blue-500">{action.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default UploadActionSheet;
