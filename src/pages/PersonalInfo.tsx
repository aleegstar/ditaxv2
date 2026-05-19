import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, CheckCircle2, ChevronRight, User, Wallet, Receipt, Landmark, ArrowRight, Info } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { FormProvider, useFormContext } from '@/contexts/form/FormContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import completeIllustration from '@/assets/documents-complete-illustration.svg';
import personalInfoHero from '@/assets/personal-info-hero.webp';
import completeHero from '@/assets/personal-info-complete-hero.png';

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
    { id: 'deductions', title: t.formDashboard.deductions,  description: 'Versicherungen, Säule 3a & Berufskosten', Icon: Receipt,  param: 'abzuege' },
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
      <div className="min-h-screen text-slate-900 antialiased bg-white">
        <SubpageHeader title={t.formDashboard.personalInfo} onBack={() => navigate('/')} />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-24">
          <div className="h-40 w-full bg-slate-100 rounded-2xl animate-pulse mb-8" />
          <div className="h-72 w-full bg-slate-100 rounded-2xl animate-pulse" />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-900 antialiased bg-white">
      <SubpageHeader title={t.formDashboard.personalInfo} onBack={() => navigate('/')} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-10 pt-6 pb-32">
        {/* ── Hero Card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)] mb-10">
          <div className="relative h-40 sm:h-52 w-full overflow-hidden">
            <img
              src={personalInfoHero}
              alt="Persönliche Angaben gemeinsam ergänzen"
              className="w-full h-full object-cover"
              loading="lazy"
            />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-white/95 backdrop-blur-sm text-[11px] font-medium text-foreground shadow-sm">
              <User className="w-3 h-3" strokeWidth={2.25} />
              Steuerjahr {taxYear}
            </div>
            {allCompleted && (
              <div className="absolute top-3 right-3 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-emerald-500/95 backdrop-blur-sm text-[11px] font-medium text-white shadow-sm">
                <Check className="w-3 h-3" strokeWidth={2.5} />
                Abgeschlossen
              </div>
            )}
          </div>
          <div className="p-5 sm:p-6">
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-foreground tracking-[-0.018em] mb-1.5">
              Persönliche Angaben
            </h2>
            <p className="text-[13px] sm:text-[14px] text-muted-foreground leading-[1.55] max-w-xl mb-5">
              Ergänze deine persönlichen Informationen. Diese Angaben bilden die Grundlage für deine Steuererklärung.
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="w-full sm:w-56 h-1.5 bg-muted rounded-full overflow-hidden shrink-0">
                <div
                  className="h-full rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${percent}%`,
                    background: 'linear-gradient(90deg, #1E3A5F 0%, #0F1B3D 100%)',
                  }}
                />
              </div>
              <div className="text-[13px] font-medium text-foreground shrink-0 tabular-nums">
                {completedCount} von {sections.length} abgeschlossen
              </div>
            </div>
          </div>
        </div>

        {/* ── Bereiche Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-4 px-1">
          <h3 className="text-[11px] font-semibold text-slate-400 tracking-[0.1em] uppercase">
            Bereiche
          </h3>
          {allCompleted ? (
            <span className="text-sm font-medium text-emerald-600">
              Alle Bereiche abgeschlossen
            </span>
          ) : (
            nextSection && (
              <span className="text-sm text-slate-500">
                Als Nächstes: <span className="text-slate-900 font-medium">{nextSection.title}</span>
              </span>
            )
          )}
        </div>

        {/* ── List of Bereiche ─────────────────────────────────────── */}
        <div className="border border-slate-200 rounded-2xl bg-white divide-y divide-slate-100 mb-6 overflow-hidden">
          {sections.map((section) => {
            const completed = isCompleted(section.id);
            const Icon = section.Icon;
            return (
              <button
                key={section.id}
                onClick={() => navigate(`/form?section=${section.param}&year=${taxYear}`)}
                className="w-full flex items-center p-5 hover:bg-slate-50 transition-colors group text-left"
              >
                <div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shrink-0 mr-4",
                    completed ? "bg-emerald-50 text-emerald-600" : "bg-slate-50 text-slate-500"
                  )}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[15px] font-medium text-slate-900">
                    {section.title}
                  </h4>
                  <p className="text-sm text-slate-500 mt-0.5 truncate">
                    {section.description}
                  </p>
                </div>
                <div className="flex items-center gap-2 mr-4">
                  {completed ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2} />
                      <span className="text-sm font-medium text-emerald-600 hidden sm:inline">
                        Abgeschlossen
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-slate-500 hidden sm:inline">
                      Unvollständig
                    </span>
                  )}
                </div>
                <ChevronRight
                  className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all"
                  strokeWidth={1.75}
                />
              </button>
            );
          })}
        </div>

        {/* ── Info Alert ───────────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl mb-10 text-slate-500 text-sm">
          <Info className="w-5 h-5 shrink-0 mt-0.5 text-slate-400" strokeWidth={1.75} />
          <p className="leading-relaxed">
            Du kannst Bereiche jederzeit unterbrechen und später fortsetzen –
            dein Fortschritt wird automatisch gespeichert.
          </p>
        </div>

        {/* ── Next Step Card ───────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 bg-white border border-slate-200 rounded-2xl shadow-sm gap-6">
          <div className="min-w-0">
            <h3 className="text-[11px] font-semibold text-slate-400 tracking-[0.1em] uppercase mb-2">
              Nächster Schritt
            </h3>
            <h4 className="text-lg font-medium text-slate-900">
              {allCompleted ? 'Alle Angaben sind vollständig' : `${nextSection?.title} ergänzen`}
            </h4>
            <p className="text-sm text-slate-500 mt-1">
              {allCompleted
                ? 'Überprüfe und fahre mit den Unterlagen fort.'
                : 'Setze deine Steuererklärung Schritt für Schritt fort.'}
            </p>
          </div>
          <Button
            onClick={() =>
              allCompleted
                ? handleGoToDocuments()
                : nextSection && navigate(`/form?section=${nextSection.param}&year=${taxYear}`)
            }
            className="shrink-0"
          >
            Fortfahren
            <ArrowRight className="w-4 h-4 ml-1.5" strokeWidth={2} />
          </Button>
        </div>
      </main>

      <Drawer open={showCompleteSheet} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <DrawerContent variant="bottom-sheet" className="p-0 overflow-hidden bg-card">
          <div className="px-5 pt-4 pb-6 sm:px-6 sm:pb-7">
            {/* Hero card */}
            <div className="relative rounded-2xl overflow-hidden border border-border shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)] bg-card">
              <div className="relative aspect-[16/9] w-full overflow-hidden">
                <img
                  src={completeHero}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />
                <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-white/95 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-emerald-700 shadow-sm">
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                  Geschafft
                </div>
              </div>
              <div className="px-5 py-4 sm:px-6 sm:py-5">
                <DrawerTitle className="text-[18px] sm:text-[20px] font-semibold tracking-[-0.012em] text-foreground">
                  Alle Angaben vollständig!
                </DrawerTitle>
                <DrawerDescription className="text-[13px] sm:text-[14px] text-muted-foreground mt-1 leading-relaxed">
                  Du hast alle persönlichen Angaben erfasst. Möchtest du jetzt mit deinen Unterlagen fortfahren?
                </DrawerDescription>
              </div>
            </div>

            {/* Action */}
            <div className="mt-5 flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={handleGoToDocuments}
                style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
              >
                Ja, weiter zu Unterlagen
                <ArrowRight className="w-4 h-4 ml-1.5" strokeWidth={2} />
              </Button>
              <Button
                variant="ghost"
                className="w-full text-muted-foreground hover:text-foreground"
                onClick={closeSheet}
              >
                Später
              </Button>
            </div>
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
