import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Wallet, Shield, Landmark, ChevronRight, Check, FileText, BookOpen, UploadCloud, Send, LucideIcon, ArrowLeft } from 'lucide-react';
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
  const {
    profile
  } = useProfile();
  const {
    forceTour,
    tourCompleted
  } = useFormTour();
  const [paymentStatus, setPaymentStatus] = useState<string>('pending');
  const [isReady, setIsReady] = useState(false);

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
  return <div className="text-slate-900 antialiased min-h-screen p-6 md:p-12 bg-white">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between mb-6 pt-4">
        <button
          onClick={() => navigate('/')}
          className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold tracking-tight text-slate-900 absolute left-1/2 -translate-x-1/2">
          Steuererklärung {taxYear}
        </h1>
        <div className="h-10 w-10 rounded-full bg-slate-200 ring-2 ring-white shadow-sm overflow-hidden shrink-0">
          <img src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} alt="User" className="h-full w-full object-cover" />
        </div>
      </div>

      {/* Desktop Header Navigation */}
      <header className="hidden md:flex max-w-4xl mx-auto items-center justify-between mb-8 pt-8 relative z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-slate-900 leading-tight">
              Steuererklärung {taxYear}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-slate-200 ring-2 ring-white shadow-sm overflow-hidden">
            <img src={profile?.avatar_url || '/lovable-uploads/default-avatar.png'} alt="User" className="h-full w-full object-cover" />
          </div>
        </div>
      </header>

      {/* Tour Start Button - zwischen Header und Cards */}
      {tourCompleted && <div className="max-w-4xl mx-auto mb-4">
          <TourStartButton onStartTour={forceTour} variant="default" />
        </div>}

      {/* Main Content / Timeline */}
      <main className="max-w-4xl mx-auto space-y-6 pb-24">
        {/* Active Step Card - Persönliche Angaben */}
        <motion.section data-tour="form-step-1" initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5
      }} className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border overflow-hidden relative border-gray-200">
          {/* Progress Header */}
          <div className="p-8 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-50">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wider">
                <span>Schritt 1 von 3 </span>
              </div>
              <h2 className="font-bold tracking-tight text-slate-900 text-2xl">
                Persönliche Angaben
              </h2>
              <p className="text-slate-500 text-sm">
                Erfassen Sie Ihre Grunddaten für die korrekte Berechnung.
              </p>
            </div>
            <div className="w-full md:w-48">
              <div className="flex justify-between text-xs font-semibold text-slate-900 mb-2">
                <span>Fortschritt</span>
                <span>{angabenProgress.percentage}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-500" style={{
                width: `${angabenProgress.percentage}%`
              }} />
              </div>
            </div>
          </div>

          {/* Action Grid */}
          <div className="p-8 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {angabenSections.map(section => {
              const Icon = section.icon;
              const completed = isCompleted(section.id);
              return <button key={section.id} onClick={() => handleSectionClick(section)} data-tour={section.id === 'contact' ? 'kontaktangaben' : undefined} className={`group flex items-center gap-4 p-4 text-left bg-white border rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 ${completed ? 'border-slate-200/60' : 'border-slate-200/60 hover:border-blue-300 hover:ring-1 hover:ring-blue-300'}`}>
                    <div className={`h-12 w-12 shrink-0 rounded-xl flex items-center justify-center border transition-colors ${completed ? 'bg-green-50 text-green-600 border-green-100' : 'bg-slate-100 text-slate-500 border-slate-200 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600'}`}>
                      {completed ? <Check className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
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
        </motion.section>

        {/* Upcoming Steps */}
        <section className={`flex flex-col gap-4 ${!allAngabenComplete ? 'opacity-50 grayscale select-none cursor-not-allowed' : ''}`}>
          {/* Step 2: Belege & Unterlagen */}
          <motion.div data-tour="form-step-2" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.1
        }} onClick={() => allAngabenComplete && handleDocumentsClick()} className={`bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 ${allAngabenComplete ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''}`}>
            <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold ${isDocumentsComplete ? 'bg-green-50 border-green-100 text-green-600' : allAngabenComplete ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
              {isDocumentsComplete ? <Check className="w-5 h-5" /> : '2'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                Belege & Unterlagen
              </h3>
              <p className="text-sm text-slate-500">
                {isDocumentsComplete ? 'Erledigt' : 'Dokumente hochladen'}
              </p>
            </div>
            {allAngabenComplete && <ChevronRight className="w-5 h-5 text-slate-300" />}
          </motion.div>

          {/* Step 3: Prüfung & Versand */}
          <motion.div data-tour="form-step-3" initial={{
          opacity: 0,
          y: 20
        }} animate={{
          opacity: 1,
          y: 0
        }} transition={{
          duration: 0.5,
          delay: 0.2
        }} onClick={() => canSubmit && handleSubmitClick()} className={`bg-white p-6 rounded-3xl border border-slate-200 flex items-center gap-4 ${canSubmit ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''} ${!allAngabenComplete ? '' : !isDocumentsComplete ? 'opacity-50 grayscale select-none cursor-not-allowed' : ''}`}>
            <div className={`h-10 w-10 rounded-full border flex items-center justify-center font-bold ${isCompleted('submit') ? 'bg-green-50 border-green-100 text-green-600' : canSubmit ? 'bg-blue-50 border-blue-100 text-blue-600' : 'bg-slate-100 border-slate-200 text-slate-400'}`}>
              {isCompleted('submit') ? <Check className="w-5 h-5" /> : '3'}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                Prüfung & Versand
              </h3>
              <p className="text-sm text-slate-500">
                {isCompleted('submit') ? 'Erledigt' : 'Abschließen'}
              </p>
            </div>
            {canSubmit && <ChevronRight className="w-5 h-5 text-slate-300" />}
          </motion.div>
        </section>
      </main>
    </div>;
};