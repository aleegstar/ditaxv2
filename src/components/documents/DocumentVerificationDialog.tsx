import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, X } from 'lucide-react';
import { OcrVerificationResult } from '@/services/OcrVerificationService';

interface DocumentVerificationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onSelectDifferent: () => void;
  verification: OcrVerificationResult | null;
  fileName: string;
}

const DocumentVerificationDialog: React.FC<DocumentVerificationDialogProps> = ({
  open,
  onClose,
  onConfirm,
  onSelectDifferent,
  verification,
  fileName
}) => {
  if (!verification) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-sm p-6 rounded-3xl border-0 shadow-xl"
        hideCloseButton
      >
        {/* Header with title and close button */}
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 pr-8">
            Mögliches falsches Dokument
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0 -mt-1 -mr-1"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Warning notice */}
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <p className="font-medium mb-1">
              Dokumentenprüfung
            </p>
            <p className="text-amber-700">
              Die automatische Prüfung vermutet, dass dieses Dokument nicht dem erwarteten Dokumenttyp entspricht.
            </p>
          </div>
        </div>

        {/* Document info */}
        <div className="space-y-3 mb-6">
          <div className="text-sm text-center">
            <p className="text-slate-500 mb-1">Datei:</p>
            <p className="font-medium text-slate-900 truncate">{fileName}</p>
          </div>

          <div className="text-sm text-center">
            <p className="text-slate-500 mb-1">Erwarteter Dokumenttyp:</p>
            <p className="font-medium text-slate-900">{verification.displayName}</p>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSelectDifferent}
            className="flex-1 py-3.5 px-4 rounded-full border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 px-4 rounded-full bg-blue-400 text-white font-medium text-sm hover:bg-blue-500 transition-colors"
          >
            Trotzdem zuordnen
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentVerificationDialog;