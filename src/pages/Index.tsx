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
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          onClick={() => navigate('/documents')}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0A0C10] border border-white/[0.08] rounded-full px-5 py-3 shadow-xl hover:bg-[#12151A] transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-[#1D64FF] flex items-center justify-center shadow-[0_0_20px_-3px_rgba(29,100,255,0.5)]">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div className="text-left pr-2">
            <p className="text-sm font-medium text-white">Dokument hinzufügen</p>
            <p className="text-xs text-zinc-500">Scan oder Upload</p>
          </div>
        </motion.button>
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
