import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Wallet, Shield, Landmark, ChevronRight, Check, FileText, BookOpen, UploadCloud, Send, LucideIcon } from 'lucide-react';
import { useFormContext } from '@/contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { TourStartButton } from '@/components/ui/tour-start-button';
import { useFormTour } from '@/contexts/FormTourContext';
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
  const { profile } = useProfile();
  const { forceTour, tourCompleted } = useFormTour();
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [isReady, setIsReady] = useState(false);

  // Load payment status
  useEffect(() => {
    const loadPaymentStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !taxYear) return;
      const { data } = await supabase
        .from('tax_returns')
        .select('payment_status')
        .eq('user_id', user.id)
        .eq('tax_year', taxYear)
        .maybeSingle();
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

  // Show skeleton while loading
  if (isDataLoading || !isReady || !formDataLoaded) {
    return <FormDashboardSkeleton />;
  }

  const angabenSections: DashboardSection[] = [
    { id: 'contact', title: 'Kontaktangaben', icon: User, param: 'kontakt' },
    { id: 'deductions', title: 'Abzüge', icon: Shield, param: 'abzuege' },
    { id: 'income', title: 'Einkommen', icon: Wallet, param: 'einkommen' },
    { id: 'assets', title: 'Vermögen', icon: Landmark, param: 'vermoegen' }
  ];

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
        return (formProgress.contactInfo && formProgress.income && formProgress.deductions && formProgress.assets && formProgress.documents && paymentStatus === 'paid') || false;
      default:
        return false;
    }
  };

  const getAngabenProgress = (): { completed: number; total: number; percentage: number } => {
    const completed = angabenSections.filter(s => isCompleted(s.id)).length;
    return { completed, total: 4, percentage: Math.round((completed / 4) * 100) };
  };

  const handleSectionClick = (section: DashboardSection) => {
    setSearchParams({ section: section.param, year: taxYear });
  };

  const handleDocumentsClick = () => {
    setSearchParams({ section: 'unterlagen', year: taxYear });
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

  return (
    <div className="text-slate-900 antialiased min-h-screen px-4 py-6 sm:p-6 md:p-12 bg-slate-50">
      {/* Header Navigation */}
      <header className="max-w-4xl mx-auto mb-6 md:mb-8 pt-2 md:pt-8 relative z-10">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Icon + Title */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="bg-blue-600 text-white p-2 sm:p-2.5 rounded-xl shadow-lg shadow-blue-600/20 shrink-0">
              <FileText className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-slate-900 leading-tight truncate">
                Steuererklärung {taxYear}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Entwurf • Zuletzt gespeichert heute
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            {tourCompleted && (
              <TourStartButton onStartTour={forceTour} variant="header" />
            )}
            <button 
              onClick={() => navigate('/help')}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-slate-700 bg-slate-900 text-white border border-slate-800 shadow-sm rounded-full hover:bg-slate-800 transition-all"
            >
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden xs:inline">Anleitung starten</span>
              <span className="xs:hidden">Anleitung</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content / Timeline */}
      <main className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-24">
        {/* Active Step Card - Persönliche Angaben */}
        <motion.section
          data-tour="form-step-1"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-200/50 border border-white overflow-hidden relative"
        >
          {/* Progress Header */}
          <div className="p-5 sm:p-8 pb-4 sm:pb-6 border-b border-slate-50">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-[10px] sm:text-xs font-bold uppercase tracking-wider">
                <span>Schritt 1 von 3</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Persönliche Angaben
              </h2>
              <p className="text-slate-500 text-base sm:text-lg">
                Erfassen Sie Ihre Grunddaten für die korrekte Berechnung.
              </p>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-5 sm:mt-6">
              <div className="flex justify-between text-xs font-semibold text-slate-900 mb-2">
                <span>Fortschritt</span>
                <span>{angabenProgress.percentage}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-500" 
                  style={{ width: `${angabenProgress.percentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Action Grid */}
          <div className="p-4 sm:p-8 bg-slate-50/50">
            <div className="space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4">
              {angabenSections.map((section) => {
                const Icon = section.icon;
                const completed = isCompleted(section.id);
                
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionClick(section)}
                    data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined}
                    className={`group w-full flex items-center gap-3 sm:gap-4 p-3.5 sm:p-4 text-left bg-white border rounded-xl sm:rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ${
                      completed 
                        ? 'border-slate-200/60' 
                        : 'border-slate-200/60 hover:border-blue-300 hover:ring-1 hover:ring-blue-300'
                    }`}
                  >
                    <div className={`h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-lg sm:rounded-xl flex items-center justify-center border transition-colors ${
                      completed 
                        ? 'bg-green-50 text-green-600 border-green-100' 
                        : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'
                    }`}>
                      {completed ? (
                        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                      ) : (
                        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="block text-sm sm:text-base font-semibold text-slate-900">
                        {section.title}
                      </span>
                      <span className={`block text-xs sm:text-sm font-medium ${
                        completed ? 'text-green-600' : 'text-slate-500'
                      }`}>
                        {completed ? 'Erledigt' : 'Ausstehend'}
                      </span>
                    </div>
                    <div className="text-slate-300 group-hover:text-blue-500 transition-colors">
                      <ChevronRight className="w-5 h-5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </motion.section>

        {/* Upcoming Steps */}
        <section className={`space-y-3 sm:space-y-0 sm:grid sm:grid-cols-2 sm:gap-4 ${!allAngabenComplete ? 'opacity-50 grayscale select-none cursor-not-allowed' : ''}`}>
          {/* Step 2: Belege & Unterlagen */}
          <motion.div
            data-tour="form-step-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            onClick={() => allAngabenComplete && handleDocumentsClick()}
            className={`bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 flex items-center gap-3 sm:gap-4 ${
              allAngabenComplete ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''
            }`}
          >
            <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full border flex items-center justify-center font-bold text-sm ${
              isDocumentsComplete 
                ? 'bg-green-50 border-green-100 text-green-600' 
                : allAngabenComplete
                  ? 'bg-blue-50 border-blue-100 text-blue-600'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              {isDocumentsComplete ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '2'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                Belege & Unterlagen
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                {isDocumentsComplete ? 'Erledigt' : 'Dokumente hochladen'}
              </p>
            </div>
            {allAngabenComplete && (
              <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
            )}
          </motion.div>

          {/* Step 3: Prüfung & Versand */}
          <motion.div
            data-tour="form-step-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            onClick={() => canSubmit && handleSubmitClick()}
            className={`bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-slate-200 flex items-center gap-3 sm:gap-4 ${
              canSubmit ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''
            } ${!allAngabenComplete ? '' : !isDocumentsComplete ? 'opacity-50 grayscale select-none cursor-not-allowed' : ''}`}
          >
            <div className={`h-9 w-9 sm:h-10 sm:w-10 rounded-full border flex items-center justify-center font-bold text-sm ${
              isCompleted('submit')
                ? 'bg-green-50 border-green-100 text-green-600' 
                : canSubmit
                  ? 'bg-blue-50 border-blue-100 text-blue-600'
                  : 'bg-slate-100 border-slate-200 text-slate-400'
            }`}>
              {isCompleted('submit') ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : '3'}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                Prüfung & Versand
              </h3>
              <p className="text-xs sm:text-sm text-slate-500">
                {isCompleted('submit') ? 'Erledigt' : 'Abschließen'}
              </p>
            </div>
            {canSubmit && (
              <ChevronRight className="w-5 h-5 text-slate-300 shrink-0" />
            )}
          </motion.div>
        </section>
      </main>
    </div>
  );
};
