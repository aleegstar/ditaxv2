import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, PenTool } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface CompletedContentProps {
  taxYear: string;
  completedTaxReturnId: string;
  signatureStatus?: string | null;
}

export const CompletedContent: React.FC<CompletedContentProps> = ({
  taxYear,
  completedTaxReturnId,
  signatureStatus,
}) => {
  const navigate = useNavigate();
  const isSigned = signatureStatus === 'signed';

  return (
    <div className="space-y-3">
      <div
        className="rounded-[1.5rem] bg-white border border-slate-200/80 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.04)]"
      >
        <div className="flex items-center gap-3 mb-4">
          {isSigned ? (
            <div className="flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-full">
              <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2} />
              <span className="text-xs font-medium text-emerald-700">Abgeschlossen</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full">
              <PenTool className="w-3.5 h-3.5 text-amber-600" strokeWidth={1.8} />
              <span className="text-xs font-medium text-amber-700">Unterschrift ausstehend</span>
            </div>
          )}
        </div>

        <h2 className="font-semibold tracking-tight text-foreground leading-tight mb-2 text-3xl">
          {taxYear}
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-5">
          {isSigned
            ? 'Deine Steuererklärung wurde erfolgreich abgeschlossen.'
            : 'Bitte unterschreibe deine Steuererklärung, um den Prozess abzuschliessen.'}
        </p>

        <Button
          type="button"
          onClick={() => navigate(`/tax-return-actions/${completedTaxReturnId}?year=${taxYear}`)}
          className="w-full shadow-none hover:shadow-none"
        >
          Ansehen & Herunterladen
        </Button>
      </div>
    </div>
  );
};
