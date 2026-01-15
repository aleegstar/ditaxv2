import React from 'react';
import { X, ScanLine, Camera, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  ];

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] transition-opacity"
        onClick={onClose}
      />
      
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-[101] px-4 pb-8 animate-in slide-in-from-bottom duration-300">
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
            {actions.map((action, index) => (
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
      </div>
    </>
  );
};

export default UploadActionSheet;
