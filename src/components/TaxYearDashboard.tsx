import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, Send, LucideIcon, Lock } from 'lucide-react';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FormDashboardSkeleton } from '@/components/ui/form-dashboard-skeleton';
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

export const TaxYearDashboard: React.FC = () => {
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

  // Show skeleton while loading
  if (isDataLoading || !isReady || !formDataLoaded) {
    return <FormDashboardSkeleton />;
  }

  const getAngabenProgress = () => {
    const completed = angabenSections.filter(s => isCompleted(s.id)).length;
    return { completed, total: 4, percentage: Math.round(completed / 4 * 100) };
  };

  const handleSectionClick = (section: DashboardSection) => {
    formTour?.skipTour();
    setSearchParams({ section: section.param, year: taxYear });
  };

  const handleDocumentsClick = () => {
    formTour?.skipTour();
    setSearchParams({ section: 'unterlagen', year: taxYear });
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

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <SubpageHeader
        title={t.formDashboard.title.replace('{year}', taxYear)}
        onBack={() => navigate('/')}
      />

      {/* Tax Filer Selector */}
      <TaxFilerSelector className="max-w-lg mx-auto px-4 sm:px-6 mb-6" />

      {/* Steps */}
      <main className="max-w-lg mx-auto px-4 sm:px-6 pb-24">
        <div className="space-y-3">

          {/* ═══════════ Step 1: Persönliche Angaben ═══════════ */}
          {allAngabenComplete && !isAngabenExpanded ? (
            <div
              data-tour="form-step-1"
              onClick={() => setIsAngabenExpanded(true)}
              className="group rounded-2xl bg-card ring-1 ring-border p-5 sm:p-6 flex items-center gap-3.5 cursor-pointer hover:shadow-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200"
            >
              <StepBadge step={1} active={false} done />
              <div className="flex-1 min-w-0">
                <h2 className="text-[14px] font-semibold text-foreground tracking-tight">{t.formDashboard.personalInfo}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t.formDashboard.tasksCompleted.replace('{completed}', '4').replace('{total}', '4')}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" strokeWidth={2} />
            </div>
          ) : (
            <section
              data-tour="form-step-1"
              className="rounded-2xl bg-card ring-1 ring-border overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200"
            >
              {/* Step header */}
              <div
                onClick={() => allAngabenComplete && setIsAngabenExpanded(false)}
                className={cn(
                  "p-5 sm:p-6",
                  allAngabenComplete && "cursor-pointer hover:bg-muted/30"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <StepBadge step={1} active={!allAngabenComplete} done={allAngabenComplete} />
                    <div>
                      <h2 className="text-[14px] font-semibold text-foreground tracking-tight">{t.formDashboard.personalInfo}</h2>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {t.formDashboard.tasksCompleted
                          .replace('{completed}', String(angabenProgress.completed))
                          .replace('{total}', String(angabenProgress.total))}
                      </p>
                    </div>
                  </div>
                  {/* Progress dots */}
                  <div className="flex items-center gap-1">
                    {angabenSections.map((s) => (
                      <div
                        key={s.id}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full transition-colors duration-300",
                          isCompleted(s.id) ? "bg-primary" : "bg-border"
                        )}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Section items */}
              <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-1">
                {angabenSections.map(section => {
                  const Icon = section.icon;
                  const completed = isCompleted(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section)}
                      data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined}
                      className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all duration-150 text-left group/item active:scale-[0.98]"
                    >
                      <div className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200",
                        completed
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground group-hover/item:text-foreground"
                      )}>
                        {completed ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Icon className="w-4 h-4" strokeWidth={1.5} />}
                      </div>
                      <span className="flex-1 text-[13px] font-medium text-foreground tracking-tight">
                        {section.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover/item:text-muted-foreground group-hover/item:translate-x-0.5 transition-all" strokeWidth={1.5} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ═══════════ Step 2: Belege & Unterlagen ═══════════ */}
          {allAngabenComplete ? (
            <div
              data-tour="form-step-2"
              onClick={handleDocumentsClick}
              className="group rounded-2xl bg-card ring-1 ring-border overflow-hidden cursor-pointer hover:shadow-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200"
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
              className="rounded-2xl ring-1 ring-border ring-dashed p-5 sm:p-6 flex items-center gap-3.5 opacity-50 shadow-none"
            >
              <StepBadge step={2} active={false} done={false} />
              <div>
                <h2 className="text-[13px] font-medium text-muted-foreground">{t.formDashboard.documentsTitle}</h2>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{t.formDashboard.completeStep1First}</p>
              </div>
              <Lock className="w-3.5 h-3.5 text-muted-foreground/30 ml-auto" strokeWidth={1.5} />
            </div>
          )}

          {/* ═══════════ Step 3: Prüfung & Versand ═══════════ */}
          {canSubmit ? (
            <div
              data-tour="form-step-3"
              onClick={handleSubmitClick}
              className="group rounded-2xl bg-card ring-1 ring-border overflow-hidden cursor-pointer hover:shadow-lg shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200"
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
              className="rounded-2xl ring-1 ring-border ring-dashed p-5 sm:p-6 flex items-center gap-3.5 opacity-50 shadow-none"
            >
              <StepBadge step={3} active={false} done={false} />
              <div>
                <h2 className="text-[13px] font-medium text-muted-foreground">{t.formDashboard.reviewAndSubmit}</h2>
                <p className="text-[11px] text-muted-foreground/60 mt-0.5">{t.formDashboard.completeSteps12First}</p>
              </div>
              <Lock className="w-3.5 h-3.5 text-muted-foreground/30 ml-auto" strokeWidth={1.5} />
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
