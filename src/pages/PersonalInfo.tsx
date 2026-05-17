import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, User, Wallet, Receipt, Landmark, ArrowRight } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { FormProvider, useFormContext } from '@/contexts/form/FormContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import completeIllustration from '@/assets/documents-complete-illustration.svg';

type SectionDef = {
  id: 'contact' | 'income' | 'deductions' | 'assets';
  title: string;
  description: string;
  Icon: React.ElementType;
  param: string;
};

const PersonalInfoContent: React.FC<{ taxYear: string }> = ({ taxYear }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formProgress, isDataLoading, formDataLoaded } = useFormContext();

  const sections: SectionDef[] = [
    { id: 'contact',    title: t.formDashboard.contactInfo, description: 'Adresse, Familie & Zivilstand',         Icon: User,     param: 'kontakt' },
    { id: 'income',     title: t.formDashboard.income,      description: 'Lohn, Rente & Nebeneinkünfte',          Icon: Wallet,   param: 'einkommen' },
    { id: 'deductions', title: t.formDashboard.deductions,  description: 'Versicherungen, 3a & Berufskosten',     Icon: Receipt,  param: 'abzuege' },
    { id: 'assets',     title: t.formDashboard.assets,      description: 'Konten, Wertschriften & Immobilien',    Icon: Landmark, param: 'vermoegen' },
  ];

  const isCompleted = (id: string) => {
    switch (id) {
      case 'contact': return formProgress.contactInfo || false;
      case 'income': return formProgress.income || false;
      case 'deductions': return formProgress.deductions || false;
      case 'assets': return formProgress.assets || false;
      default: return false;
    }
  };

  const completedCount = sections.filter(s => isCompleted(s.id)).length;
  const allCompleted = completedCount === sections.length;
  const percent = Math.round((completedCount / sections.length) * 100);
  const nextSection = sections.find(s => !isCompleted(s.id));

  const [showCompleteSheet, setShowCompleteSheet] = useState(false);
  const hasShownRef = useRef(false);
  useEffect(() => {
    if (isDataLoading || !formDataLoaded) return;
    if (allCompleted && !hasShownRef.current) {
      hasShownRef.current = true;
      setShowCompleteSheet(true);
    }
    if (!allCompleted) hasShownRef.current = false;
  }, [allCompleted, isDataLoading, formDataLoaded]);

  const closeSheet = useCallback(() => setShowCompleteSheet(false), []);
  const handleGoToDocuments = useCallback(() => {
    navigate(`/form?section=unterlagen&year=${taxYear}`);
    setShowCompleteSheet(false);
  }, [navigate, taxYear]);

  if (isDataLoading || !formDataLoaded) {
    return (
      <div className="min-h-screen text-foreground antialiased">
        <SubpageHeader title={t.formDashboard.personalInfo} onBack={() => navigate('/')} />
        <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-24">
          <div className="h-5 w-48 bg-foreground/[0.06] rounded animate-pulse mb-3" />
          <div className="h-4 w-80 max-w-full bg-foreground/[0.04] rounded animate-pulse mb-8" />
          <div className="h-[3px] w-full bg-foreground/[0.06] rounded-full animate-pulse mb-10" />
          <div className="divide-y divide-black/[0.06] border-y border-black/[0.06]">
            {[0,1,2,3].map(i => (
              <div key={i} className="h-[72px] animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader title={t.formDashboard.personalInfo} onBack={() => navigate('/')} />

      <main className="max-w-2xl mx-auto px-4 sm:px-6 pt-6 pb-32">
        {/* ── Header: title + explanation ─────────────────────────────── */}
        <header className="mb-7">
          <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70 mb-2">
            Steuerjahr {taxYear}
          </p>
          <h1 className="text-[22px] sm:text-[24px] font-semibold tracking-[-0.02em] text-foreground leading-tight">
            Persönliche Angaben
          </h1>
          <p className="text-[13.5px] text-muted-foreground mt-1.5 leading-relaxed max-w-lg">
            Ergänze deine persönlichen Informationen. Diese Angaben bilden die
            Grundlage für deine Steuererklärung.
          </p>

          {/* Compact progress */}
          <div className="mt-6 flex items-center gap-3">
            <div className="flex-1 h-[3px] rounded-full bg-foreground/[0.07] overflow-hidden">
              <div
                className="h-full rounded-full bg-foreground transition-[width] duration-700 ease-out"
                style={{ width: `${percent}%` }}
              />
            </div>
            <div className="text-[12px] tabular-nums text-muted-foreground shrink-0">
              <span className="font-semibold text-foreground">{completedCount}</span>
              <span className="text-muted-foreground/60"> / {sections.length} abgeschlossen</span>
            </div>
          </div>
        </header>

        {/* ── Workflow list ───────────────────────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3 px-0.5">
            <h2 className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
              Bereiche
            </h2>
            {nextSection && (
              <span className="text-[11px] text-muted-foreground/70">
                Als Nächstes: <span className="text-foreground/85 font-medium">{nextSection.title}</span>
              </span>
            )}
          </div>

          <ul className="border-y border-black/[0.07] divide-y divide-black/[0.06]">
            {sections.map((section) => {
              const completed = isCompleted(section.id);
              const Icon = section.Icon;
              return (
                <li key={section.id}>
                  <button
                    onClick={() => navigate(`/form?section=${section.param}&year=${taxYear}`)}
                    className={cn(
                      "group w-full flex items-center gap-4 py-4 px-1 text-left",
                      "transition-colors hover:bg-foreground/[0.015]"
                    )}
                  >
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors",
                        completed
                          ? "bg-emerald-500/12 text-emerald-600"
                          : "bg-foreground/[0.05] text-foreground/70"
                      )}
                    >
                      {completed
                        ? <Check className="w-[14px] h-[14px]" strokeWidth={2.5} />
                        : <Icon className="w-[14px] h-[14px]" strokeWidth={1.75} />}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="text-[14.5px] font-medium text-foreground tracking-[-0.005em] leading-tight">
                        {section.title}
                      </div>
                      <div className="text-[12.5px] text-muted-foreground/85 mt-0.5 leading-snug truncate">
                        {section.description}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span
                        className={cn(
                          "text-[12px] tabular-nums",
                          completed ? "text-emerald-700/85" : "text-muted-foreground"
                        )}
                      >
                        {completed ? 'Abgeschlossen' : 'Unvollständig'}
                      </span>
                      <ChevronRight
                        className="w-[15px] h-[15px] text-muted-foreground/40 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition-all"
                        strokeWidth={1.75}
                      />
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Helper line below list */}
          <p className="text-[11.5px] text-muted-foreground/65 mt-3 px-0.5 leading-relaxed">
            Du kannst Bereiche jederzeit unterbrechen und später fortsetzen — dein
            Fortschritt wird automatisch gespeichert.
          </p>
        </section>

        {/* ── Next step — quiet inline action, not a card ─────────────── */}
        {!allCompleted && nextSection && (
          <div className="mt-10 pt-6 border-t border-black/[0.07] flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/70">
                Nächster Schritt
              </p>
              <p className="text-[14px] font-medium text-foreground mt-1 truncate">
                {nextSection.title} ergänzen
              </p>
            </div>
            <Button
              onClick={() => navigate(`/form?section=${nextSection.param}&year=${taxYear}`)}
              className="shrink-0"
            >
              Fortfahren
              <ArrowRight className="w-4 h-4 ml-1.5" strokeWidth={2} />
            </Button>
          </div>
        )}
      </main>

      <Drawer open={showCompleteSheet} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <DrawerContent variant="bottom-sheet" className="px-6 pb-8 pt-2 overflow-hidden">
          <div className="mb-6" />
          <div className="text-center space-y-2 mb-6">
            <img src={completeIllustration} alt="" className="w-28 h-28 object-contain mx-auto mb-2" />
            <DrawerTitle className="text-xl font-bold text-foreground">
              Alle Angaben vollständig!
            </DrawerTitle>
            <DrawerDescription className="text-sm text-muted-foreground">
              Du hast alle persönlichen Angaben erfasst. Möchtest du jetzt mit deinen Unterlagen fortfahren?
            </DrawerDescription>
          </div>
          <div className="flex flex-col gap-3">
            <Button className="w-full" onClick={handleGoToDocuments} style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}>
              Ja, weiter zu Unterlagen
            </Button>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

const PersonalInfo: React.FC = () => {
  const [searchParams] = useSearchParams();
  const taxYear = searchParams.get('year') || (new Date().getFullYear() - 1).toString();
  return (
    <FormProvider taxYear={taxYear}>
      <PersonalInfoContent taxYear={taxYear} />
    </FormProvider>
  );
};

export default PersonalInfo;
