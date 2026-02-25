import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, ArrowLeft, LucideIcon } from 'lucide-react';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { FormDashboardSkeleton } from '@/components/ui/form-dashboard-skeleton';
import { useI18n } from '@/contexts/I18nContext';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
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
  const { profile } = useProfile();
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
    <div className="min-h-screen bg-white text-zinc-900 antialiased">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="max-w-lg mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-white border border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 transition-all"
          >
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <h1 className="text-xl font-medium tracking-tight text-zinc-900">
            {t.formDashboard.title.replace('{year}', taxYear)}
          </h1>

          <button
            onClick={() => navigate('/profile')}
            className="w-10 h-10 rounded-full border border-zinc-200/80 shadow-[0_1px_2px_rgba(0,0,0,0.02)] overflow-hidden bg-white shrink-0 p-0.5"
          >
            <img
              src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'}
              alt="Profil"
              className="w-full h-full object-cover rounded-full"
              onError={(e) => { e.currentTarget.src = '/lovable-uploads/default-avatar.png'; }}
            />
          </button>
        </div>
      </header>

      {/* Tax Filer Selector */}
      <TaxFilerSelector className="max-w-lg mx-auto px-4 sm:px-6 mb-8" />

      {/* Steps */}
      <main className="max-w-lg mx-auto px-4 sm:px-6 pb-24">
        <div className="space-y-5">
          {/* Step 1: Persönliche Angaben */}
          {allAngabenComplete && !isAngabenExpanded ? (
            /* Collapsed completed card */
            <div
              data-tour="form-step-1"
              onClick={() => setIsAngabenExpanded(true)}
              className="group bg-white border border-zinc-200/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] p-6 sm:p-8 flex items-center gap-4 cursor-pointer hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
              <div className="w-10 h-10 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                <Check className="w-5 h-5" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-medium tracking-tight text-zinc-900">
                  {t.formDashboard.personalInfo}
                </h2>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {t.formDashboard.tasksCompleted.replace('{completed}', '4').replace('{total}', '4')}
                </p>
              </div>
              <ChevronDown className="w-5 h-5 text-zinc-300 group-hover:text-zinc-500 transition-colors" strokeWidth={2} />
            </div>
          ) : (
            /* Expanded active card */
            <section
              data-tour="form-step-1"
              className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] overflow-hidden relative"
            >
              {/* Blue accent line */}
              {!allAngabenComplete && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#1d64ff]" />
              )}
              {allAngabenComplete && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
              )}

              {/* Step header */}
              <div
                onClick={() => allAngabenComplete && setIsAngabenExpanded(false)}
                className={`p-6 sm:p-8 pb-6 ${allAngabenComplete ? 'cursor-pointer hover:bg-zinc-50/50' : ''}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-medium text-base ${
                      allAngabenComplete
                        ? 'bg-emerald-500 text-white'
                        : 'bg-[#1d64ff] text-white shadow-sm'
                    }`}>
                      {allAngabenComplete ? <Check className="w-5 h-5" strokeWidth={2.5} /> : '1'}
                    </div>
                    <div>
                      <h2 className="text-lg font-medium tracking-tight text-zinc-900">
                        {t.formDashboard.personalInfo}
                      </h2>
                      <p className="text-sm text-zinc-500 mt-0.5">
                        {t.formDashboard.tasksCompleted
                          .replace('{completed}', String(angabenProgress.completed))
                          .replace('{total}', String(angabenProgress.total))}
                      </p>
                    </div>
                  </div>
                  {/* Progress bar (desktop only) */}
                  <div className="hidden sm:flex w-20 h-1.5 bg-zinc-100 rounded-full overflow-hidden mt-4">
                    <div
                      className="h-full bg-[#1d64ff] rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(angabenProgress.percentage, 5)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Section items */}
              <div className="px-6 sm:px-8 pb-8 space-y-3">
                {angabenSections.map(section => {
                  const Icon = section.icon;
                  const completed = isCompleted(section.id);
                  return (
                    <button
                      key={section.id}
                      onClick={() => handleSectionClick(section)}
                      data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined}
                      className="w-full flex items-center gap-4 p-4 rounded-xl border border-zinc-100 bg-zinc-50/50 hover:bg-white hover:border-zinc-200 hover:shadow-[0_2px_8px_-2px_rgba(0,0,0,0.04)] transition-all duration-200 text-left group/item"
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 ${
                        completed
                          ? 'bg-emerald-500 text-white border border-emerald-500'
                          : 'bg-white border border-zinc-200/60 shadow-sm text-zinc-400 group-hover/item:text-zinc-900 group-hover/item:border-zinc-300'
                      }`}>
                        {completed ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Icon className="w-5 h-5" />}
                      </div>
                      <span className={`flex-1 text-sm font-medium transition-colors ${
                        completed ? 'text-zinc-500' : 'text-zinc-700 group-hover/item:text-zinc-900'
                      }`}>
                        {section.title}
                      </span>
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-transparent group-hover/item:bg-zinc-50 transition-colors">
                        <ChevronRight className="w-4 h-4 text-zinc-300 group-hover/item:text-zinc-600 transition-transform group-hover/item:translate-x-0.5" />
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Step 2: Belege & Unterlagen (inactive/active) */}
          {allAngabenComplete ? (
            <div
              data-tour="form-step-2"
              onClick={handleDocumentsClick}
              className={`bg-white border rounded-2xl overflow-hidden relative cursor-pointer transition-all ${
                isDocumentsComplete
                  ? 'border-zinc-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]'
                  : 'border-zinc-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)]'
              }`}
            >
              {!isDocumentsComplete && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#1d64ff]" />
              )}
              {isDocumentsComplete && (
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-emerald-500" />
              )}
              <div className="p-6 flex items-center gap-4">
                <div className={`w-10 h-10 shrink-0 rounded-full flex items-center justify-center font-medium text-base ${
                  isDocumentsComplete
                    ? 'bg-emerald-500 text-white'
                    : 'bg-[#1d64ff] text-white shadow-sm'
                }`}>
                  {isDocumentsComplete ? <Check className="w-5 h-5" strokeWidth={2.5} /> : '2'}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-medium tracking-tight text-zinc-900">
                    {t.formDashboard.documentsTitle}
                  </h2>
                  <p className={`text-sm mt-0.5 ${isDocumentsComplete ? 'text-zinc-500' : 'text-[#1d64ff] font-medium'}`}>
                    {isDocumentsComplete ? t.formDashboard.uploadDocuments : t.formDashboard.uploadDocuments}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-300 group-hover:text-zinc-600" />
              </div>
            </div>
          ) : (
            /* Inactive dashed step */
            <div
              data-tour="form-step-2"
              className="bg-transparent border border-dashed border-zinc-200/80 rounded-2xl p-6 flex items-center gap-4 hover:bg-zinc-100/50 transition-colors duration-300"
            >
              <div className="w-10 h-10 shrink-0 rounded-full bg-zinc-100/80 border border-zinc-200/60 flex items-center justify-center text-zinc-400 font-medium text-base">
                2
              </div>
              <div>
                <h2 className="text-base font-medium tracking-tight text-zinc-500">
                  {t.formDashboard.documentsTitle}
                </h2>
                <p className="text-sm text-zinc-400 mt-0.5">
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
              className="bg-white border border-zinc-200/80 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.04)] overflow-hidden relative cursor-pointer hover:shadow-[0_8px_20px_rgba(0,0,0,0.06)] transition-all"
            >
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#1d64ff]" />
              <div className="p-6 flex items-center gap-4">
                <div className="w-10 h-10 shrink-0 rounded-full bg-[#1d64ff] text-white shadow-sm flex items-center justify-center font-medium text-base">
                  3
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-medium tracking-tight text-zinc-900">
                    {t.formDashboard.reviewAndSubmit}
                  </h2>
                  <p className="text-sm text-[#1d64ff] font-medium mt-0.5">
                    {t.formDashboard.completeAndPay}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-zinc-300" />
              </div>
            </div>
          ) : (
            /* Inactive dashed step */
            <div
              data-tour="form-step-3"
              className="bg-transparent border border-dashed border-zinc-200/80 rounded-2xl p-6 flex items-center gap-4 hover:bg-zinc-100/50 transition-colors duration-300"
            >
              <div className="w-10 h-10 shrink-0 rounded-full bg-zinc-100/80 border border-zinc-200/60 flex items-center justify-center text-zinc-400 font-medium text-base">
                3
              </div>
              <div>
                <h2 className="text-base font-medium tracking-tight text-zinc-500">
                  {t.formDashboard.reviewAndSubmit}
                </h2>
                <p className="text-sm text-zinc-400 mt-0.5">
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
