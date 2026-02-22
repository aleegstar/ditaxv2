import React, { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { FormProvider, useFormContext } from '../contexts';
import { useSearchParams, useNavigate } from 'react-router-dom';
import DocumentChecklist from '@/components/DocumentChecklist';
import { TaxYearDashboard } from '@/components/TaxYearDashboard';
import MultiStepContactForm from '@/components/forms/MultiStepContactForm';
import IncomeForm from '@/components/forms/IncomeForm';
import DeductionsForm from '@/components/forms/DeductionsForm';
import AssetsForm from '@/components/forms/AssetsForm';
import { SubmissionForm } from '@/components/forms/SubmissionForm';
import { FormDataSummary } from '@/components/forms/FormDataSummary';
import { ImportWizard } from '@/components/forms/ImportWizard';
import { supabase } from "@/integrations/supabase/client";
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';
import { FormSectionKey } from '@/types';
import { FormTourProvider, useFormTour } from '@/contexts/FormTourContext';
import { FormTour } from '@/components/FormTour';

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
  const {
    hasDataForPreviousYear,
    formProgress,
    taxYear
  } = useFormContext();
  const { showTour, completeTour, skipTour } = useFormTour();
  const [showImportWizard, setShowImportWizard] = useState(false);
  const [checkingImport, setCheckingImport] = useState(false);
  const section = searchParams.get('section');

  // When navigating to a section, immediately end the tour to prevent overlay blocking
  useEffect(() => {
    if (section && showTour) {
      skipTour();
    }
  }, [section]);

  // Check if import wizard should be shown
  useEffect(() => {
    let cancelled = false;

    const checkImportNeeded = async () => {
      if (!section || section === 'zusammenfassung' || section === 'unterlagen') {
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
        const hasData = await hasDataForPreviousYear(sectionKey);
        if (!cancelled) setShowImportWizard(hasData);
      } catch (error) {
        console.error('Error checking for previous year data:', error);
        if (!cancelled) setShowImportWizard(false);
      } finally {
        if (!cancelled) setCheckingImport(false);
      }
    };
    checkImportNeeded();

    // Safety timeout: force-clear loading if check hangs
    const timer = setTimeout(() => {
      if (!cancelled) setCheckingImport(false);
    }, 5000);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [section, formProgress, hasDataForPreviousYear]);

  // Render different components based on section parameter
  const renderContent = () => {
    // Show loading state while checking
    if (checkingImport) {
      return <LoadingSpinner fullScreen />;
    }

    // Normal flow - always render the form content
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

  return (
    <AnimatedPageContainer className="min-h-screen bg-white">
      {renderContent()}

      {/* Import wizard overlay - renders as bottom sheet over the form */}
      {showImportWizard && section && sectionKeyMap[section] && (
        <ImportWizard 
          section={sectionKeyMap[section]} 
          sectionName={sectionNameMap[section]} 
          taxYear={taxYear} 
          onComplete={() => setShowImportWizard(false)} 
        />
      )}

      {/* Form Tour — only render when active, no lingering overlay */}
      {showTour && (
        <FormTour onComplete={completeTour} onSkip={skipTour} />
      )}
    </AnimatedPageContainer>
  );
};

const Index = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  // Handle auth tokens from deep link
  useEffect(() => {
    const accessToken = searchParams.get("at");
    const refreshToken = searchParams.get("rt");
    if (accessToken && refreshToken) {
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      }).then(({ error }) => {
        if (error) {
          console.error('Error setting session from deep link:', error);
        } else {
          const newParams = new URLSearchParams(searchParams);
          newParams.delete("at");
          newParams.delete("rt");
          navigate({ search: newParams.toString() }, { replace: true });
        }
      });
    }
  }, [searchParams, navigate]);

  return (
    <FormProvider taxYear={year}>
      <FormTourProvider>
        <IndexContent />
      </FormTourProvider>
    </FormProvider>
  );
};

export default Index;
