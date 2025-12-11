import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import ImportFromPreviousYear from '@/components/ui/import-from-previous-year';
import { FramerButton } from '@/components/ui/framer-button';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { useI18n } from '@/contexts/I18nContext';
import { ArrowLeft } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { AnimatedPageContainer } from '@/components/ui/animated-page-container';
import { AnimatedHeader } from '@/components/ui/animated-header';
import { AnimatedFormField } from '@/components/ui/animated-form-field';
import { AnimatedFormSection } from '@/components/ui/animated-form-section';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { FormModeToggle } from '@/components/ui/form-mode-toggle';
import { MultiStepYesNoForm } from './multistep/MultiStepYesNoForm';
import ErrorBoundary from '@/components/ErrorBoundary';

interface DeductionsFormProps {
  onSave: () => void;
  embedded?: boolean;
}

const DeductionsForm = ({
  onSave,
  embedded = false
}: DeductionsFormProps) => {
  const {
    formData,
    updateFormData,
    saveSection,
    updateFormProgress,
    generateChecklist,
    setCurrentStep,
    currentStep
  } = useFormContext();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [searchParams, setSearchParams] = useSearchParams();

  // Boolean states
  const [hasPillar3a, setHasPillar3a] = useState<boolean>(false);
  const [hasBVGPurchase, setHasBVGPurchase] = useState<boolean>(false);
  const [hasEducationExpenses, setHasEducationExpenses] = useState<boolean>(false);
  const [hasDonations, setHasDonations] = useState<boolean>(false);
  const [hasPropertyMaintenance, setHasPropertyMaintenance] = useState<boolean>(false);
  const [hasOtherDeductions, setHasOtherDeductions] = useState<boolean>(false);
  const [hasSupportedPersons, setHasSupportedPersons] = useState<boolean>(false);
  const [hasMaintenancePayments, setHasMaintenancePayments] = useState<boolean>(false);
  const [hasWorkRelatedExpenses, setHasWorkRelatedExpenses] = useState<boolean>(false);
  const [hasChildcare, setHasChildcare] = useState<boolean>(false);

  // Array states for repeater sections
  const [supportedPersons, setSupportedPersons] = useState<any[]>([]);
  const [maintenancePayments, setMaintenancePayments] = useState<any[]>([]);
  
  // Form mode state
  const [formMode, setFormMode] = useState<'standard' | 'yesno'>('yesno');

  const currentDeductionsData = useMemo(() => ({
    hasPillar3a,
    hasBVGPurchase,
    hasEducationExpenses,
    hasDonations,
    hasPropertyMaintenance,
    hasOtherDeductions,
    hasSupportedPersons,
    hasMaintenancePayments,
    hasWorkRelatedExpenses,
    hasChildcare,
    supportedPersons,
    maintenancePayments
  }), [
    hasPillar3a, hasBVGPurchase, hasEducationExpenses, hasDonations,
    hasPropertyMaintenance, hasOtherDeductions, hasSupportedPersons,
    hasMaintenancePayments, hasWorkRelatedExpenses, hasChildcare,
    supportedPersons, maintenancePayments
  ]);


  // Load existing data
  useEffect(() => {
    if (formData?.deductions) {
      setHasPillar3a(formData.deductions.hasPillar3a || false);
      setHasBVGPurchase(formData.deductions.hasBVGPurchase || false);
      setHasEducationExpenses(formData.deductions.hasEducationExpenses || false);
      setHasDonations(formData.deductions.hasDonations || false);
      setHasPropertyMaintenance(formData.deductions.hasPropertyMaintenance || false);
      setHasOtherDeductions(formData.deductions.hasOtherDeductions || false);
      setHasSupportedPersons(formData.deductions.hasSupportedPersons || false);
      setHasMaintenancePayments(formData.deductions.hasMaintenancePayments || false);
      setHasWorkRelatedExpenses(formData.deductions.hasWorkRelatedExpenses || false);
      setHasChildcare(formData.deductions.hasChildcare || false);
      setSupportedPersons(formData.deductions.supportedPersons || []);
      setMaintenancePayments(formData.deductions.maintenancePayments || []);
    }
  }, [formData]);

  // Auto-save when data changes

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSection('deductions', currentDeductionsData);
      updateFormProgress('deductions', true);
      updateFormData('deductions', currentDeductionsData);
      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription
      });
      
      if (!embedded) {
        setSearchParams({});
      } else {
        onSave();
      }
    } catch (error) {
      toast({
        title: t.forms.saveError,
        description: t.forms.saveErrorDescription,
        variant: "destructive"
      });
    }
  };

  const handleNext = async () => {
    try {
      await saveSection('deductions', currentDeductionsData);
      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription
      });
      setCurrentStep(5);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error saving deductions:', error);
      toast({
        title: t.forms.saveError,
        description: t.forms.saveErrorDescription,
        variant: "destructive"
      });
    }
  };

  const handleBack = () => {
    setCurrentStep(3);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleModeSwitch = () => {
    setFormMode(formMode === 'standard' ? 'yesno' : 'standard');
  };

  const handleYesNoComplete = () => {
    setCurrentStep(5); // Move to next step (summary/documents)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // Render multi-step yes/no form
  if (formMode === 'yesno') {
    return (
      <ErrorBoundary>
        <MultiStepYesNoForm
          section="deductions"
          onComplete={handleYesNoComplete}
          onModeSwitch={handleModeSwitch}
        />
      </ErrorBoundary>
    );
  }

  const renderDeductionsForm = () => (
    <AnimatedPageContainer className="">
      <form onSubmit={handleSubmit} className="space-y-6 px-[20px] py-[20px]">
        {/* Header for non-embedded mode */}
        {!embedded && (
          <SubpageHeader 
            title={t.deductions.title}
            onBack={() => setSearchParams({})}
            showModeToggle={true}
            currentMode={formMode}
            onModeChange={setFormMode}
          />
        )}

        <AnimatedFormSection delay={0.1} className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ImportFromPreviousYear 
              section="deductions" 
              sectionName={t.deductions.title} 
            />
          </div>
        </AnimatedFormSection>

        {/* Boolean checkboxes */}
        <div className="space-y-4">
          <AnimatedFormField delay={0.2}>
            <CustomCheckbox
              id="hasPillar3a"
              checked={hasPillar3a}
              onCheckedChange={(checked) => setHasPillar3a(checked === true)}
              label={t.deductions.hasPillar3a}
              explanation={t.deductions.hasPillar3aExplanation}
            />
          </AnimatedFormField>

          <AnimatedFormField delay={0.3}>
            <CustomCheckbox
              id="hasBVGPurchase"
              checked={hasBVGPurchase}
              onCheckedChange={(checked) => setHasBVGPurchase(checked === true)}
              label={t.deductions.hasBVGPurchase}
              explanation={t.deductions.hasBVGPurchaseExplanation}
            />
          </AnimatedFormField>

          <AnimatedFormField delay={0.4}>
            <CustomCheckbox
              id="hasEducationExpenses"
              checked={hasEducationExpenses}
              onCheckedChange={(checked) => setHasEducationExpenses(checked === true)}
              label="Ich habe Weiterbildungskosten bezahlt"
              explanation={t.deductions.hasEducationExpensesExplanation}
            />
          </AnimatedFormField>

          <AnimatedFormField delay={0.5}>
            <CustomCheckbox
              id="hasDonations"
              checked={hasDonations}
              onCheckedChange={(checked) => setHasDonations(checked === true)}
              label={t.deductions.hasDonations}
              explanation={t.deductions.hasDonationsExplanation}
            />
          </AnimatedFormField>

          <AnimatedFormField delay={0.6}>
            <CustomCheckbox
              id="hasPropertyMaintenance"
              checked={hasPropertyMaintenance}
              onCheckedChange={(checked) => setHasPropertyMaintenance(checked === true)}
              label={t.deductions.hasPropertyMaintenance}
              explanation={t.deductions.hasPropertyMaintenanceExplanation}
            />
          </AnimatedFormField>

          <AnimatedFormField delay={0.7}>
            <CustomCheckbox
              id="hasOtherDeductions"
              checked={hasOtherDeductions}
              onCheckedChange={(checked) => setHasOtherDeductions(checked === true)}
              label={t.deductions.hasOtherDeductions}
              explanation={t.deductions.hasOtherDeductionsExplanation}
            />
          </AnimatedFormField>

          <AnimatedFormField delay={0.8}>
            <CustomCheckbox
              id="hasSupportedPersons"
              checked={hasSupportedPersons}
              onCheckedChange={(checked) => setHasSupportedPersons(checked === true)}
              label={t.deductions.hasSupportedPersons}
              explanation={t.deductions.hasSupportedPersonsExplanation}
            />
          </AnimatedFormField>

          <AnimatedFormField delay={0.9}>
            <CustomCheckbox
              id="hasMaintenancePayments"
              checked={hasMaintenancePayments}
              onCheckedChange={(checked) => setHasMaintenancePayments(checked === true)}
              label={t.deductions.hasMaintenancePayments}
              explanation={t.deductions.hasMaintenancePaymentsExplanation}
            />
          </AnimatedFormField>


          <AnimatedFormField delay={1.1}>
            <CustomCheckbox
              id="hasChildcare"
              checked={hasChildcare}
              onCheckedChange={(checked) => setHasChildcare(checked === true)}
              label={t.deductions.hasChildcare}
              explanation={t.deductions.hasChildcareExplanation}
            />
          </AnimatedFormField>
        </div>

        {/* Form buttons */}
        {!embedded && (
          <AnimatedFormField delay={1.2} className="flex justify-center">
            <button 
              type="submit" 
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]"
              style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
            >
              Speichern
            </button>
          </AnimatedFormField>
        )}

        {embedded && (
          <AnimatedFormField delay={1.2} className="flex w-full gap-3 mt-8">
            <motion.button
              onClick={handleBack}
              disabled={currentStep === 0}
              className={cn(
                "rounded-full bg-white text-black font-medium px-8 py-3 transition-colors",
                currentStep === 0 && 'opacity-0 pointer-events-none',
                isMobile ? "flex-shrink-0" : "w-[30%]"
              )}
              whileHover={currentStep !== 0 ? { scale: 1.02 } : {}}
              whileTap={currentStep !== 0 ? { scale: 0.98 } : {}}
              transition={{ duration: 0.2 }}
            >
              {t.forms.back}
            </motion.button>
            
            <FramerButton
              variant="desktop"
              onClick={handleNext}
              className="flex-1"
            >
              {t.forms.continue}
            </FramerButton>
          </AnimatedFormField>
        )}
      </form>
    </AnimatedPageContainer>
  );

  if (embedded) {
    return renderDeductionsForm();
  }

  return (
    <Card className="w-full bg-transparent border-0">
      <CardContent className="p-0">
        {renderDeductionsForm()}
      </CardContent>
    </Card>
  );
};

export default DeductionsForm;
