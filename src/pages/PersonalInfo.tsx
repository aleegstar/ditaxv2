import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, FileText, Clock } from 'lucide-react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { FormProvider, useFormContext } from '@/contexts/form/FormContext';
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
import sectionContactImg from '@/assets/section-contact.webp';
import sectionIncomeImg from '@/assets/section-income.svg';
import sectionDeductionsImg from '@/assets/section-deductions.webp';
import sectionAssetsImg from '@/assets/section-assets.webp';
import completeIllustration from '@/assets/documents-complete-illustration.webp';

const PersonalInfoContent: React.FC<{ taxYear: string }> = ({ taxYear }) => {
  const { t } = useI18n();
  const navigate = useNavigate();
  const { formProgress, isDataLoading, formDataLoaded } = useFormContext();

  const sections: Array<{ id: string; title: string; description: string; image: string; param: string }> = [
    {
      id: 'contact',
      title: t.formDashboard.contactInfo,
      description: 'Adresse & Familie',
      image: sectionContactImg,
      param: 'kontakt',
    },
    {
      id: 'income',
      title: t.formDashboard.income,
      description: 'Lohn & Renten',
      image: sectionIncomeImg,
      param: 'einkommen',
    },
    {
      id: 'deductions',
      title: t.formDashboard.deductions,
      description: 'Versicherung & 3a',
      image: sectionDeductionsImg,
      param: 'abzuege',
    },
    {
      id: 'assets',
      title: t.formDashboard.assets,
      description: 'Konten & Wertschriften',
      image: sectionAssetsImg,
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

  const [showCompleteSheet, setShowCompleteSheet] = useState(false);
  const hasShownRef = useRef(false);
  useEffect(() => {
    if (isDataLoading || !formDataLoaded) return;
    if (allCompleted && !hasShownRef.current) {
      hasShownRef.current = true;
      setShowCompleteSheet(true);
    }
    if (!allCompleted) {
      hasShownRef.current = false;
    }
  }, [allCompleted, isDataLoading, formDataLoaded]);

  const closeSheet = useCallback(() => setShowCompleteSheet(false), []);
  const handleGoToDocuments = useCallback(() => {
    // Navigate first, then let Drawer unmount with the route change
    navigate(`/form?section=unterlagen&year=${taxYear}`);
    setShowCompleteSheet(false);
  }, [navigate, taxYear]);
  const handleLater = useCallback(() => {
    navigate(`/?year=${taxYear}`);
    setShowCompleteSheet(false);
  }, [navigate, taxYear]);

  // Show page skeleton during loading instead of blank screen
  if (isDataLoading || !formDataLoaded) {
    return (
      <div className="min-h-screen text-foreground antialiased">
        <SubpageHeader
          title={t.formDashboard.personalInfo}
          onBack={() => navigate('/')}
        />
        <main className="max-w-xl mx-auto px-5 sm:px-8 pb-24">
          <div className="mb-8 px-1">
            <div className="h-[3px] w-full bg-foreground/[0.06] rounded-full overflow-hidden" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-2xl bg-white border border-[rgba(20,20,20,0.06)] min-h-[190px] animate-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader
        title={t.formDashboard.personalInfo}
        onBack={() => navigate('/')}
      />
      <main className="max-w-xl mx-auto px-5 sm:px-8 pb-24">
        {/* Progress summary — editorial, restrained */}
        <div className="mb-8 px-1">
          <div className="flex items-baseline justify-between mb-2.5">
            <p className="text-[12px] font-medium tracking-[0.08em] uppercase text-muted-foreground/60">
              Fortschritt
            </p>
            <p className="text-[13px] tabular-nums text-muted-foreground/70">
              <span className="text-foreground font-medium">{completedCount}</span>
              <span className="text-muted-foreground/50"> / {sections.length}</span>
            </p>
          </div>
          <div className="h-[3px] w-full bg-foreground/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all duration-700 ease-out"
              style={{ width: `${(completedCount / sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* 2x2 grid — premium handcrafted cards */}
        <motion.div
          key={`grid-${completedCount}`}
          className="grid grid-cols-2 gap-4"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.07, delayChildren: 0.06 } },
          }}
        >
          {sections.map((section) => {
            const completed = isCompleted(section.id);
            return (
              <motion.button
                key={section.id}
                variants={{
                  hidden: { opacity: 0, y: 14 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] } },
                }}
                onClick={() => navigate(`/form?section=${section.param}&year=${taxYear}`)}
                className={cn(
                  "group relative text-left rounded-2xl bg-white p-6 pt-7",
                  "border border-[rgba(20,20,20,0.06)]",
                  "shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03)]",
                  "hover:border-[rgba(20,20,20,0.09)]",
                  "hover:shadow-[0_2px_4px_rgba(0,0,0,0.03),0_12px_32px_rgba(0,0,0,0.05)]",
                  "active:scale-[0.99] transition-all duration-300 min-h-[190px] flex flex-col items-center justify-between"
                )}
              >
                {completed && (
                  <div className="absolute top-3.5 right-3.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" strokeWidth={2.75} />
                  </div>
                )}
                <img
                  src={section.image}
                  alt=""
                  width={320}
                  height={320}
                  loading="lazy"
                  decoding="async"
                  className="w-[72px] h-[72px] object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="text-center w-full">
                  <h3 className="text-[15px] font-semibold text-foreground tracking-tight leading-tight">
                    {section.title}
                  </h3>
                  <p className="text-[12px] text-muted-foreground/70 mt-1.5 leading-relaxed truncate">
                    {section.description}
                  </p>
                </div>
              </motion.button>
            );
          })}
        </motion.div>
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

