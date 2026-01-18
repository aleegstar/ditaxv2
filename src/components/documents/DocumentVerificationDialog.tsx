import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { AlertTriangle, Info, X } from 'lucide-react';
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

  // Determine if this is a neutral confirmation (mobile DSGVO) or a warning (OCR mismatch)
  const isNeutralMode = verification.confirmationMode === 'neutral';

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-sm p-6 rounded-3xl border-0 shadow-xl"
        hideCloseButton
        variant="light"
      >
        {/* Header with title and close button */}
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 pr-8">
            {isNeutralMode ? 'Bitte bestätigen' : 'Dokument überprüfen'}
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0 -mt-1 -mr-1"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Notice - different styling based on mode */}
        {isNeutralMode ? (
          <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl mb-5">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">
                Dokument bestätigen
              </p>
              <p className="text-blue-700">
                Bitte bestätige, dass es sich um deinen <span className="font-medium">{verification.displayName}</span> handelt.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl mb-5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium mb-1">
                Bitte prüfen
              </p>
              <p className="text-amber-700">
                Das hochgeladene Dokument scheint nicht zum erwarteten Typ zu passen.
              </p>
            </div>
          </div>
        )}

        {/* Document info */}
        <div className="bg-slate-50 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-200">
            <span className="text-sm text-slate-500">Datei</span>
            <span className="text-sm font-medium text-slate-900 truncate ml-4 max-w-[180px]">{fileName}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Erwartet</span>
            <span className="text-sm font-medium text-slate-900">{verification.displayName}</span>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onSelectDifferent}
            className="flex-1 py-3.5 px-4 rounded-full border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            Andere Datei
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3.5 px-4 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white font-medium text-sm hover:-translate-y-0.5 transition-all"
          >
            {isNeutralMode ? 'Bestätigen' : 'Trotzdem nutzen'}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentVerificationDialog;