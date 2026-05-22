import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, FileCheck } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { PriorYearChecklistBody, type PriorYearProgress } from '@/components/intake/PriorYearChecklist';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { FormProvider, useFormContext } from '@/contexts';
import { mapPriorYearToFormFlags } from '@/components/intake/priorYearMapping';
import documentsCompleteHero from '@/assets/documents-complete-hero.jpg';

function PriorYearIntakeInner({ taxYear }: { taxYear: string }) {
  const navigate = useNavigate();
  const { activeTaxFilerId } = useTaxFiler();
  const { saveSection, formData } = useFormContext();

  const [progress, setProgress] = useState<PriorYearProgress>({
    done: 0, total: 0, ready: false, status: 'loading', items: [],
  });
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const hasShownRef = useRef(false);

  const allDone = progress.ready && progress.total > 0 && progress.done === progress.total;

  // Auto-open completion popup once when all sections become confirmed
  useEffect(() => {
    if (allDone && !hasShownRef.current) {
      hasShownRef.current = true;
      setShowCompletionDialog(true);
    }
    if (!allDone) hasShownRef.current = false;
  }, [allDone]);

  const handleProceed = async () => {
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

      <main className="max-w-xl lg:max-w-6xl xl:max-w-7xl mx-auto px-5 sm:px-8 lg:px-10 pt-2 lg:pt-10 pb-16 lg:pb-32">
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
          {allDone && (
            <div className="hidden lg:block shrink-0">
              <Button onClick={() => setShowCompletionDialog(true)} className="h-12 px-6">
                Weiter zu Schritt 2
              </Button>
            </div>
          )}
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

      {/* Mobile sticky CTA only while not yet done */}
      {!allDone && (
        <div
          className="fixed inset-x-0 bottom-0 z-[10005] bg-gradient-to-t from-background via-background to-background/0 pt-6 pb-4 px-5 sm:px-8 lg:hidden"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)' }}
        >
          <div className="max-w-xl mx-auto">
            <button
              type="button"
              disabled
              className="w-full h-12 rounded-2xl bg-gradient-to-b from-[#1E3A5F] to-[#0F1B3D] text-white text-[15px] font-semibold flex items-center justify-center gap-2 shadow-[0_8px_24px_-8px_rgba(15,27,61,0.4)] opacity-40 pointer-events-none"
            >
              {`Noch ${Math.max(progress.total - progress.done, 0)} Bereich(e) bestätigen`}
            </button>
          </div>
        </div>
      )}

      {/* Completion Bottom Sheet */}
      {showCompletionDialog && (
        <div className="fixed inset-0 z-[10010]">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-300"
            onClick={() => setShowCompletionDialog(false)}
          />
          <div className="absolute bottom-0 left-0 right-0 bg-card rounded-t-[2rem] shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.15)] animate-in slide-in-from-bottom duration-400 pb-8 w-full overflow-hidden">
            <div className="w-10 h-1 rounded-full bg-muted mx-auto mt-3 mb-4" />

            <div className="relative mx-5 sm:mx-6 rounded-2xl overflow-hidden h-40 sm:h-48">
              <img src={documentsCompleteHero} alt="" className="w-full h-full object-cover" />
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-medium text-foreground shadow-sm">
                <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
                Vorjahres-Daten {Number(taxYear) - 1}
              </div>
            </div>

            <div className="px-5 sm:px-6 pt-5">
              <h2 className="text-[20px] sm:text-[22px] font-semibold text-foreground tracking-[-0.012em] mb-1.5">
                Vorjahres-Daten bestätigt!
              </h2>
              <p className="text-[14px] text-muted-foreground leading-[1.55] mb-5">
                Du hast alle Bereiche aus deinem Vorjahr bestätigt. Lade jetzt deine Belege für {taxYear} hoch.
              </p>

              <Button onClick={handleProceed} className="w-full">
                Weiter zu Schritt 2
              </Button>

              <div className="mt-3 flex items-start gap-2 rounded-xl bg-muted/40 border border-border/60 px-3 py-2.5">
                <FileCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" strokeWidth={1.75} />
                <p className="text-[12px] text-muted-foreground leading-[1.45]">
                  Anhand deiner Vorjahres-Bestätigung wissen wir, welche Belege du dieses Jahr brauchst.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
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
