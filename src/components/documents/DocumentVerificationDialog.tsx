import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, FileQuestion, Check, X } from 'lucide-react';
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
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
              <FileQuestion className="w-6 h-6 text-amber-600" />
            </div>
            <AlertDialogTitle className="text-lg">
              Dokument-Überprüfung
            </AlertDialogTitle>
          </div>
          
          <AlertDialogDescription asChild>
            <div className="space-y-4 text-left">
              {/* Warning Message */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium mb-1">
                    Das Dokument scheint kein "{verification.displayName}" zu sein.
                  </p>
                  <p className="text-amber-700">
                    {verification.reason}
                  </p>
                </div>
              </div>

              {/* File Info */}
              <div className="text-sm">
                <p className="text-slate-500 mb-1">Datei:</p>
                <p className="font-medium text-slate-900 truncate">{fileName}</p>
              </div>

              {/* Keywords Comparison */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                {/* Found Keywords */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 mb-2 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    Gefunden
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {verification.foundKeywords.length > 0 ? (
                      verification.foundKeywords.slice(0, 5).map((keyword, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded text-xs font-medium"
                        >
                          {keyword}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Keine</span>
                    )}
                  </div>
                </div>

                {/* Missing Keywords */}
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-slate-500 mb-2 flex items-center gap-1.5">
                    <X className="w-3.5 h-3.5 text-red-500" />
                    Erwartet
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {verification.missingKeywords.slice(0, 5).map((keyword, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs font-medium"
                      >
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <span className="text-sm text-slate-600">Übereinstimmung:</span>
                <span className={`text-sm font-semibold ${
                  verification.confidence >= 70 ? 'text-emerald-600' :
                  verification.confidence >= 40 ? 'text-amber-600' :
                  'text-red-600'
                }`}>
                  {verification.confidence}%
                </span>
              </div>

              {/* Question */}
              <p className="text-slate-700 font-medium pt-2">
                Bist du sicher, dass es die korrekte Datei ist?
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
          <AlertDialogCancel
            onClick={onSelectDifferent}
            className="w-full sm:w-auto order-2 sm:order-1"
          >
            Andere Datei wählen
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 order-1 sm:order-2"
          >
            Trotzdem hochladen
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default DocumentVerificationDialog;
