import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, Send, LucideIcon, Lock } from 'lucide-react';
import tipFolderImg from '@/assets/tip-info.webp';
import documentsMessageImg from '@/assets/documents-message.svg';
import { AnimatedCircularProgressBar } from '@/components/ui/animated-circular-progress-bar';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { useI18n } from '@/contexts/I18nContext';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useFormTourSafe } from '@/contexts/FormTourContext';
import { DashboardPriorYearBanner } from '@/components/forms/DashboardPriorYearBanner';
import { cn } from '@/lib/utils';

interface DashboardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  param: string;
}

interface TaxYearDashboardProps {
  embedded?: boolean;
}

export const TaxYearDashboard: React.FC<TaxYearDashboardProps> = ({ embedded = false }) => {
  const { t } = useI18n();
  const {
    formProgress,
    taxYear,
    isDataLoading,
    formDataLoaded
  } = useFormContext();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [isReady, setIsReady] = useState(false);
  const [isAngabenExpanded, setIsAngabenExpanded] = useState(true);
  const [tipDismissed, setTipDismissed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('dashboard-tip-dismissed') === 'true';
  });

  const { activeTaxFilerId } = useTaxFiler();
  const formTour = useFormTourSafe();

  // Load payment status
  useEffect(() => {
    const loadPaymentStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !taxYear || !activeTaxFilerId) return;
      const { data } = await supabase.from('tax_returns').select('payment_status').eq('user_id', user.id).eq('tax_year', taxYear).eq('tax_filer_id', activeTaxFilerId).maybeSingle();
      if (data?.payment_status) {
        setPaymentStatus(data.payment_status);
      }
    };
    loadPaymentStatus();
  }, [taxYear, activeTaxFilerId]);

  // Mark component as ready after initial data load
  useEffect(() => {
    if (!isDataLoading && formDataLoaded) {
      const timer = setTimeout(() => setIsReady(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsReady(false);
    }
  }, [isDataLoading, formDataLoaded]);

  const angabenSections: DashboardSection[] = [
    { id: 'contact', title: t.formDashboard.contactInfo, icon: User, param: 'kontakt' },
    { id: 'deductions', title: t.formDashboard.deductions, icon: Shield, param: 'abzuege' },
    { id: 'income', title: t.formDashboard.income, icon: Wallet, param: 'einkommen' },
    { id: 'assets', title: t.formDashboard.assets, icon: Landmark, param: 'vermoegen' },
  ];

  const isCompleted = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'contact': return formProgress.contactInfo || false;
      case 'income': return formProgress.income || false;
      case 'deductions': return formProgress.deductions || false;
      case 'assets': return formProgress.assets || false;
      case 'documents': return formProgress.documents || false;
      case 'submit':
        return formProgress.contactInfo && formProgress.income && formProgress.deductions && formProgress.assets && formProgress.documents && paymentStatus === 'paid' || false;
      default: return false;
    }
  };

  const allAngabenComplete = angabenSections.every(s => isCompleted(s.id));

  // Auto-collapse when all angaben are complete
  useEffect(() => {
    if (allAngabenComplete) {
      setIsAngabenExpanded(false);
    }
  }, [allAngabenComplete]);

  // Show nothing while loading
  if (isDataLoading || !isReady || !formDataLoaded) {
    return null;
  }

  const getAngabenProgress = () => {
    const completed = angabenSections.filter(s => isCompleted(s.id)).length;
    return { completed, total: 4, percentage: Math.round(completed / 4 * 100) };
  };

  const handleSectionClick = (section: DashboardSection) => {
    formTour?.skipTour();
    if (embedded) {
      navigate(`/form?section=${section.param}&year=${taxYear}`);
    } else {
      setSearchParams({ section: section.param, year: taxYear });
    }
  };

  const handleDocumentsClick = () => {
    formTour?.skipTour();
    if (embedded) {
      navigate(`/form?section=unterlagen&year=${taxYear}`);
    } else {
      setSearchParams({ section: 'unterlagen', year: taxYear });
    }
  };

  const handleSubmitClick = () => {
    const documentsComplete = isCompleted('documents');
    if (allAngabenComplete && documentsComplete) {
      navigate(`/payment?year=${taxYear}`);
    }
  };

  const angabenProgress = getAngabenProgress();
  const isDocumentsComplete = isCompleted('documents');
  const canSubmit = allAngabenComplete && isDocumentsComplete;

  /* ── Step number badge ── */
  const StepBadge = ({ step, active, done }: { step: number; active: boolean; done: boolean }) => (
    <div className={cn(
      "shrink-0 rounded-full flex items-center justify-center font-semibold transition-all duration-300",
      active && !done && "w-9 h-9 text-[13px] bg-foreground text-background",
      done && "w-7 h-7 text-[11px] bg-emerald-500/12 text-emerald-700",
      !active && !done && "w-7 h-7 text-[11px] bg-foreground/[0.05] text-muted-foreground/65"
    )}>
      {done ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : step}
    </div>
  );

  // Card variants by hierarchy state
  const activeCard =
    "group rounded-[22px] bg-white overflow-hidden cursor-pointer transition-all duration-300 " +
    "ring-1 ring-black/[0.07] " +
    "shadow-[0_1px_2px_rgba(15,27,61,0.04),0_18px_44px_-12px_rgba(15,27,61,0.12)] " +
    "hover:shadow-[0_2px_4px_rgba(15,27,61,0.05),0_22px_50px_-12px_rgba(15,27,61,0.14)] " +
    "active:scale-[0.997]";
  const completedCard =
    "group rounded-[18px] bg-foreground/[0.025] overflow-hidden cursor-pointer transition-colors duration-200 " +
    "hover:bg-foreground/[0.04]";
  const lockedCard =
    "rounded-[18px] bg-transparent ring-1 ring-foreground/[0.05]";

  // Determine which step is "next"
  const nextStep: 1 | 2 | 3 = !allAngabenComplete ? 1 : !isDocumentsComplete ? 2 : 3;

  // Human-friendly progress summary (3 high-level steps)
  const remainingSteps =
    (allAngabenComplete ? 0 : 1) +
    (isDocumentsComplete ? 0 : 1) +
    (paymentStatus === 'paid' ? 0 : 1);
  const totalSteps = 3;
  const stepsDone = totalSteps - remainingSteps;

  const stepsContent = (
    <div className="space-y-3">
      <DashboardPriorYearBanner taxYear={taxYear} />

      {/* ═══════════ Step 1: Persönliche Angaben ═══════════ */}
      {(() => {
        const isActive = nextStep === 1;
        const done = allAngabenComplete;
        return (
          <div
            data-tour="form-step-1"
            onClick={() => {
              formTour?.skipTour();
              navigate(`/personal-info?year=${taxYear}`);
            }}
            className={done ? completedCard : activeCard}
          >
            <div className={cn(
              "flex items-center gap-3.5",
              done ? "px-4 py-3" : "p-5 sm:p-6"
            )}>
              <StepBadge step={1} active={isActive} done={done} />
              <div className="flex-1 min-w-0">
                <h2 className={cn(
                  "tracking-[-0.012em] leading-tight",
                  done ? "text-[13.5px] font-medium text-foreground/85" : "text-[15.5px] font-semibold text-foreground"
                )}>
                  {t.formDashboard.personalInfo}
                </h2>
                {!done && (
                  <p className="text-[12.5px] text-muted-foreground/85 mt-1 leading-relaxed">
                    {t.formDashboard.tasksCompleted
                      .replace('{completed}', String(angabenProgress.completed))
                      .replace('{total}', String(angabenProgress.total))}
                  </p>
                )}
              </div>
              <ChevronRight className={cn(
                "w-4 h-4 transition-all duration-300 group-hover:translate-x-0.5",
                done ? "text-muted-foreground/30" : "text-muted-foreground/45 group-hover:text-foreground/70"
              )} strokeWidth={1.75} />
            </div>
          </div>
        );
      })()}

      {/* ═══════════ Step 2: Belege & Unterlagen ═══════════ */}
      {allAngabenComplete ? (
        (() => {
          const done = isDocumentsComplete;
          const isActive = nextStep === 2;
          return (
            <div
              data-tour="form-step-2"
              onClick={handleDocumentsClick}
              className={done ? completedCard : activeCard}
            >
              <div className={cn(
                "flex items-center gap-3.5",
                done ? "px-4 py-3" : "p-5 sm:p-6"
              )}>
                <StepBadge step={2} active={isActive} done={done} />
                <div className="flex-1 min-w-0">
                  <h2 className={cn(
                    "tracking-[-0.012em] leading-tight",
                    done ? "text-[13.5px] font-medium text-foreground/85" : "text-[15.5px] font-semibold text-foreground"
                  )}>
                    {t.formDashboard.documentsTitle}
                  </h2>
                  {!done && (
                    <p className="text-[12.5px] text-muted-foreground/85 mt-1 leading-relaxed">
                      {t.formDashboard.uploadDocuments}
                    </p>
                  )}
                </div>
                <ChevronRight className={cn(
                  "w-4 h-4 transition-all duration-300 group-hover:translate-x-0.5",
                  done ? "text-muted-foreground/30" : "text-muted-foreground/45 group-hover:text-foreground/70"
                )} strokeWidth={1.75} />
              </div>
            </div>
          );
        })()
      ) : (
        <div
          data-tour="form-step-2"
          className={cn(lockedCard, "px-4 py-3 flex items-center gap-3.5")}
        >
          <StepBadge step={2} active={false} done={false} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[13.5px] font-medium text-muted-foreground/70 tracking-[-0.008em] leading-tight">{t.formDashboard.documentsTitle}</h2>
          </div>
          <Lock className="w-3 h-3 text-muted-foreground/30" strokeWidth={2} />
        </div>
      )}

      {/* ═══════════ Step 3: Prüfung & Versand ═══════════ */}
      {canSubmit ? (
        <div
          data-tour="form-step-3"
          onClick={handleSubmitClick}
          className={activeCard}
        >
          <div className="p-5 sm:p-6 flex items-center gap-3.5">
            <StepBadge step={3} active done={false} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[15.5px] font-semibold text-foreground tracking-[-0.012em] leading-tight">{t.formDashboard.reviewAndSubmit}</h2>
              <p className="text-[12.5px] text-muted-foreground/85 mt-1 leading-relaxed">{t.formDashboard.completeAndPay}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/45 group-hover:text-foreground/70 group-hover:translate-x-0.5 transition-all duration-300" strokeWidth={1.75} />
          </div>
        </div>
      ) : (
        <div
          data-tour="form-step-3"
          className={cn(lockedCard, "px-4 py-3 flex items-center gap-3.5")}
        >
          <StepBadge step={3} active={false} done={false} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[13.5px] font-medium text-muted-foreground/70 tracking-[-0.008em] leading-tight">{t.formDashboard.reviewAndSubmit}</h2>
          </div>
          <Lock className="w-3 h-3 text-muted-foreground/30" strokeWidth={2} />
        </div>
      )}

      {/* ═══════════ Human-friendly progress line ═══════════ */}
      {remainingSteps > 0 && (
        <div className="mt-5 px-1 text-[12.5px] text-muted-foreground/85 tracking-[-0.005em]">
          {remainingSteps === 1
            ? <>Noch <span className="font-semibold text-foreground/85">1 Schritt</span> bis zur Einreichung</>
            : <><span className="font-semibold text-foreground/85">{stepsDone} von {totalSteps}</span> Schritten abgeschlossen</>}
        </div>
      )}
    </div>
  );

  if (embedded) {
    return <div className="w-full">{stepsContent}</div>;
  }

  return (
    <div className="min-h-screen text-foreground antialiased">
      <SubpageHeader
        title={t.formDashboard.title.replace('{year}', taxYear)}
        onBack={() => navigate('/')}
      />
      <TaxFilerSelector className="max-w-xl mx-auto px-5 sm:px-8 mb-8" />
      <main className="max-w-xl mx-auto px-5 sm:px-8 pb-24">
        {stepsContent}
      </main>
    </div>
  );
};
