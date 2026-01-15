import React, { useState, useEffect } from 'react';
import { User, Wallet, Shield, Landmark, ChevronRight, ChevronDown, Check, FileText, BookOpen, UploadCloud, Send, LucideIcon, ArrowLeft } from 'lucide-react';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { FormDashboardSkeleton } from '@/components/ui/form-dashboard-skeleton';
import { BorderBeam } from '@/components/ui/border-beam';
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
            <img src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} alt="Profil" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Main Content / Timeline */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 space-y-6 pb-24 pt-2">
        {/* Step 1: Persönliche Angaben - Collapsible when complete */}
        {allAngabenComplete && !isAngabenExpanded ? (
          /* Collapsed Pill View */
          <div 
            data-tour="form-step-1" 
            onClick={() => setIsAngabenExpanded(true)}
            className="bg-gradient-to-b from-white to-slate-50/80 p-6 rounded-[1.5rem] ring-1 ring-slate-200/60 flex items-center gap-4 transition-all duration-300 cursor-pointer shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(100,116,139,0.18)] hover:-translate-y-0.5"
          >
            <div className="h-10 w-10 rounded-full border flex items-center justify-center font-bold shrink-0 bg-green-50 border-green-100 text-green-600">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <h2 className="font-semibold text-slate-900">
                Persönliche Angaben
              </h2>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-green-200 bg-green-50 text-green-700">
                Abgeschlossen
              </span>
            </div>
            <ChevronDown className="w-5 h-5 text-slate-300" />
          </div>
        ) : (
          /* Expanded Card View */
          <section data-tour="form-step-1" className={`bg-gradient-to-b from-white to-slate-50/80 rounded-[1.5rem] ring-1 overflow-hidden relative transition-all duration-300 ${
          !allAngabenComplete 
            ? 'shadow-[0_6px_20px_rgba(100,116,139,0.18),0_25px_50px_-12px_rgba(0,0,0,0.1)] ring-slate-300' 
            : 'shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-slate-200/60'
        }`}>
            {/* BorderBeam for active step */}
            {!allAngabenComplete && (
              <BorderBeam 
                size={150}
                duration={10}
                borderWidth={1}
                colorFrom="#3B82F6"
                colorTo="#60A5FA"
                delay={0}
              />
            )}
            {/* Step Header - clickable to collapse when complete */}
            <div 
              onClick={() => allAngabenComplete && setIsAngabenExpanded(false)}
              className={`p-6 flex items-center gap-4 ${allAngabenComplete ? 'cursor-pointer hover:bg-slate-50/50' : ''}`}
            >
              <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold shrink-0 ${allAngabenComplete ? 'bg-green-50 border-green-100 text-green-600' : 'bg-blue-50 border-blue-100 text-blue-600'}`}>
                {allAngabenComplete ? <Check className="w-5 h-5" /> : '1'}
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-slate-900">
                  Persönliche Angaben
                </h2>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${allAngabenComplete ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
                  {allAngabenComplete ? 'Abgeschlossen' : 'Offen'}
                </span>
              </div>
              {!allAngabenComplete && (
                <div className="w-32 hidden md:block">
                  <div className="flex justify-between text-xs font-semibold text-slate-900 mb-1">
                    <span>Fortschritt</span>
                    <span>{angabenProgress.percentage}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{
                    width: `${angabenProgress.percentage}%`
                  }} />
                  </div>
                </div>
              )}
              {allAngabenComplete && (
                <ChevronDown className="w-5 h-5 text-slate-300 rotate-180" />
              )}
            </div>

            {/* Action Grid */}
            <div className="p-6 pt-0 bg-white">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {angabenSections.map(section => {
                const Icon = section.icon;
                const completed = isCompleted(section.id);
                return <button key={section.id} onClick={() => handleSectionClick(section)} data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined} className={`group flex items-center gap-4 p-4 text-left bg-gradient-to-b from-white to-slate-50/50 ring-1 rounded-full shadow-[0_2px_8px_rgba(100,116,139,0.08)] hover:shadow-[0_4px_12px_rgba(100,116,139,0.15)] transition-all duration-200 hover:-translate-y-0.5 ${completed ? 'ring-slate-200/60' : 'ring-slate-200/60 hover:ring-blue-300'}`}>
                      <div className={`h-10 w-10 shrink-0 rounded-full flex items-center justify-center border transition-colors ${completed ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'}`}>
                        {completed ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="block text-base font-semibold text-slate-900">
                          {section.title}
                        </span>
                        <span className={`block text-sm font-medium ${completed ? 'text-green-600' : 'text-slate-500'}`}>
                          {completed ? 'Erledigt' : 'Ausstehend'}
                        </span>
                      </div>
                      <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                        <ChevronRight className="w-5 h-5" />
                      </div>
                    </button>;
              })}
              </div>
            </div>
          </section>
        )}

        {/* Upcoming Steps */}
        <section className={`flex flex-col gap-4 ${!allAngabenComplete ? 'opacity-50 grayscale select-none cursor-not-allowed' : ''}`}>
          {/* Step 2: Belege & Unterlagen */}
          <div data-tour="form-step-2" onClick={() => allAngabenComplete && handleDocumentsClick()} className={`bg-gradient-to-b from-white to-slate-50/80 p-6 rounded-[1.5rem] ring-1 flex items-center gap-4 transition-all duration-300 relative overflow-hidden ${
          allAngabenComplete && !isDocumentsComplete 
            ? 'shadow-[0_6px_20px_rgba(100,116,139,0.18),0_25px_50px_-12px_rgba(0,0,0,0.1)] ring-slate-300 cursor-pointer hover:shadow-[0_8px_25px_rgba(100,116,139,0.22),0_30px_60px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-1' 
            : allAngabenComplete 
              ? 'shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-slate-200/60 cursor-pointer hover:shadow-[0_6px_20px_rgba(100,116,139,0.18)] hover:-translate-y-0.5' 
              : 'shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-slate-200/60'
        }`}>
            {/* BorderBeam for active step */}
            {allAngabenComplete && !isDocumentsComplete && (
              <BorderBeam 
                size={150}
                duration={10}
                borderWidth={1}
                colorFrom="#3B82F6"
                colorTo="#60A5FA"
                delay={0}
              />
            )}
            <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold ${isDocumentsComplete ? 'bg-green-50 border-green-100 text-green-600' : allAngabenComplete ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
              {isDocumentsComplete ? <Check className="w-5 h-5" /> : '2'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                Belege & Unterlagen
              </h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${isDocumentsComplete ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
                {isDocumentsComplete ? 'Abgeschlossen' : 'Offen'}
              </span>
            </div>
            {allAngabenComplete && <ChevronRight className="w-5 h-5 text-slate-300" />}
          </div>

          {/* Step 3: Prüfung & Versand */}
          <div data-tour="form-step-3" onClick={() => canSubmit && handleSubmitClick()} className={`bg-gradient-to-b from-white to-slate-50/80 p-6 rounded-[1.5rem] ring-1 flex items-center gap-4 transition-all duration-300 relative overflow-hidden ${
          canSubmit && !isCompleted('submit')
            ? 'shadow-[0_6px_20px_rgba(100,116,139,0.18),0_25px_50px_-12px_rgba(0,0,0,0.1)] ring-slate-300 cursor-pointer hover:shadow-[0_8px_25px_rgba(100,116,139,0.22),0_30px_60px_-12px_rgba(0,0,0,0.12)] hover:-translate-y-1'
            : canSubmit
              ? 'shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-slate-200/60 cursor-pointer hover:shadow-[0_6px_20px_rgba(100,116,139,0.18)] hover:-translate-y-0.5'
              : 'shadow-[0_4px_14px_0_rgba(100,116,139,0.12),0_20px_40px_-12px_rgba(0,0,0,0.06)] ring-slate-200/60'
        } ${!allAngabenComplete ? '' : !isDocumentsComplete ? 'opacity-50 grayscale select-none cursor-not-allowed' : ''}`}>
            {/* BorderBeam for active step */}
            {canSubmit && !isCompleted('submit') && (
              <BorderBeam 
                size={150}
                duration={10}
                borderWidth={1}
                colorFrom="#3B82F6"
                colorTo="#60A5FA"
                delay={0}
              />
            )}
            <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold ${isCompleted('submit') ? 'bg-green-50 border-green-100 text-green-600' : canSubmit ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
              {isCompleted('submit') ? <Check className="w-5 h-5" /> : '3'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                Prüfung & Versand
              </h3>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${isCompleted('submit') ? 'border-green-200 bg-green-50 text-green-700' : 'border-orange-200 bg-orange-50 text-orange-700'}`}>
                {isCompleted('submit') ? 'Abgeschlossen' : 'Offen'}
              </span>
            </div>
            {canSubmit && <ChevronRight className="w-5 h-5 text-slate-300" />}
          </div>
        </section>
      </main>
    </div>;
};