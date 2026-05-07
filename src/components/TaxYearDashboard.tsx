import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, Send, LucideIcon, Lock, X } from 'lucide-react';
import tipFolderImg from '@/assets/tip-info.png';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

import { useI18n } from '@/contexts/I18nContext';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useFormTourSafe } from '@/contexts/FormTourContext';
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
      "w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold transition-all duration-300",
      done && "bg-primary/10 text-primary",
      active && !done && "bg-primary text-white shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.4)]",
      !active && !done && "bg-muted text-muted-foreground"
    )}>
      {done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : step}
    </div>
  );

  const stepsContent = (
    <div className="space-y-3">

      {/* ═══════════ Step 1: Persönliche Angaben ═══════════ */}
      <div
        data-tour="form-step-1"
        onClick={() => {
          formTour?.skipTour();
          navigate(`/personal-info?year=${taxYear}`);
        }}
        className="group rounded-[1.5rem] bg-white border border-slate-200/80 overflow-hidden cursor-pointer hover:shadow-lg shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-200"
      >
        <div className="p-5 sm:p-6 flex items-center gap-3.5">
          <StepBadge step={1} active={!allAngabenComplete} done={allAngabenComplete} />
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold text-foreground tracking-tight">{t.formDashboard.personalInfo}</h2>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              {t.formDashboard.tasksCompleted
                .replace('{completed}', String(angabenProgress.completed))
                .replace('{total}', String(angabenProgress.total))}
            </p>
          </div>
          <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
        </div>
      </div>

      {/* ═══════════ Step 2: Belege & Unterlagen ═══════════ */}
      {allAngabenComplete ? (
        <div
          data-tour="form-step-2"
          onClick={handleDocumentsClick}
          className="group rounded-[1.5rem] bg-white border border-slate-200/80 overflow-hidden cursor-pointer hover:shadow-lg shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-200"
        >
          <div className="p-5 sm:p-6 flex items-center gap-3.5">
            <StepBadge step={2} active={!isDocumentsComplete} done={isDocumentsComplete} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-semibold text-foreground tracking-tight">{t.formDashboard.documentsTitle}</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t.formDashboard.uploadDocuments}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
          </div>
        </div>
      ) : (
        <div
          data-tour="form-step-2"
          className="rounded-[1.5rem] border border-white/40 border-dashed p-5 sm:p-6 flex items-center gap-3.5 opacity-50 shadow-none"
        >
          <StepBadge step={2} active={false} done={false} />
          <div>
            <h2 className="font-medium text-muted-foreground text-sm">{t.formDashboard.documentsTitle}</h2>
            <p className="text-muted-foreground/60 mt-0.5 text-xs">{t.formDashboard.completeStep1First}</p>
          </div>
          <Lock className="w-3.5 h-3.5 text-muted-foreground/30 ml-auto" strokeWidth={1.5} />
        </div>
      )}

      {/* ═══════════ Step 3: Prüfung & Versand ═══════════ */}
      {canSubmit ? (
        <div
          data-tour="form-step-3"
          onClick={handleSubmitClick}
          className="group rounded-[1.5rem] bg-white border border-slate-200/80 overflow-hidden cursor-pointer hover:shadow-lg shadow-[0_8px_32px_rgba(0,0,0,0.04)] transition-all duration-200"
        >
          <div className="p-5 sm:p-6 flex items-center gap-3.5">
            <StepBadge step={3} active done={false} />
            <div className="flex-1 min-w-0">
              <h2 className="text-[14px] font-semibold text-foreground tracking-tight">{t.formDashboard.reviewAndSubmit}</h2>
              <p className="text-[12px] text-muted-foreground mt-0.5">{t.formDashboard.completeAndPay}</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
          </div>
        </div>
      ) : (
        <div
          data-tour="form-step-3"
          className="rounded-[1.5rem] border border-white/40 border-dashed p-5 sm:p-6 flex items-center gap-3.5 opacity-50 shadow-none"
        >
          <StepBadge step={3} active={false} done={false} />
          <div>
            <h2 className="font-medium text-muted-foreground text-sm">{t.formDashboard.reviewAndSubmit}</h2>
            <p className="text-muted-foreground/60 mt-0.5 text-xs">{t.formDashboard.completeSteps12First}</p>
          </div>
          <Lock className="w-3.5 h-3.5 text-muted-foreground/30 ml-auto" strokeWidth={1.5} />
        </div>
      )}

      {/* ═══════════ Tipp Card ═══════════ */}
      {!tipDismissed && !allAngabenComplete && (
        <div className="mt-2 rounded-2xl bg-primary/5 border border-primary/15 px-3 py-2.5 flex items-center gap-3 relative">
          <img src={tipFolderImg} alt="" className="w-20 h-20 object-contain flex-shrink-0 -my-2" />
          <div className="flex-1 min-w-0 pr-5">
            <h3 className="font-semibold text-foreground tracking-tight leading-snug text-[13px]">
              Tipp: Starte mit deinen persönlichen Angaben.
            </h3>
            <p className="text-muted-foreground mt-0.5 leading-snug text-[11px]">
              Wir führen dich Schritt für Schritt durch deine Steuererklärung.
            </p>
          </div>
          <button
            onClick={() => {
              setTipDismissed(true);
              localStorage.setItem('dashboard-tip-dismissed', 'true');
            }}
            className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
            aria-label="Schliessen"
          >
            <X className="w-3.5 h-3.5" strokeWidth={1.5} />
          </button>
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
      <TaxFilerSelector className="max-w-xl mx-auto px-4 sm:px-6 mb-6" />
      <main className="max-w-xl mx-auto px-4 sm:px-6 pb-24">
        {stepsContent}
      </main>
    </div>
  );
};
