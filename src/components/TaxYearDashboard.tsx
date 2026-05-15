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
      "w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[13px] font-medium transition-all duration-300",
      done && "bg-primary/8 text-primary",
      active && !done && "bg-primary text-primary-foreground",
      !active && !done && "bg-foreground/[0.04] text-muted-foreground"
    )}>
      {done ? <Check className="w-4 h-4" strokeWidth={2.25} /> : step}
    </div>
  );

  // Shared premium card classes
  const cardBase =
    "group rounded-2xl bg-white overflow-hidden cursor-pointer transition-all duration-300 " +
    "border border-[rgba(20,20,20,0.06)] " +
    "shadow-[0_1px_2px_rgba(0,0,0,0.02),0_8px_24px_rgba(0,0,0,0.03)] " +
    "hover:border-[rgba(20,20,20,0.09)] hover:shadow-[0_2px_4px_rgba(0,0,0,0.03),0_12px_32px_rgba(0,0,0,0.05)] " +
    "active:scale-[0.997]";
  const cardLockedBase =
    "rounded-2xl border border-dashed border-[rgba(20,20,20,0.08)] bg-transparent";

  const stepsContent = (
    <div className="space-y-3.5">

      {/* ═══════════ Step 1: Persönliche Angaben ═══════════ */}
      <div
        data-tour="form-step-1"
        onClick={() => {
          formTour?.skipTour();
          navigate(`/personal-info?year=${taxYear}`);
        }}
        className={cardBase}
      >
        <div className="p-6 sm:p-7 flex items-center gap-4">
          <StepBadge step={1} active={!allAngabenComplete} done={allAngabenComplete} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-foreground tracking-tight leading-tight">{t.formDashboard.personalInfo}</h2>
            <p className="text-[13px] text-muted-foreground/80 mt-1 leading-relaxed">
              {t.formDashboard.tasksCompleted
                .replace('{completed}', String(angabenProgress.completed))
                .replace('{total}', String(angabenProgress.total))}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5 transition-all duration-300" strokeWidth={1.75} />
        </div>
      </div>

      {/* ═══════════ Step 2: Belege & Unterlagen ═══════════ */}
      {allAngabenComplete ? (
        <div
          data-tour="form-step-2"
          onClick={handleDocumentsClick}
          className={cardBase}
        >
          <div className="p-6 sm:p-7 flex items-center gap-4">
            <StepBadge step={2} active={!isDocumentsComplete} done={isDocumentsComplete} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground tracking-tight leading-tight">{t.formDashboard.documentsTitle}</h2>
              <p className="text-[13px] text-muted-foreground/80 mt-1 leading-relaxed">{t.formDashboard.uploadDocuments}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5 transition-all duration-300" strokeWidth={1.75} />
          </div>
        </div>
      ) : (
        <div
          data-tour="form-step-2"
          className={cn(cardLockedBase, "p-6 sm:p-7 flex items-center gap-4")}
        >
          <StepBadge step={2} active={false} done={false} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-medium text-muted-foreground/80 tracking-tight leading-tight">{t.formDashboard.documentsTitle}</h2>
            <p className="text-[13px] text-muted-foreground/55 mt-1 leading-relaxed">{t.formDashboard.completeStep1First}</p>
          </div>
          <Lock className="w-3.5 h-3.5 text-muted-foreground/30" strokeWidth={1.75} />
        </div>
      )}

      {/* ═══════════ Step 3: Prüfung & Versand ═══════════ */}
      {canSubmit ? (
        <div
          data-tour="form-step-3"
          onClick={handleSubmitClick}
          className={cardBase}
        >
          <div className="p-6 sm:p-7 flex items-center gap-4">
            <StepBadge step={3} active done={false} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[15px] font-semibold text-foreground tracking-tight leading-tight">{t.formDashboard.reviewAndSubmit}</h2>
              <p className="text-[13px] text-muted-foreground/80 mt-1 leading-relaxed">{t.formDashboard.completeAndPay}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground/70 group-hover:translate-x-0.5 transition-all duration-300" strokeWidth={1.75} />
          </div>
        </div>
      ) : (
        <div
          data-tour="form-step-3"
          className={cn(cardLockedBase, "p-6 sm:p-7 flex items-center gap-4")}
        >
          <StepBadge step={3} active={false} done={false} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-medium text-muted-foreground/80 tracking-tight leading-tight">{t.formDashboard.reviewAndSubmit}</h2>
            <p className="text-[13px] text-muted-foreground/55 mt-1 leading-relaxed">{t.formDashboard.completeSteps12First}</p>
          </div>
          <Lock className="w-3.5 h-3.5 text-muted-foreground/30" strokeWidth={1.75} />
        </div>
      )}

      {/* ═══════════ Tipp Card mit Fortschritt ═══════════ */}
      {(!allAngabenComplete || !isDocumentsComplete) && (() => {
        const totalTasks = 6;
        const completedTasks =
          angabenSections.filter(s => isCompleted(s.id)).length +
          (isDocumentsComplete ? 1 : 0) +
          (paymentStatus === 'paid' ? 1 : 0);
        const percent = Math.round((completedTasks / totalTasks) * 100);
        return (
          <div className="mt-5 rounded-2xl bg-primary/[0.04] border border-primary/10 px-5 py-5 flex items-center gap-5">
            <div className="relative flex-shrink-0">
              <AnimatedCircularProgressBar
                max={100}
                min={0}
                value={percent}
                gaugePrimaryColor="hsl(var(--primary))"
                gaugeSecondaryColor="hsl(var(--primary) / 0.10)"
                className="size-14 text-[11px] font-semibold text-primary"
              />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground tracking-tight leading-snug text-[14px]">
                {!allAngabenComplete ? 'Persönliche Angaben' : 'Belege & Unterlagen'}
              </h3>
              <p className="text-muted-foreground/80 mt-1 leading-relaxed text-[12.5px]">
                {!allAngabenComplete
                  ? 'Beginne mit deinen persönlichen Angaben. Wir führen dich Schritt für Schritt durch deine Steuererklärung.'
                  : 'Lade jetzt deine Belege und Unterlagen hoch, damit wir deine Steuererklärung fertigstellen können.'}
              </p>
            </div>
            <img
              src={documentsMessageImg}
              alt=""
              aria-hidden="true"
              className="flex-shrink-0 w-20 h-20 object-contain select-none pointer-events-none"
            />
          </div>
        );
      })()}
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
