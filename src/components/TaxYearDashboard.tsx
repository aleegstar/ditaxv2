import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, LucideIcon } from 'lucide-react';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { FormDashboardSkeleton } from '@/components/ui/form-dashboard-skeleton';
import { useI18n } from '@/contexts/I18nContext';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useFormTourSafe } from '@/contexts/FormTourContext';

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

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Header */}
      <SubpageHeader
        title={t.formDashboard.title.replace('{year}', taxYear)}
        onBack={() => navigate('/')}
      />

      {/* Tax Filer Selector */}
      <TaxFilerSelector className="max-w-lg mx-auto px-4 sm:px-6 mb-8" />

      {/* Steps */}
      <main className="max-w-lg mx-auto px-4 sm:px-6 pb-24">
        <div className="space-y-4">
          {/* Step 1: Persönliche Angaben */}
          {allAngabenComplete && !isAngabenExpanded ? (
            /* Collapsed completed card */
            <div
              data-tour="form-step-1"
              onClick={() => setIsAngabenExpanded(true)}
              className="group border border-border/60 rounded-2xl bg-background p-5 sm:p-6 flex items-center gap-4 cursor-pointer hover:bg-muted/20 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-foreground/20" />
              <div className="w-9 h-9 shrink-0 rounded-full bg-foreground/[0.07] flex items-center justify-center text-foreground">
                <Check className="w-4 h-4" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-medium tracking-tight text-foreground">
                  {t.formDashboard.personalInfo}
                </h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t.formDashboard.tasksCompleted.replace('{completed}', '4').replace('{total}', '4')}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" strokeWidth={2} />
            </div>
          ) : (
            /* Expanded active card */
            <section
              data-tour="form-step-1"
              className="border border-border/60 rounded-2xl bg-background overflow-hidden relative"
            >
              {/* Accent line */}
              <div className={`absolute top-0 left-0 right-0 h-[2px] ${
                allAngabenComplete ? 'bg-foreground/20' : 'bg-foreground'
              }`} />

              {/* Step header */}
              <div
                onClick={() => allAngabenComplete && setIsAngabenExpanded(false)}
                className={`p-5 sm:p-6 pb-5 ${allAngabenComplete ? 'cursor-pointer hover:bg-muted/20' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[13px] font-semibold ${
                      allAngabenComplete
                        ? 'bg-foreground/[0.07] text-foreground'
                        : 'bg-foreground text-background'
                    }`}>
                      {allAngabenComplete ? <Check className="w-4 h-4" strokeWidth={2.5} /> : '1'}
                    </div>
                    <div>
                      <h2 className="text-[15px] font-medium tracking-tight text-foreground">
                        {t.formDashboard.personalInfo}
                      </h2>
                      <p className="text-[12px] text-muted-foreground mt-0.5">
                        {t.formDashboard.tasksCompleted
                          .replace('{completed}', String(angabenProgress.completed))
                          .replace('{total}', String(angabenProgress.total))}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="hidden sm:flex w-16 h-1 bg-muted rounded-full overflow-hidden mt-3">
                    <div
                      className="h-full bg-foreground/40 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(angabenProgress.percentage, 5)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Section items */}
              <div className="px-5 sm:px-6 pb-6 space-y-2">
                {angabenSections.map(section => {
                  const Icon = section.icon;
                  const completed = isCompleted(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section)}
                      data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined}
                      className="w-full flex items-center gap-3.5 p-3.5 rounded-xl border border-border/40 bg-muted/20 hover:bg-muted/40 hover:border-border/60 transition-all duration-200 text-left group/item"
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        completed
                          ? 'bg-foreground/[0.07] text-foreground border border-border/40'
                          : 'bg-background border border-border/60 text-muted-foreground group-hover/item:text-foreground'
                      }`}>
                        {completed ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`flex-1 text-[13px] font-medium transition-colors ${
                        completed ? 'text-muted-foreground' : 'text-foreground'
                      }`}>
                        {section.title}
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover/item:text-muted-foreground transition-all group-hover/item:translate-x-0.5" />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 2: Belege & Unterlagen */}
          {allAngabenComplete ? (
            <div
              data-tour="form-step-2"
              onClick={handleDocumentsClick}
              className="border border-border/60 rounded-2xl bg-background overflow-hidden relative cursor-pointer hover:bg-muted/20 transition-all"
            >
              <div className={`absolute top-0 left-0 right-0 h-[2px] ${
                isDocumentsComplete ? 'bg-foreground/20' : 'bg-foreground'
              }`} />
              <div className="p-5 sm:p-6 flex items-center gap-3.5">
                <div className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center text-[13px] font-semibold ${
                  isDocumentsComplete
                    ? 'bg-foreground/[0.07] text-foreground'
                    : 'bg-foreground text-background'
                }`}>
                  {isDocumentsComplete ? <Check className="w-4 h-4" strokeWidth={2.5} /> : '2'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-medium tracking-tight text-foreground">
                    {t.formDashboard.documentsTitle}
                  </h2>
                  <p className={`text-[12px] mt-0.5 ${isDocumentsComplete ? 'text-muted-foreground' : 'text-foreground/70 font-medium'}`}>
                    {t.formDashboard.uploadDocuments}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          ) : (
            /* Inactive dashed step */
            <div
              data-tour="form-step-2"
              className="border border-dashed border-border/60 rounded-2xl p-5 sm:p-6 flex items-center gap-3.5 transition-colors duration-300"
            >
              <div className="w-9 h-9 shrink-0 rounded-full bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/60 font-medium text-[13px]">
                2
              </div>
              <div>
                <h2 className="text-[14px] font-medium tracking-tight text-muted-foreground">
                  {t.formDashboard.documentsTitle}
                </h2>
                <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                  {t.formDashboard.completeStep1First}
                </p>
              </div>
            </div>
          )}

          {/* Step 3: Prüfung & Versand */}
          {canSubmit ? (
            <div
              data-tour="form-step-3"
              onClick={handleSubmitClick}
              className="border border-border/60 rounded-2xl bg-background overflow-hidden relative cursor-pointer hover:bg-muted/20 transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-foreground" />
              <div className="p-5 sm:p-6 flex items-center gap-3.5">
                <div className="w-9 h-9 shrink-0 rounded-full bg-foreground text-background flex items-center justify-center font-semibold text-[13px]">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-medium tracking-tight text-foreground">
                    {t.formDashboard.reviewAndSubmit}
                  </h2>
                  <p className="text-[12px] text-foreground/70 font-medium mt-0.5">
                    {t.formDashboard.completeAndPay}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </div>
            </div>
          ) : (
            /* Inactive dashed step */
            <div
              data-tour="form-step-3"
              className="border border-dashed border-border/60 rounded-2xl p-5 sm:p-6 flex items-center gap-3.5 transition-colors duration-300"
            >
              <div className="w-9 h-9 shrink-0 rounded-full bg-muted/50 border border-border/40 flex items-center justify-center text-muted-foreground/60 font-medium text-[13px]">
                3
              </div>
              <div>
                <h2 className="text-[14px] font-medium tracking-tight text-muted-foreground">
                  {t.formDashboard.reviewAndSubmit}
                </h2>
                <p className="text-[12px] text-muted-foreground/60 mt-0.5">
                  {t.formDashboard.completeSteps12First}
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
