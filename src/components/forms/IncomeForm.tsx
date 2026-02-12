import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { useI18n } from '@/contexts/I18nContext';
import { useSearchParams } from 'react-router-dom';
import { ExpertFormContainer } from '@/components/ui/expert-form-container';
import { EmployerRepeater } from './repeaters/EmployerRepeater';
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
    setCurrentStep,
    currentStep,
    taxYear
  } = useFormContext();
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

  // Form mode state
  const [formMode, setFormMode] = useState<'standard' | 'yesno'>('yesno');

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

  // Use ref to track if data has been loaded
  const hasLoadedRef = useRef(false);

  // Reset hasLoadedRef when switching to standard mode (expert view)
  // This ensures data is reloaded after questionnaire completion
  useEffect(() => {
    if (formMode === 'standard') {
      hasLoadedRef.current = false;
    }
  }, [formMode]);

  // Load existing data - reload when mode changes to standard
  useEffect(() => {
    if (hasLoadedRef.current) return;
    
    if (formData?.income) {
      hasLoadedRef.current = true;
      
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
    }
  }, [formData, formMode]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      const dataWithCompleted = { ...currentIncomeData, _completed: true };
      await saveSection('income', dataWithCompleted);
      updateFormProgress('income', true);
      updateFormData('income', dataWithCompleted);
      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription
      });
      
      if (!embedded) {
        setSearchParams({ year: taxYear });
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

  const handleModeSwitch = () => {
    setFormMode(formMode === 'standard' ? 'yesno' : 'standard');
  };

  const handleYesNoComplete = () => {
    setCurrentStep(3);
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
    <ExpertFormContainer
      title={t.taxReturn.dashboard.sections.income}
      onBack={() => setSearchParams({ year: taxYear })}
      onSubmit={handleSubmit}
      submitLabel={t.forms.save}
      showFooter={!embedded}
    >
      {/* Checkbox List */}
      <div className="animate-fade-in opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasPension"
          checked={hasPension}
          onCheckedChange={(checked) => setHasPension(checked === true)}
          label="Ich erhalte Renten aus Sozialversicherungen oder einer Pensionskasse"
        />
      </div>

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasGiftInheritance"
          checked={hasGiftInheritance}
          onCheckedChange={(checked) => setHasGiftInheritance(checked === true)}
          label="Ich habe eine Schenkung oder einen Erbvorbezug erhalten"
        />
      </div>

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasPensionPayout"
          checked={hasPensionPayout}
          onCheckedChange={(checked) => setHasPensionPayout(checked === true)}
          label="Ich habe eine Kapitalauszahlung aus der Säule 2 oder Säule 3 erhalten"
        />
      </div>

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasOtherIncome"
          checked={hasOtherIncome}
          onCheckedChange={(checked) => setHasOtherIncome(checked === true)}
          label="Ich habe weitere Einkommen generiert"
        />
      </div>

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasFreelance"
          checked={hasFreelance}
          onCheckedChange={(checked) => setHasFreelance(checked === true)}
          label="Ich bin selbständigerwerbend"
        />
      </div>

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasSalary"
          checked={hasSalary}
          onCheckedChange={(checked) => setHasSalary(checked === true)}
          label="Ich bin Arbeitnehmer"
        />
      </div>

      {/* Employer Repeater */}
      {hasSalary && (
        <div className="animate-fade-in opacity-0 pl-4" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
          <EmployerRepeater
            employers={employers}
            onChange={setEmployers}
          />
        </div>
      )}
    </ExpertFormContainer>
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
