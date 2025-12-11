import React, { useEffect, useState } from 'react';
import { FormProvider, useFormContext } from '../contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuthValidation } from '@/hooks/use-auth-validation';
import DocumentChecklist from '@/components/DocumentChecklist';
import { TaxYearDashboard } from '@/components/TaxYearDashboard';
import MultiStepContactForm from '@/components/forms/MultiStepContactForm';
import IncomeForm from '@/components/forms/IncomeForm';
import DeductionsForm from '@/components/forms/DeductionsForm';
import AssetsForm from '@/components/forms/AssetsForm';
import { SubmissionForm } from '@/components/forms/SubmissionForm';
import { FormDataSummary } from '@/components/forms/FormDataSummary';
import { ImportWizard } from '@/components/forms/ImportWizard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';
import { FormSectionKey } from '@/types';
import { motion } from 'framer-motion';
// OnboardingTour now managed globally in App.tsx

// Section mapping for import wizard
const sectionKeyMap: Record<string, FormSectionKey> = {
  'kontakt': 'contactInfo',
  'einkommen': 'income',
  'abzuege': 'deductions',
  'vermoegen': 'assets'
};

const sectionNameMap: Record<string, string> = {
  'kontakt': 'Persönliche Daten',
  'einkommen': 'Einkommen',
  'abzuege': 'Abzüge',
  'vermoegen': 'Vermögen'
};

const IndexContent = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasDataForPreviousYear, formProgress, taxYear } = useFormContext();
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [checkingImport, setCheckingImport] = useState(false);
  
  const section = searchParams.get('section');
  
  // Check if import wizard should be shown
  useEffect(() => {
    const checkImportNeeded = async () => {
      if (!section || section === 'zusammenfassung' || section === 'unterlagen') {
        // No import option for summary and documents sections
        setShowImportWizard(false);
        return;
      }
      
      const sectionKey = sectionKeyMap[section];
      if (!sectionKey) {
        setShowImportWizard(false);
        return;
      }
      
      // Don't show if section is already completed
      if (formProgress[sectionKey]) {
        setShowImportWizard(false);
        return;
      }
      
      setCheckingImport(true);
      
      try {
        // Check if previous year data exists
        const hasData = await hasDataForPreviousYear(sectionKey);
        setShowImportWizard(hasData);
      } catch (error) {
        console.error('Error checking for previous year data:', error);
        setShowImportWizard(false);
      } finally {
        setCheckingImport(false);
      }
    };
    
    checkImportNeeded();
  }, [section, formProgress, hasDataForPreviousYear]);

  // Render different components based on section parameter
  const renderContent = () => {
    // Show import wizard if applicable
    if (showImportWizard && section && sectionKeyMap[section]) {
      return (
        <ImportWizard
          section={sectionKeyMap[section]}
          sectionName={sectionNameMap[section]}
          taxYear={taxYear}
          onComplete={() => setShowImportWizard(false)}
        />
      );
    }
    
    // Show loading state while checking
    if (checkingImport) {
      return null;
    }
    
    // Normal flow
    switch (section) {
      case 'kontakt':
        return <MultiStepContactForm onSave={() => navigate(`/form?year=${taxYear}`)} />;
      case 'einkommen':
        return <IncomeForm onSave={() => {}} embedded={false} />;
      case 'abzuege':
        return <DeductionsForm onSave={() => {}} embedded={false} />;
      case 'vermoegen':
        return <AssetsForm onSave={() => {}} embedded={false} />;
      case 'zusammenfassung':
        return <FormDataSummary />;
      case 'unterlagen':
        return <DocumentChecklist />;
      case 'einreichen':
        return <SubmissionForm />;
      default:
        return <TaxYearDashboard />;
    }
  };

  // Show floating button only on main dashboard
  const showFloatingButton = !section;

  return (
    <AnimatedPageContainer className="min-h-screen bg-white">
      {renderContent()}
      
      {/* Floating Add Document Button */}
      {showFloatingButton && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[float_5s_ease-in-out_infinite] w-max">
          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            onClick={() => navigate('/documents')}
            className="group flex hover:border-[#1D64FF]/50 hover:shadow-[0_0_25px_-5px_rgba(29,100,255,0.4)] transition-all duration-300 cursor-pointer active:scale-95 bg-[#0A0C10] border-white/10 border rounded-full pt-2 pr-5 pb-2 pl-2 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8),0_0_20px_-5px_rgba(29,100,255,0.15)] backdrop-blur-xl gap-x-3 gap-y-3 items-center"
          >
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-b from-[#1D64FF] to-[#0040CC] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] border border-white/10 group-hover:scale-105 transition-transform duration-300">
              <Plus className="w-5 h-5 text-white stroke-[2.5px]" />
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-sm font-medium text-white group-hover:text-white transition-colors">
                Dokument hinzufügen
              </span>
              <span className="text-[11px] text-zinc-500 group-hover:text-zinc-400 transition-colors">
                Scan oder Upload
              </span>
            </div>
          </motion.button>
        </div>
      )}
      {/* OnboardingTour now managed globally in App.tsx */}
    </AnimatedPageContainer>
  );
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { userId, isValid, isLoading } = useAuthValidation();
  const [authChecked, setAuthChecked] = useState(false);
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  // Handle auth tokens from deep link
  useEffect(() => {
    const accessToken = searchParams.get("at");
    const refreshToken = searchParams.get("rt");
    
    if (accessToken && refreshToken) {
      // Set session from deep link tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ error }) => {
        if (error) {
          console.error('Error setting session from deep link:', error);
        } else {
          // Clean up URL by removing tokens
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("at");
          newParams.delete("rt");
          navigate({ search: newParams.toString() }, { replace: true });
        }
      });
    }
  }, [searchParams, navigate]);

  // Handle auth state changes with better logic
  useEffect(() => {
    if (isLoading) {
      return; // Still checking auth, wait
    }

    setAuthChecked(true);

    if (!isValid || !userId) {
      console.log('❌ Not authenticated, redirecting to auth');
      navigate('/auth', { 
        replace: true, 
        state: { from: window.location.pathname } 
      });
    } else {
      console.log('✅ User authenticated, showing content');
    }
  }, [isValid, userId, isLoading, navigate]);

  // Show nothing while auth is being checked
  if (isLoading || !authChecked) {
    return null;
  }

  // If not authenticated after check, don't render content
  if (!isValid || !userId) {
    return null;
  }

  return (
    <FormProvider taxYear={year}>
      <IndexContent />
    </FormProvider>
  );
};

export default Index;
