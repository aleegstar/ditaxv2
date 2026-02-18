import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, BookOpen, UploadCloud, Send, LucideIcon, ArrowLeft } from 'lucide-react';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { FormDashboardSkeleton } from '@/components/ui/form-dashboard-skeleton';
import { useI18n } from '@/contexts/I18nContext';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
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
  const {
    profile
  } = useProfile();
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [isReady, setIsReady] = useState(false);
  const [isAngabenExpanded, setIsAngabenExpanded] = useState(true);

  const { activeTaxFilerId } = useTaxFiler();

  // Load payment status
  useEffect(() => {
    const loadPaymentStatus = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user || !taxYear || !activeTaxFilerId) return;
      const {
        data
      } = await supabase.from('tax_returns').select('payment_status').eq('user_id', user.id).eq('tax_year', taxYear).eq('tax_filer_id', activeTaxFilerId).maybeSingle();
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

  // Calculate allAngabenComplete early for useEffect
  const angabenSectionsEarly: DashboardSection[] = [{
    id: 'contact',
    title: t.formDashboard.contactInfo,
    icon: User,
    param: 'kontakt'
  }, {
    id: 'deductions',
    title: t.formDashboard.deductions,
    icon: Shield,
    param: 'abzuege'
  }, {
    id: 'income',
    title: t.formDashboard.income,
    icon: Wallet,
    param: 'einkommen'
  }, {
    id: 'assets',
    title: t.formDashboard.assets,
    icon: Landmark,
    param: 'vermoegen'
  }];

  const isCompletedEarly = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'contact':
        return formProgress.contactInfo || false;
      case 'income':
        return formProgress.income || false;
      case 'deductions':
        return formProgress.deductions || false;
      case 'assets':
        return formProgress.assets || false;
      default:
        return false;
    }
  };

  const allAngabenCompleteEarly = angabenSectionsEarly.every(s => isCompletedEarly(s.id));

  // Auto-collapse when all angaben are complete (must be before early return)
  useEffect(() => {
    if (allAngabenCompleteEarly) {
      setIsAngabenExpanded(false);
    }
  }, [allAngabenCompleteEarly]);

  // Show skeleton while loading
  if (isDataLoading || !isReady || !formDataLoaded) {
    return <FormDashboardSkeleton />;
  }
  const angabenSections: DashboardSection[] = [{
    id: 'contact',
    title: t.formDashboard.contactInfo,
    icon: User,
    param: 'kontakt'
  }, {
    id: 'deductions',
    title: t.formDashboard.deductions,
    icon: Shield,
    param: 'abzuege'
  }, {
    id: 'income',
    title: t.formDashboard.income,
    icon: Wallet,
    param: 'einkommen'
  }, {
    id: 'assets',
    title: t.formDashboard.assets,
    icon: Landmark,
    param: 'vermoegen'
  }];
  const isCompleted = (sectionId: string): boolean => {
    switch (sectionId) {
      case 'contact':
        return formProgress.contactInfo || false;
      case 'income':
        return formProgress.income || false;
      case 'deductions':
        return formProgress.deductions || false;
      case 'assets':
        return formProgress.assets || false;
      case 'documents':
        return formProgress.documents || false;
      case 'submit':
        return formProgress.contactInfo && formProgress.income && formProgress.deductions && formProgress.assets && formProgress.documents && paymentStatus === 'paid' || false;
      default:
        return false;
    }
  };
  const getAngabenProgress = (): {
    completed: number;
    total: number;
    percentage: number;
  } => {
    const completed = angabenSections.filter(s => isCompleted(s.id)).length;
    return {
      completed,
      total: 4,
      percentage: Math.round(completed / 4 * 100)
    };
  };
  const handleSectionClick = (section: DashboardSection) => {
    setSearchParams({
      section: section.param,
      year: taxYear
    });
  };
  const handleDocumentsClick = () => {
    setSearchParams({
      section: 'unterlagen',
      year: taxYear
    });
  };
  const handleSubmitClick = () => {
    const allAngabenComplete = angabenSections.every(s => isCompleted(s.id));
    const documentsComplete = isCompleted('documents');
    if (allAngabenComplete && documentsComplete) {
      navigate(`/payment?year=${taxYear}`);
    }
  };
  const angabenProgress = getAngabenProgress();
  const isDocumentsComplete = isCompleted('documents');
  const allAngabenComplete = angabenSections.every(s => isCompleted(s.id));
  const canSubmit = allAngabenComplete && isDocumentsComplete;
  return <div className="text-slate-900 antialiased min-h-screen bg-white">
      {/* Unified Header - Mobile & Desktop */}
      <header className="sticky top-0 z-30 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between relative">
          <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" strokeWidth={1.5} />
          </button>

          <h1 className="text-lg font-semibold tracking-tight text-slate-900 absolute left-1/2 -translate-x-1/2">
            {t.formDashboard.title.replace('{year}', taxYear)}
          </h1>

          <button onClick={() => navigate('/profile')} className="w-10 h-10 rounded-full bg-slate-200 ring-2 ring-white shadow-sm overflow-hidden shrink-0 hover:ring-blue-100 transition-all">
            <img 
              src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} 
              alt="Profil" 
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/lovable-uploads/default-avatar.png';
              }}
            />
          </button>
        </div>
      </header>

      {/* Tax Filer Selector - only show if more than one person */}
      <TaxFilerSelector className="max-w-4xl mx-auto px-4 sm:px-6 mb-4" />

      {/* Main Content / Timeline */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 pt-4">
        {/* Step 1: Persönliche Angaben - Collapsible when complete */}
        {allAngabenComplete && !isAngabenExpanded ? (
          /* Collapsed Completed Card */
          <div 
            data-tour="form-step-1" 
            onClick={() => setIsAngabenExpanded(true)}
            className="group bg-white rounded-[1.5rem] border border-slate-200/80 p-6 sm:p-8 flex items-center gap-6 sm:gap-8 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] transition-all cursor-pointer"
          >
            <div className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-full bg-emerald-500 flex items-center justify-center text-white shadow-sm shadow-emerald-100">
              <Check className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-[1.1rem] sm:text-[1.15rem] font-semibold text-slate-800 tracking-tight">
                {t.formDashboard.personalInfo}
              </h2>
              <p className="text-slate-500 text-sm sm:text-[0.95rem] mt-1 font-normal leading-relaxed">
                {t.formDashboard.tasksCompleted
                  .replace('{completed}', '4')
                  .replace('{total}', '4')}
              </p>
            </div>
            <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-slate-500 transition-colors" strokeWidth={2} />
          </div>
        ) : (
          /* Expanded Card View */
          <section data-tour="form-step-1" className={`rounded-[1.5rem] overflow-hidden transition-all duration-200 ${
            allAngabenComplete 
              ? 'bg-white border border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.02)]' 
              : 'bg-white border border-blue-100 shadow-[0_4px_20px_rgba(37,99,235,0.06)]'
          }`}>
            {/* Step Header */}
            <div 
              onClick={() => allAngabenComplete && setIsAngabenExpanded(false)}
              className={`p-6 sm:p-8 flex items-center gap-6 sm:gap-8 ${allAngabenComplete ? 'cursor-pointer hover:bg-slate-50/50' : ''} border-b border-slate-100/80`}
            >
              <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center font-medium shrink-0 ${
                allAngabenComplete 
                  ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-100' 
                  : 'bg-blue-600 text-white shadow-lg shadow-blue-200'
              }`}>
                {allAngabenComplete ? <Check className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} /> : <span className="text-lg sm:text-xl">1</span>}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className={`text-[1.1rem] sm:text-[1.15rem] font-semibold tracking-tight ${allAngabenComplete ? 'text-slate-800' : 'text-slate-900'}`}>
                  {t.formDashboard.personalInfo}
                </h2>
                {!allAngabenComplete && (
                  <p className="text-blue-600 text-sm sm:text-[0.95rem] mt-1 font-medium leading-relaxed">
                    {t.formDashboard.tasksCompleted
                      .replace('{completed}', String(angabenProgress.completed))
                      .replace('{total}', String(angabenProgress.total))}
                  </p>
                )}
              </div>
              {allAngabenComplete && (
                <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 rotate-180" strokeWidth={2} />
              )}
            </div>

            {/* Action Grid */}
            <div className="px-5 sm:px-7 pb-5 sm:pb-7 pt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {angabenSections.map(section => {
                  const Icon = section.icon;
                  const completed = isCompleted(section.id);
                  return (
                    <button 
                      key={section.id} 
                      onClick={() => handleSectionClick(section)} 
                      data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined} 
                      className={`group flex items-center gap-3 p-3 text-left rounded-xl transition-all duration-150 ${
                        completed 
                          ? 'bg-slate-50/80 hover:bg-slate-100 cursor-pointer' 
                          : 'bg-white border border-slate-200 cursor-pointer hover:border-blue-300 hover:shadow-md hover:shadow-blue-500/5 active:scale-[0.98]'
                      }`}
                    >
                      <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-150 ${
                        completed 
                          ? 'bg-emerald-500 text-white' 
                          : 'bg-slate-100 text-slate-500 group-hover:bg-blue-600 group-hover:text-white group-hover:scale-105'
                      }`}>
                        {completed ? <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> : <Icon className="w-4 h-4" />}
                      </div>
                      <span className={`flex-1 text-sm font-medium transition-colors ${completed ? 'text-slate-500' : 'text-slate-700 group-hover:text-slate-900'}`}>
                        {section.title}
                      </span>
                      <ChevronRight className={`w-4 h-4 transition-all duration-150 ${completed ? 'text-slate-300' : 'text-slate-400 group-hover:text-blue-500 group-hover:translate-x-0.5'}`} />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Following Steps */}
        <div className="mt-5 flex flex-col gap-5">
          {/* Step 2: Belege & Unterlagen */}
          <div 
            data-tour="form-step-2" 
            onClick={() => allAngabenComplete && handleDocumentsClick()} 
            className={`group bg-white rounded-[1.5rem] border p-6 sm:p-8 flex items-center gap-6 sm:gap-8 transition-all ${
              isDocumentsComplete
                ? 'border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] cursor-pointer'
                : allAngabenComplete && !isDocumentsComplete 
                  ? 'border-blue-100 shadow-[0_4px_20px_rgba(37,99,235,0.06)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.1)] cursor-pointer' 
                  : 'border-slate-100 opacity-60 hover:opacity-90 cursor-not-allowed'
            }`}
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 ${
              isDocumentsComplete 
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-100' 
                : allAngabenComplete 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              {isDocumentsComplete ? <Check className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} /> : <span className="text-lg sm:text-xl font-medium">2</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-[1.1rem] sm:text-[1.15rem] font-semibold tracking-tight ${
                isDocumentsComplete 
                  ? 'text-slate-800' 
                  : allAngabenComplete 
                    ? 'text-slate-900' 
                    : 'text-slate-700'
              }`}>
                {t.formDashboard.documentsTitle}
              </h3>
              {allAngabenComplete && !isDocumentsComplete && (
                <p className="text-blue-600 text-sm sm:text-[0.95rem] mt-1 font-medium leading-relaxed">{t.formDashboard.uploadDocuments}</p>
              )}
              {isDocumentsComplete && (
                <p className="text-slate-500 text-sm sm:text-[0.95rem] mt-1 font-normal leading-relaxed">{t.formDashboard.uploadDocuments}</p>
              )}
              {!allAngabenComplete && (
                <p className="text-slate-400 text-sm sm:text-[0.95rem] mt-1 font-normal leading-relaxed">{t.formDashboard.completeStep1First}</p>
              )}
            </div>
            {isDocumentsComplete && (
              <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-slate-500 transition-colors" strokeWidth={2} />
            )}
            {allAngabenComplete && !isDocumentsComplete && (
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-blue-600 transition-colors" strokeWidth={2} />
            )}
          </div>

          {/* Step 3: Prüfung & Versand */}
          <div 
            data-tour="form-step-3" 
            onClick={() => canSubmit && handleSubmitClick()} 
            className={`group bg-white rounded-[1.5rem] border p-6 sm:p-8 flex items-center gap-6 sm:gap-8 transition-all ${
              isCompleted('submit')
                ? 'border-slate-200/80 shadow-[0_2px_4px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_20px_rgba(0,0,0,0.04)] cursor-pointer'
                : canSubmit && !isCompleted('submit')
                  ? 'border-blue-100 shadow-[0_4px_20px_rgba(37,99,235,0.06)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.1)] cursor-pointer'
                  : 'border-slate-100 opacity-60 hover:opacity-90 cursor-not-allowed'
            }`}
          >
            <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center shrink-0 ${
              isCompleted('submit') 
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-100' 
                : canSubmit 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' 
                  : 'bg-slate-100 text-slate-400 border border-slate-200'
            }`}>
              {isCompleted('submit') ? <Check className="w-6 h-6 sm:w-7 sm:h-7" strokeWidth={2.5} /> : <span className="text-lg sm:text-xl font-medium">3</span>}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`text-[1.1rem] sm:text-[1.15rem] font-semibold tracking-tight ${
                isCompleted('submit') 
                  ? 'text-slate-800' 
                  : canSubmit 
                    ? 'text-slate-900' 
                    : 'text-slate-700'
              }`}>
                {t.formDashboard.reviewAndSubmit}
              </h3>
              {canSubmit && !isCompleted('submit') && (
                <p className="text-blue-600 text-sm sm:text-[0.95rem] mt-1 font-medium leading-relaxed">{t.formDashboard.completeAndPay}</p>
              )}
              {!canSubmit && (
                <p className="text-slate-400 text-sm sm:text-[0.95rem] mt-1 font-normal leading-relaxed">{t.formDashboard.completeSteps12First}</p>
              )}
            </div>
            {canSubmit && !isCompleted('submit') && (
              <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300 group-hover:text-blue-600 transition-colors" strokeWidth={2} />
            )}
          </div>
        </div>
      </main>
    </div>;
};