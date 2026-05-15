import React, { useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormContext } from '@/contexts';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { FormSectionKey } from '@/types';
import { toast } from 'sonner';

interface PriorYearImportBannerProps {
  section: FormSectionKey;
  taxYear: string;
  onImported?: () => void;
}

const dismissedKey = (filerId: string, taxYear: string, section: FormSectionKey) =>
  `ditax_pyimport_dismissed_${filerId}_${taxYear}_${section}`;

export const isPriorYearImportDismissed = (
  filerId: string | null | undefined,
  taxYear: string,
  section: FormSectionKey
): boolean => {
  if (!filerId || typeof window === 'undefined') return true;
  return localStorage.getItem(dismissedKey(filerId, taxYear, section)) === '1';
};

export const dismissPriorYearImport = (
  filerId: string,
  taxYear: string,
  section: FormSectionKey
) => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(dismissedKey(filerId, taxYear, section), '1');
};

export const PriorYearImportBanner: React.FC<PriorYearImportBannerProps> = ({
  section,
  taxYear,
  onImported,
}) => {
  const { importFromPreviousYear } = useFormContext();
  const { activeTaxFilerId } = useTaxFiler();
  const [hidden, setHidden] = useState(false);
  const [loading, setLoading] = useState(false);
  const previousYear = parseInt(taxYear) - 1;

  if (hidden || !activeTaxFilerId) return null;

  const handleDismiss = () => {
    dismissPriorYearImport(activeTaxFilerId, taxYear, section);
    setHidden(true);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      await importFromPreviousYear(section);
      dismissPriorYearImport(activeTaxFilerId, taxYear, section);
      toast.success(
        `Strukturen aus ${previousYear} übernommen. Bitte Beträge prüfen und ergänzen.`
      );
      setHidden(true);
      onImported?.();
    } catch (e) {
      console.error(e);
      toast.error('Übernahme fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-4 mt-4 mb-2 rounded-2xl border border-primary/15 bg-primary/[0.04] p-4 relative">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1.5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.04] transition"
        aria-label="Schliessen"
      >
        <X className="w-4 h-4" strokeWidth={1.75} />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-9 h-9 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-primary" strokeWidth={1.75} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] font-semibold text-foreground tracking-tight leading-snug">
            Aus {previousYear} übernehmen?
          </h3>
          <p className="text-[12.5px] text-muted-foreground/85 mt-1 leading-relaxed">
            Wir übernehmen nur Strukturen (z.B. Arbeitgeber, Liegenschaften).
            Beträge musst du anhand deiner aktuellen Belege selbst eintragen.
          </p>
          <div className="mt-3">
            <Button
              size="sm"
              onClick={handleImport}
              disabled={loading}
              className="h-9 px-4"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Übernehmen'
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
