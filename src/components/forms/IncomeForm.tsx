import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { RainbowButton } from '@/components/ui/rainbow-button';
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { CustomCheckbox } from "@/components/ui/custom-checkbox";

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
import { EmployerRepeater } from './repeaters/EmployerRepeater';
import { RentalIncomeRepeater } from './repeaters/RentalIncomeRepeater';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FormModeToggle } from '@/components/ui/form-mode-toggle';
import { MultiStepYesNoForm } from './multistep/MultiStepYesNoForm';
import ErrorBoundary from '@/components/ErrorBoundary';

interface IncomeFormProps {
  onSave: () => void;
  embedded?: boolean;
}

const IncomeForm = ({
  onSave,
  embedded = false
}: IncomeFormProps) => {
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
  const [hasSalary, setHasSalary] = useState<boolean>(false);
  const [hasRental, setHasRental] = useState<boolean>(false);
  const [hasDividends, setHasDividends] = useState<boolean>(false);
  const [hasFreelance, setHasFreelance] = useState<boolean>(false);
  const [hasPension, setHasPension] = useState<boolean>(false);
  const [hasGiftInheritance, setHasGiftInheritance] = useState<boolean>(false);
  const [hasPensionPayout, setHasPensionPayout] = useState<boolean>(false);
  const [hasOtherIncome, setHasOtherIncome] = useState<boolean>(false);

  // Repeater data states
  const [employers, setEmployers] = useState<any[]>([]);
  const [rentalIncomes, setRentalIncomes] = useState<any[]>([]);
  const [dividends, setDividends] = useState<any[]>([]);
  const [freelanceIncome, setFreelanceIncome] = useState<any[]>([]);

  // Collapsible states
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  
  // Form mode state
  const [formMode, setFormMode] = useState<'standard' | 'yesno'>('yesno');

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const currentIncomeData = useMemo(() => ({
    hasSalary,
    hasRental,
    hasDividends,
    hasFreelance,
    hasPension,
    hasGiftInheritance,
    hasPensionPayout,
    hasOtherIncome,
    employers,
    rentalIncomes,
    dividends,
    freelanceIncome
  }), [hasSalary, hasRental, hasDividends, hasFreelance, hasPension, hasGiftInheritance, hasPensionPayout, hasOtherIncome, employers, rentalIncomes, dividends, freelanceIncome]);

  // Use refs to track loading and initial data state
  const isInitialLoadRef = React.useRef(true);
  const lastSavedDataRef = React.useRef<any>(null);


  // Load existing data
  useEffect(() => {
    if (formData?.income) {
      // Mark as initial load to prevent auto-save triggers
      isInitialLoadRef.current = true;
      
      setHasSalary(formData.income.hasSalary || false);
      setHasRental(formData.income.hasRental || false);
      setHasDividends(formData.income.hasDividends || false);
      setHasFreelance(formData.income.hasFreelance || false);
      setHasPension(formData.income.hasPension || false);
      setHasGiftInheritance(formData.income.hasGiftInheritance || false);
      setHasPensionPayout(formData.income.hasPensionPayout || false);
      setHasOtherIncome(formData.income.hasOtherIncome || false);
      setEmployers(formData.income.employers || []);
      setRentalIncomes(formData.income.rentalIncomes || []);
      setDividends(formData.income.dividends || []);
      setFreelanceIncome(formData.income.freelanceIncome || []);
      
      // Store initial data reference and mark load as complete
      lastSavedDataRef.current = { ...formData.income };
      
      // Use setTimeout to mark initial load as complete after state updates
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    }
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await saveSection('income', currentIncomeData);
      updateFormProgress('income', true);
      updateFormData('income', currentIncomeData);
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
      await saveSection('income', currentIncomeData);
      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription
      });
      setCurrentStep(3);
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Error saving income:', error);
      toast({
        title: t.forms.saveError,
        description: t.forms.saveErrorDescription,
        variant: "destructive"
      });
    }
  };

  const handleBack = () => {
    setCurrentStep(1);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const handleModeSwitch = () => {
    setFormMode(formMode === 'standard' ? 'yesno' : 'standard');
  };

  const handleYesNoComplete = () => {
    setCurrentStep(3); // Move to next step (assets)
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // Render multi-step yes/no form
  if (formMode === 'yesno') {
    return (
      <ErrorBoundary>
        <MultiStepYesNoForm
          section="income"
          onComplete={handleYesNoComplete}
          onModeSwitch={handleModeSwitch}
        />
      </ErrorBoundary>
    );
  }

  const renderIncomeForm = () => (
    <AnimatedPageContainer className="">
      <form onSubmit={handleSubmit} className="space-y-6 px-[20px] py-[20px]">
        {/* Header for non-embedded mode */}
        {!embedded && (
          <SubpageHeader 
            title={t.taxReturn.dashboard.sections.income}
            onBack={() => setSearchParams({})}
            showModeToggle={true}
            currentMode={formMode}
            onModeChange={setFormMode}
          />
        )}


        {/* Income Type Checkboxes */}
        <div className="space-y-4">
          {/* Pension from Social Insurance/Pension Fund */}
          <AnimatedFormField delay={0.2}>
            <CustomCheckbox
              id="hasPension"
              checked={hasPension}
              onCheckedChange={(checked) => setHasPension(checked === true)}
              label="Ich erhalte Renten aus Sozialversicherungen oder einer Pensionskasse"
            />
          </AnimatedFormField>

          {/* Gift or Inheritance */}
          <AnimatedFormField delay={0.3}>
            <CustomCheckbox
              id="hasGiftInheritance"
              checked={hasGiftInheritance}
              onCheckedChange={(checked) => setHasGiftInheritance(checked === true)}
              label="Ich habe eine Schenkung oder einen Erbvorbezug erhalten"
            />
          </AnimatedFormField>

          {/* Capital Payout from Pillar 2 or 3 */}
          <AnimatedFormField delay={0.4}>
            <CustomCheckbox
              id="hasPensionPayout"
              checked={hasPensionPayout}
              onCheckedChange={(checked) => setHasPensionPayout(checked === true)}
              label="Ich habe eine Kapitalauszahlung aus der Säule 2 oder Säule 3 erhalten"
            />
          </AnimatedFormField>

          {/* Other Income */}
          <AnimatedFormField delay={0.5}>
            <CustomCheckbox
              id="hasOtherIncome"
              checked={hasOtherIncome}
              onCheckedChange={(checked) => setHasOtherIncome(checked === true)}
              label="Ich habe weitere Einkommen generiert"
            />
          </AnimatedFormField>

          {/* Self-employed */}
          <AnimatedFormField delay={0.6}>
            <div className="space-y-4">
              <CustomCheckbox
                id="hasFreelance"
                checked={hasFreelance}
                onCheckedChange={(checked) => setHasFreelance(checked === true)}
                label="Ich bin selbständigerwerbend"
              />
            </div>
          </AnimatedFormField>

          {/* Employee */}
          <AnimatedFormField delay={0.7}>
            <div className="space-y-4">
              <CustomCheckbox
                id="hasSalary"
                checked={hasSalary}
                onCheckedChange={(checked) => {
                  setHasSalary(checked === true);
                  if (checked) {
                    setOpenSections(prev => ({ ...prev, salary: true }));
                  }
                }}
                label="Ich bin Arbeitnehmer"
              />
              
              {hasSalary && (
                <Collapsible open={openSections.salary} onOpenChange={(open) => toggleSection('salary')}>
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="w-full justify-between p-0 h-auto text-sm text-gray-600 hover:text-gray-800"
                    >
                      <span>Arbeitgeber Details {employers.length > 0 && `(${employers.length})`}</span>
                      {openSections.salary ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-4">
                    <EmployerRepeater
                      employers={employers}
                      onChange={setEmployers}
                    />
                  </CollapsibleContent>
                </Collapsible>
              )}
            </div>
          </AnimatedFormField>
        </div>

        {/* Form buttons */}
        {!embedded && (
          <AnimatedFormField delay={1.0} className="flex justify-center">
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
          <AnimatedFormField delay={1.0} className="flex w-full gap-3 mt-8">
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
    return renderIncomeForm();
  }

  return (
    <Card className="w-full bg-transparent border-0">
      <CardContent className="p-0">
        {renderIncomeForm()}
      </CardContent>
    </Card>
  );
};

export default IncomeForm;
