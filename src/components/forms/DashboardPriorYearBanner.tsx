import React, { useEffect, useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFormContext } from '@/contexts';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { FormSectionKey } from '@/types';
import { dismissPriorYearImport } from './PriorYearImportBanner';
import { toast } from 'sonner';

const SECTIONS: FormSectionKey[] = ['contactInfo', 'income', 'deductions', 'assets'];

const dashboardKey = (filerId: string, taxYear: string) =>
  `ditax_pyimport_dashboard_${filerId}_${taxYear}`;

export const DashboardPriorYearBanner: React.FC<{ taxYear: string }> = ({
  taxYear,
}) => {
  const { hasDataForPreviousYear, importFromPreviousYear, formProgress } =
    useFormContext();
  const { activeTaxFilerId } = useTaxFiler();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      if (!activeTaxFilerId) return;
      if (typeof window !== 'undefined' && localStorage.getItem(dashboardKey(activeTaxFilerId, taxYear)) === '1') return;
      // Skip if any section already complete (user has started this year)
      const anyComplete =
        formProgress.contactInfo || formProgress.income ||
        formProgress.deductions || formProgress.assets;
      if (anyComplete) return;
      // At least one section must have prior-year data
      for (const s of SECTIONS) {
        // eslint-disable-next-line no-await-in-loop
        const has = await hasDataForPreviousYear(s);
        if (cancelled) return;
        if (has) { setVisible(true); return; }
      }
    };
    check();
    return () => { cancelled = true; };
  }, [activeTaxFilerId, taxYear, hasDataForPreviousYear, formProgress]);

  if (!visible || !activeTaxFilerId) return null;

  const previousYear = parseInt(taxYear) - 1;

  const dismissAll = () => {
    SECTIONS.forEach((s) => dismissPriorYearImport(activeTaxFilerId, taxYear, s));
    if (typeof window !== 'undefined') {
      localStorage.setItem(dashboardKey(activeTaxFilerId, taxYear), '1');
    }
  };

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(dashboardKey(activeTaxFilerId, taxYear), '1');
    }
    setVisible(false);
  };

  const handleImport = async () => {
    setLoading(true);
    try {
      for (const s of SECTIONS) {
        // eslint-disable-next-line no-await-in-loop
        const has = await hasDataForPreviousYear(s);
        if (has) {
          // eslint-disable-next-line no-await-in-loop
          await importFromPreviousYear(s);
        }
      }
      dismissAll();
      toast.success(
        `Strukturen aus ${previousYear} übernommen. Bitte Beträge in jeder Sektion ergänzen.`
      );
      setVisible(false);
    } catch (e) {
      console.error(e);
      toast.error('Übernahme fehlgeschlagen.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-primary/15 bg-primary/[0.04] p-5 mb-4 relative">
      <button
        type="button"
        onClick={handleDismiss}
        className="absolute top-2.5 right-2.5 p-1.5 rounded-full text-muted-foreground/60 hover:text-foreground hover:bg-foreground/[0.04] transition"
        aria-label="Schliessen"
      >
        <X className="w-4 h-4" strokeWidth={1.75} />
      </button>
      <div className="pr-6">
        <h3 className="text-[14px] font-semibold text-foreground tracking-tight leading-snug">
          Mit Vorjahres-Daten starten
        </h3>
        <p className="text-[12.5px] text-muted-foreground/85 mt-1 leading-relaxed">
          Übernimm Strukturen (Arbeitgeber, Liegenschaften, Abzüge) aus {previousYear}
          – aktuelle Beträge musst du selbst eintragen.
        </p>
        <div className="mt-3">
          <Button size="sm" onClick={handleImport} disabled={loading} className="h-9 px-4">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Übernehmen'}
          </Button>
        </div>
      </div>

    </div>
  );
};
