import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, BookOpen, UploadCloud, Send, LucideIcon, ArrowLeft } from 'lucide-react';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { FormDashboardSkeleton } from '@/components/ui/form-dashboard-skeleton';

interface DashboardSection {
  id: string;
  title: string;
  icon: LucideIcon;
  param: string;
}
export const TaxYearDashboard: React.FC = () => {
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

  // Load payment status
  useEffect(() => {
    const loadPaymentStatus = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user || !taxYear) return;
      const {
        data
      } = await supabase.from('tax_returns').select('payment_status').eq('user_id', user.id).eq('tax_year', taxYear).maybeSingle();
      if (data?.payment_status) {
        setPaymentStatus(data.payment_status);
      }
    };
    loadPaymentStatus();
  }, [taxYear]);

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
    title: 'Kontaktangaben',
    icon: User,
    param: 'kontakt'
  }, {
    id: 'deductions',
    title: 'Abzüge',
    icon: Shield,
    param: 'abzuege'
  }, {
    id: 'income',
    title: 'Einkommen',
    icon: Wallet,
    param: 'einkommen'
  }, {
    id: 'assets',
    title: 'Vermögen',
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
    title: 'Kontaktangaben',
    icon: User,
    param: 'kontakt'
  }, {
    id: 'deductions',
    title: 'Abzüge',
    icon: Shield,
    param: 'abzuege'
  }, {
    id: 'income',
    title: 'Einkommen',
    icon: Wallet,
    param: 'einkommen'
  }, {
    id: 'assets',
    title: 'Vermögen',
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
      navigate('/payment');
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
            Steuererklärung {taxYear}
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

      {/* Main Content / Timeline */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 pb-24 pt-4">
        {/* Step 1: Persönliche Angaben - Collapsible when complete */}
        {allAngabenComplete && !isAngabenExpanded ? (
          /* Collapsed Pill View - Calm, completed state with consistent height */
          <div 
            data-tour="form-step-1" 
            onClick={() => setIsAngabenExpanded(true)}
            className="bg-slate-50 p-5 rounded-2xl ring-1 ring-slate-200/60 flex items-center gap-4 transition-colors duration-150 cursor-pointer hover:bg-slate-100"
          >
            <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0 bg-green-500 text-white">
              <Check className="w-5 h-5" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-h-[40px] flex flex-col justify-center">
              <span className="font-semibold text-slate-600">
                Persönliche Angaben
              </span>
            </div>
            <ChevronDown className="w-5 h-5 text-slate-400" />
          </div>
        ) : (
          /* Expanded Card View */
          <section data-tour="form-step-1" className={`rounded-2xl overflow-hidden transition-all duration-200 ${
            !allAngabenComplete 
              ? 'bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-200/50' 
              : 'bg-slate-50 ring-1 ring-slate-200/60'
          }`}>
            {/* Step Header */}
            <div 
              onClick={() => allAngabenComplete && setIsAngabenExpanded(false)}
              className={`px-5 py-4 flex items-center gap-4 ${allAngabenComplete ? 'cursor-pointer hover:bg-slate-100' : 'border-b border-slate-100'}`}
            >
              <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold shrink-0 ${
                allAngabenComplete 
                  ? 'bg-green-500 text-white' 
                  : 'bg-blue-600 text-white'
              }`}>
                {allAngabenComplete ? <Check className="w-5 h-5" strokeWidth={2.5} /> : '1'}
              </div>
              <div className="flex-1">
                <h2 className={`font-semibold ${allAngabenComplete ? 'text-slate-600' : 'text-slate-900'}`}>
                  Persönliche Angaben
                </h2>
                {!allAngabenComplete && (
                  <p className="text-sm text-slate-500">{angabenProgress.completed} von {angabenProgress.total} erledigt</p>
                )}
              </div>
              {allAngabenComplete && (
                <ChevronDown className="w-4 h-4 text-slate-400 rotate-180" />
              )}
            </div>

            {/* Action Grid */}
            <div className={`p-4 ${allAngabenComplete ? '' : 'bg-slate-50/50'}`}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {angabenSections.map(section => {
                  const Icon = section.icon;
                  const completed = isCompleted(section.id);
                  return (
                    <button 
                      key={section.id} 
                      onClick={() => handleSectionClick(section)} 
                      data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined} 
                      className={`group flex items-center gap-3 p-3 text-left rounded-lg transition-all duration-150 ${
                        completed 
                          ? 'bg-white/60 hover:bg-white cursor-pointer' 
                          : 'bg-white ring-1 ring-slate-200 cursor-pointer hover:ring-blue-400 hover:shadow-md hover:shadow-blue-500/5 active:scale-[0.98]'
                      }`}
                    >
                      <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center transition-all duration-150 ${
                        completed 
                          ? 'bg-green-500 text-white' 
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
        <div className="mt-6 space-y-4">
          {/* Step 2: Belege & Unterlagen */}
          <div 
            data-tour="form-step-2" 
            onClick={() => allAngabenComplete && handleDocumentsClick()} 
            className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-150 ${
              isDocumentsComplete
                ? 'bg-slate-50 ring-1 ring-slate-200/60 cursor-pointer hover:bg-slate-100'
                : allAngabenComplete && !isDocumentsComplete 
                  ? 'bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-200/50 cursor-pointer hover:shadow-xl hover:shadow-slate-200/60' 
                  : 'bg-slate-50/60 ring-1 ring-slate-100'
            }`}
          >
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold shrink-0 ${
              isDocumentsComplete 
                ? 'bg-green-500 text-white' 
                : allAngabenComplete 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-200 text-slate-400'
            }`}>
              {isDocumentsComplete ? <Check className="w-5 h-5" strokeWidth={2.5} /> : '2'}
            </div>
            <div className="flex-1 min-h-[40px] flex flex-col justify-center">
              <h3 className={`font-semibold ${
                isDocumentsComplete 
                  ? 'text-slate-600' 
                  : allAngabenComplete 
                    ? 'text-slate-900' 
                    : 'text-slate-400'
              }`}>
                Belege & Unterlagen
              </h3>
              {allAngabenComplete && !isDocumentsComplete && (
                <p className="text-sm text-slate-500 mt-0.5">Dokumente hochladen</p>
              )}
              {!allAngabenComplete && (
                <p className="text-sm text-slate-400 mt-0.5">Zuerst Schritt 1 abschliessen</p>
              )}
            </div>
            {allAngabenComplete && (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>

          {/* Step 3: Prüfung & Versand */}
          <div 
            data-tour="form-step-3" 
            onClick={() => canSubmit && handleSubmitClick()} 
            className={`p-5 rounded-2xl flex items-center gap-4 transition-all duration-150 ${
              isCompleted('submit')
                ? 'bg-slate-50 ring-1 ring-slate-200/60 cursor-pointer hover:bg-slate-100'
                : canSubmit && !isCompleted('submit')
                  ? 'bg-white ring-1 ring-slate-200 shadow-lg shadow-slate-200/50 cursor-pointer hover:shadow-xl hover:shadow-slate-200/60'
                  : 'bg-slate-50/60 ring-1 ring-slate-100'
            }`}
          >
            <div className={`h-10 w-10 rounded-full flex items-center justify-center font-semibold shrink-0 ${
              isCompleted('submit') 
                ? 'bg-green-500 text-white' 
                : canSubmit 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-slate-200 text-slate-400'
            }`}>
              {isCompleted('submit') ? <Check className="w-5 h-5" strokeWidth={2.5} /> : '3'}
            </div>
            <div className="flex-1 min-h-[40px] flex flex-col justify-center">
              <h3 className={`font-semibold ${
                isCompleted('submit') 
                  ? 'text-slate-600' 
                  : canSubmit 
                    ? 'text-slate-900' 
                    : 'text-slate-400'
              }`}>
                Prüfung & Versand
              </h3>
              {canSubmit && !isCompleted('submit') && (
                <p className="text-sm text-slate-500 mt-0.5">Abschliessen & bezahlen</p>
              )}
              {!canSubmit && (
                <p className="text-sm text-slate-400 mt-0.5">Zuerst Schritt 1 & 2 abschliessen</p>
              )}
            </div>
            {canSubmit && (
              <ChevronRight className="w-5 h-5 text-slate-400" />
            )}
          </div>
        </div>
      </main>
    </div>;
};