import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { useI18n } from '@/contexts/I18nContext';
import { useSearchParams } from 'react-router-dom';
import { ExpertFormContainer } from '@/components/ui/expert-form-container';
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
    setCurrentStep,
    currentStep,
    taxYear
  } = useFormContext();
  const {
    t
  } = useI18n();
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
  const [formMode, setFormMode] = useState<'standard' | 'yesno'>(() => {
    return (formData?.deductions as any)?._completed ? 'standard' : 'yesno';
  });
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
  }), [hasPillar3a, hasBVGPurchase, hasEducationExpenses, hasDonations, hasPropertyMaintenance, hasOtherDeductions, hasSupportedPersons, hasMaintenancePayments, hasWorkRelatedExpenses, hasChildcare, supportedPersons, maintenancePayments]);

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
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      const dataWithCompleted = { ...currentDeductionsData, _completed: true };
      await saveSection('deductions', dataWithCompleted);
      updateFormProgress('deductions', true);
      updateFormData('deductions', dataWithCompleted);
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
    setCurrentStep(5);
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  };

  // Render multi-step yes/no form
  if (formMode === 'yesno') {
    return <ErrorBoundary>
        <MultiStepYesNoForm section="deductions" onComplete={handleYesNoComplete} onModeSwitch={handleModeSwitch} />
      </ErrorBoundary>;
  }
  const renderDeductionsForm = () => <ExpertFormContainer title={t.deductions.title} onBack={() => setSearchParams({ year: taxYear })} onSubmit={handleSubmit} submitLabel={t.forms.save} showFooter={!embedded}>
      {/* Checkbox List */}
      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '0ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasPillar3a" checked={hasPillar3a} onCheckedChange={checked => setHasPillar3a(checked === true)} label={t.deductions.hasPillar3a} explanation={t.deductions.hasPillar3aExplanation} />
      </div>

      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '100ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasBVGPurchase" checked={hasBVGPurchase} onCheckedChange={checked => setHasBVGPurchase(checked === true)} label={t.deductions.hasBVGPurchase} explanation={t.deductions.hasBVGPurchaseExplanation} />
      </div>

      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '100ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasEducationExpenses" checked={hasEducationExpenses} onCheckedChange={checked => setHasEducationExpenses(checked === true)} label="Ich habe Weiterbildungskosten bezahlt" explanation={t.deductions.hasEducationExpensesExplanation} />
      </div>

      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '100ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasDonations" checked={hasDonations} onCheckedChange={checked => setHasDonations(checked === true)} label={t.deductions.hasDonations} explanation={t.deductions.hasDonationsExplanation} />
      </div>

      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '200ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasPropertyMaintenance" checked={hasPropertyMaintenance} onCheckedChange={checked => setHasPropertyMaintenance(checked === true)} label={t.deductions.hasPropertyMaintenance} explanation={t.deductions.hasPropertyMaintenanceExplanation} />
      </div>

      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '200ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasOtherDeductions" checked={hasOtherDeductions} onCheckedChange={checked => setHasOtherDeductions(checked === true)} label={t.deductions.hasOtherDeductions} explanation={t.deductions.hasOtherDeductionsExplanation} />
      </div>

      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '200ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasSupportedPersons" checked={hasSupportedPersons} onCheckedChange={checked => setHasSupportedPersons(checked === true)} label={t.deductions.hasSupportedPersons} explanation={t.deductions.hasSupportedPersonsExplanation} />
      </div>

      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '200ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasMaintenancePayments" checked={hasMaintenancePayments} onCheckedChange={checked => setHasMaintenancePayments(checked === true)} label={t.deductions.hasMaintenancePayments} explanation={t.deductions.hasMaintenancePaymentsExplanation} />
      </div>

      <div className="animate-fade-in opacity-0" style={{
      animationDelay: '200ms',
      animationFillMode: 'forwards'
    }}>
        <CustomCheckbox id="hasChildcare" checked={hasChildcare} onCheckedChange={checked => setHasChildcare(checked === true)} label={t.deductions.hasChildcare} explanation={t.deductions.hasChildcareExplanation} />
      </div>
    </ExpertFormContainer>;
  if (embedded) {
    return renderDeductionsForm();
  }
  return <Card className="w-full bg-transparent border-0">
      <CardContent className="p-0">
        {renderDeductionsForm()}
      </CardContent>
    </Card>;
};
export default DeductionsForm;