import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { PriorYearChecklistBody, type PriorYearProgress } from '@/components/intake/PriorYearChecklist';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { FormProvider, useFormContext } from '@/contexts';
import { mapPriorYearToFormFlags } from '@/components/intake/priorYearMapping';

function PriorYearIntakeInner({ taxYear }: { taxYear: string }) {
  const navigate = useNavigate();
  const { activeTaxFilerId } = useTaxFiler();
  const { saveSection, formData } = useFormContext();

  const [progress, setProgress] = useState<PriorYearProgress>({
    done: 0, total: 0, ready: false, status: 'loading', items: [],
  });

  const allDone = progress.ready && progress.total > 0 && progress.done === progress.total;

  const handleContinue = async () => {
    if (!allDone) return;
    try {
      const flags = mapPriorYearToFormFlags(progress.items);
      for (const section of ['income', 'assets', 'deductions'] as const) {
        const merged = { ...(formData?.[section] ?? {}), ...flags[section], _completed: true };
        await saveSection(section as any, merged, true);
      }
    } catch (e) {
      // non-blocking
    }
    navigate(`/form?section=unterlagen&year=${taxYear}`);
  };

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader
        title={`Vorjahres-Daten ${Number(taxYear) - 1}`}
        onBack={() => navigate('/')}
      />

      <main className="max-w-xl lg:max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-2 lg:pt-10 pb-40 lg:pb-32">
        <div className="mb-5 lg:mb-10 space-y-1.5 lg:space-y-3 lg:flex lg:items-end lg:justify-between lg:gap-8 lg:space-y-0">
          <div className="space-y-1.5 lg:space-y-3 lg:max-w-2xl">
            <div className="flex items-center gap-2">
              {allDone ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10.5px] font-semibold text-emerald-600 uppercase tracking-widest">
                    Abgeschlossen
                  </span>
                </>
              ) : (
                <>
                  <div className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </div>
                  <span className="text-[10.5px] font-semibold text-primary uppercase tracking-widest">
                    Schritt 1 von 3
                  </span>
                </>
              )}
            </div>
            <h1 className="text-[22px] md:text-3xl lg:text-[34px] font-semibold text-foreground tracking-tight leading-tight">
              {allDone ? 'Deine Vorjahres-Daten sind bestätigt' : 'Bestätige deine Vorjahres-Daten'}
            </h1>
            <p className="text-[14px] md:text-base lg:text-[15px] text-muted-foreground leading-relaxed">
              {allDone
                ? `Du bist bereit für Schritt 2 – lade nun deine Belege für ${taxYear} hoch.`
                : 'Lade dein definitives PDF hoch und bestätige nacheinander die Bereiche aus deinem Vorjahr. So wissen wir, welche Belege du brauchst.'}
            </p>
          </div>
          {/* Inline desktop CTA */}
          <div className="hidden lg:block shrink-0">
            <button
              type="button"
              onClick={handleContinue}
              disabled={!allDone}
              className="h-12 px-6 rounded-2xl bg-gradient-to-b from-[#1E3A5F] to-[#0F1B3D] text-white text-[14px] font-semibold inline-flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(15,27,61,0.4)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap"
            >
              {allDone ? 'Weiter zu Schritt 2' : `Noch ${Math.max(progress.total - progress.done, 0)} bestätigen`}
              {allDone && <ChevronRight className="w-4 h-4" strokeWidth={2} />}
            </button>
          </div>
        </div>

        {activeTaxFilerId && (
          <PriorYearChecklistBody
            taxFilerId={activeTaxFilerId}
            taxYear={taxYear}
            onProgress={setProgress}
            hideHeader
          />
        )}
      </main>

      {/* Sticky footer CTA */}
      <div
        className="fixed inset-x-0 bottom-0 z-[10005] bg-gradient-to-t from-background via-background to-background/0 pt-6 pb-4 px-5 sm:px-8 lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
      >
        <div className="max-w-xl lg:max-w-md mx-auto">
          <button
            type="button"
            onClick={handleContinue}
            disabled={!allDone}
            className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#1E3A5F] to-[#0F1B3D] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(15,27,61,0.4)] transition-all active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none"
          >
            {allDone ? 'Weiter zu Schritt 2' : `Noch ${Math.max(progress.total - progress.done, 0)} Bereich(e) bestätigen`}
            {allDone && <ChevronRight className="w-4 h-4" strokeWidth={2} />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PriorYearIntake() {
  const [searchParams] = useSearchParams();
  const taxYear = searchParams.get('year') || String(new Date().getFullYear() - 1);
  return (
    <FormProvider taxYear={taxYear}>
      <PriorYearIntakeInner taxYear={taxYear} />
    </FormProvider>
  );
}
