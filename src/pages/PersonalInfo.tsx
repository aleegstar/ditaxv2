import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, User, Wallet, Receipt, Landmark, ArrowRight, Sparkles } from 'lucide-react';
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
  meta: string;
  Icon: React.ElementType;
  param: string;
};

const PersonalInfoContent: React.FC<{ taxYear: string }> = ({ taxYear }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formProgress, isDataLoading, formDataLoaded } = useFormContext();

  const sections: SectionDef[] = [
    {
      id: 'contact',
      title: t.formDashboard.contactInfo,
      description: 'Adresse, Zivilstand & Familie',
      meta: 'Persönliche Stammdaten',
      Icon: User,
      param: 'kontakt',
    },
    {
      id: 'income',
      title: t.formDashboard.income,
      description: 'Lohn, Renten & Nebeneinkünfte',
      meta: 'Lohnausweis erforderlich',
      Icon: Wallet,
      param: 'einkommen',
    },
    {
      id: 'deductions',
      title: t.formDashboard.deductions,
      description: 'Versicherung, 3a & Berufskosten',
      meta: 'Belege empfohlen',
      Icon: Receipt,
      param: 'abzuege',
    },
    {
      id: 'assets',
      title: t.formDashboard.assets,
      description: 'Konten, Wertschriften & Immobilien',
      meta: 'Steuerauszug erforderlich',
      Icon: Landmark,
      param: 'vermoegen',
    },
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

  /* ─── Loading skeleton ─────────────────────────────── */
  if (isDataLoading || !formDataLoaded) {
    return (
      <div className="min-h-screen text-foreground antialiased">
        <SubpageHeader title={t.formDashboard.personalInfo} onBack={() => navigate('/')} />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-2 pb-24">
          <div className="rounded-[18px] bg-white ring-1 ring-black/[0.05] p-5 mb-4 animate-pulse h-[88px]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-[16px] bg-white ring-1 ring-black/[0.05] h-[110px] animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader title={t.formDashboard.personalInfo} onBack={() => navigate('/')} />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-2 pb-28">
        {/* ── Overview header — compact onboarding summary ────────────── */}
        <section className="rounded-[18px] bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(15,27,61,0.025),0_8px_24px_-14px_rgba(15,27,61,0.05)] px-5 py-4 mb-4">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="min-w-0">
              <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                Steuerjahr {taxYear} · Setup
              </p>
              <h2 className="text-[17px] font-semibold tracking-[-0.015em] text-foreground mt-1 leading-tight">
                Persönliche Angaben
              </h2>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[20px] font-semibold tabular-nums tracking-[-0.02em] text-foreground leading-none">
                {percent}<span className="text-muted-foreground/50 text-[14px] font-medium ml-0.5">%</span>
              </div>
              <div className="text-[10.5px] text-muted-foreground/70 mt-1 tabular-nums">
                {completedCount} von {sections.length} Module
              </div>
            </div>
          </div>
          <div className="h-[4px] rounded-full bg-foreground/[0.06] overflow-hidden">
            <div
              className="h-full rounded-full bg-foreground transition-[width] duration-700 ease-out"
              style={{ width: `${percent}%` }}
            />
          </div>
        </section>

        {/* ── Onboarding modules grid ─────────────────────────────────── */}
        <motion.div
          key={`grid-${completedCount}`}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
          }}
        >
          {sections.map((section) => {
            const completed = isCompleted(section.id);
            const Icon = section.Icon;
            return (
              <motion.button
                key={section.id}
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 0.61, 0.36, 1] } },
                }}
                onClick={() => navigate(`/form?section=${section.param}&year=${taxYear}`)}
                className={cn(
                  "group relative text-left rounded-[16px] bg-white p-4",
                  "ring-1 ring-black/[0.05] hover:ring-black/[0.09]",
                  "shadow-[0_1px_2px_rgba(15,27,61,0.02)]",
                  "hover:shadow-[0_2px_4px_rgba(15,27,61,0.03),0_12px_28px_-14px_rgba(15,27,61,0.08)]",
                  "active:scale-[0.995] transition-all duration-200"
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 transition-colors",
                      completed
                        ? "bg-emerald-500/10 text-emerald-600"
                        : "bg-foreground/[0.045] text-foreground/75 group-hover:bg-foreground group-hover:text-background"
                    )}
                  >
                    {completed
                      ? <Check className="w-[16px] h-[16px]" strokeWidth={2.25} />
                      : <Icon className="w-[16px] h-[16px]" strokeWidth={1.75} />}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-[14px] font-semibold text-foreground tracking-[-0.008em] leading-tight truncate">
                        {section.title}
                      </h3>
                    </div>
                    <p className="text-[12px] text-muted-foreground/85 mt-0.5 leading-snug truncate">
                      {section.description}
                    </p>
                  </div>

                  <ChevronRight className="w-[14px] h-[14px] text-muted-foreground/40 group-hover:text-foreground transition-colors mt-2 flex-shrink-0" strokeWidth={1.75} />
                </div>

                <div className="mt-3 pt-3 border-t border-black/[0.04] flex items-center justify-between">
                  <span className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground/65 truncate">
                    {section.meta}
                  </span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded-md tabular-nums shrink-0",
                      completed
                        ? "bg-emerald-500/10 text-emerald-700"
                        : "bg-foreground/[0.05] text-foreground/65"
                    )}
                  >
                    {completed ? 'Abgeschlossen' : 'Offen'}
                  </span>
                </div>
              </motion.button>
            );
          })}
        </motion.div>

        {/* ── Sticky summary / next step panel ────────────────────────── */}
        {!allCompleted && nextSection && (
          <section className="mt-4 rounded-[16px] bg-white ring-1 ring-black/[0.05] shadow-[0_1px_2px_rgba(15,27,61,0.025),0_8px_24px_-14px_rgba(15,27,61,0.05)] overflow-hidden">
            <div className="px-5 pt-4 pb-3">
              <div className="flex items-center justify-between">
                <p className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground/70">
                  Zusammenfassung
                </p>
                <p className="text-[10.5px] tabular-nums text-muted-foreground/65">
                  {completedCount}/{sections.length} Module
                </p>
              </div>
              <ul className="mt-2.5 space-y-1.5">
                {sections.map((s) => {
                  const done = isCompleted(s.id);
                  return (
                    <li key={s.id} className="flex items-center gap-2.5 text-[12.5px]">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          done ? "bg-emerald-500" : "bg-foreground/25"
                        )}
                      />
                      <span className={cn("font-medium", done ? "text-foreground/85" : "text-foreground")}>
                        {s.title}
                      </span>
                      <span className={cn("ml-auto text-[11px]", done ? "text-emerald-700/85" : "text-muted-foreground/65")}>
                        {done ? 'abgeschlossen' : 'ausstehend'}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <button
              onClick={() => navigate(`/form?section=${nextSection.param}&year=${taxYear}`)}
              className="w-full flex items-center justify-between gap-3 px-5 py-3.5 bg-foreground text-background hover:bg-foreground/90 transition-colors group"
            >
              <span className="flex items-center gap-2 min-w-0">
                <Sparkles className="w-[14px] h-[14px] flex-shrink-0" strokeWidth={2} />
                <span className="text-[10.5px] font-medium uppercase tracking-[0.08em] text-background/65">
                  Nächster Schritt
                </span>
                <span className="text-[13px] font-semibold tracking-[-0.005em] truncate">
                  {nextSection.title} ergänzen
                </span>
              </span>
              <ArrowRight className="w-[14px] h-[14px] flex-shrink-0 group-hover:translate-x-0.5 transition-transform" strokeWidth={2} />
            </button>
          </section>
        )}
      </main>

      <Drawer open={showCompleteSheet} onOpenChange={(open) => { if (!open) closeSheet(); }}>
        <DrawerContent variant="bottom-sheet" className="px-6 pb-8 pt-2 overflow-hidden">
          <div className="mb-6" />
          <div className="text-center space-y-2 mb-6">
            <img
              src={completeIllustration}
              alt=""
              className="w-28 h-28 object-contain mx-auto mb-2"
            />
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
