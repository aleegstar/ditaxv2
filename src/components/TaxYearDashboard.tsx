import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, LucideIcon, Lock } from 'lucide-react';
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

  /* ── Check circle (screenshot 1 style) ── */
  const CheckCircle = ({ done }: { done: boolean }) => (
    <div className={cn(
      "w-6 h-6 shrink-0 rounded-full flex items-center justify-center transition-all duration-300 border-[1.5px]",
      done
        ? "bg-primary border-primary text-white"
        : "border-border bg-transparent"
    )}>
      {done && <Check className="w-3 h-3" strokeWidth={3} />}
    </div>
  );

  return (
    <div className="min-h-screen text-foreground antialiased">
      {/* Header */}
      <SubpageHeader
        title={t.formDashboard.title.replace('{year}', taxYear)}
        onBack={() => navigate('/')}
      />

      {/* Tax Filer Selector */}
      <TaxFilerSelector className="max-w-xl mx-auto px-4 sm:px-6 mb-6" />

      {/* Steps */}
      <main className="max-w-xl mx-auto px-4 sm:px-6 pb-24">
        <div className="space-y-3">

          {/* ═══════════ Step 1: Persönliche Angaben ═══════════ */}
          {allAngabenComplete && !isAngabenExpanded ? (
            <div
              data-tour="form-step-1"
              onClick={() => setIsAngabenExpanded(true)}
              className="group rounded-2xl bg-white border border-border/40 p-5 flex items-center gap-3.5 cursor-pointer transition-all duration-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <CheckCircle done />
              <div className="flex-1 min-w-0">
                <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{t.formDashboard.personalInfo}</h2>
                <p className="text-[12px] text-muted-foreground mt-0.5">
                  {t.formDashboard.tasksCompleted.replace('{completed}', '4').replace('{total}', '4')}
                </p>
              </div>
              <ChevronDown className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" strokeWidth={2} />
            </div>
          ) : (
            <section
              data-tour="form-step-1"
              className="rounded-2xl bg-white border border-border/40 overflow-hidden transition-all duration-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
            >
              {/* Step header */}
              <div
                onClick={() => allAngabenComplete && setIsAngabenExpanded(false)}
                className={cn(
                  "px-5 pt-5 pb-3",
                  allAngabenComplete && "cursor-pointer"
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle done={allAngabenComplete} />
                    <div>
                      <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{t.formDashboard.personalInfo}</h2>
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
              <div className="px-3 pb-3">
                {angabenSections.map((section, idx) => {
                  const completed = isCompleted(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section)}
                      data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined}
                      className={cn(
                        "w-full flex items-center gap-3 px-3 py-3.5 text-left group/item active:scale-[0.99] transition-all duration-150",
                        idx < angabenSections.length - 1 && "border-b border-border/30"
                      )}
                    >
                      <CheckCircle done={completed} />
                      <span className="flex-1 text-[14px] font-medium text-foreground tracking-tight">
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
              className="group rounded-2xl bg-white border border-border/40 overflow-hidden cursor-pointer transition-all duration-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <div className="p-5 flex items-center gap-3.5">
                <CheckCircle done={isDocumentsComplete} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{t.formDashboard.documentsTitle}</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{t.formDashboard.uploadDocuments}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
              </div>
            </div>
          ) : (
            <div
              data-tour="form-step-2"
              className="rounded-2xl border border-border/40 border-dashed p-5 flex items-center gap-3.5 opacity-40"
            >
              <CheckCircle done={false} />
              <div>
                <h2 className="text-[14px] font-medium text-muted-foreground">{t.formDashboard.documentsTitle}</h2>
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
              className="group rounded-2xl bg-white border border-border/40 overflow-hidden cursor-pointer transition-all duration-200"
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)' }}
            >
              <div className="p-5 flex items-center gap-3.5">
                <CheckCircle done={false} />
                <div className="flex-1 min-w-0">
                  <h2 className="text-[15px] font-semibold text-foreground tracking-tight">{t.formDashboard.reviewAndSubmit}</h2>
                  <p className="text-[12px] text-muted-foreground mt-0.5">{t.formDashboard.completeAndPay}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/30 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" strokeWidth={1.5} />
              </div>
            </div>
          ) : (
            <div
              data-tour="form-step-3"
              className="rounded-2xl border border-border/40 border-dashed p-5 flex items-center gap-3.5 opacity-40"
            >
              <CheckCircle done={false} />
              <div>
                <h2 className="text-[14px] font-medium text-muted-foreground">{t.formDashboard.reviewAndSubmit}</h2>
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