import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { CustomCheckbox } from "@/components/ui/custom-checkbox";
import { useI18n } from '@/contexts/I18nContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ExpertFormContainer } from '@/components/ui/expert-form-container';
import { VehicleRepeater } from './repeaters/VehicleRepeater';
import { PropertyRepeater } from './repeaters/PropertyRepeater';
import { DebtRepeater } from './repeaters/DebtRepeater';
import { Vehicle, Property, Debt } from '@/types';
import { MultiStepYesNoForm } from './multistep/MultiStepYesNoForm';
import ErrorBoundary from '@/components/ErrorBoundary';

interface AssetsFormProps {
  onSave: () => void;
  embedded?: boolean;
}

const AssetsForm = ({
  onSave,
  embedded = false
}: AssetsFormProps) => {
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
  const [hasVehicle, setHasVehicle] = useState<boolean>(false);
  const [hasProperty, setHasProperty] = useState<boolean>(false);
  const [hasMortgage, setHasMortgage] = useState<boolean>(false);
  const [hasDebt, setHasDebt] = useState<boolean>(false);
  const [hasDepositAccount, setHasDepositAccount] = useState<boolean>(false);
  const [hasCrypto, setHasCrypto] = useState<boolean>(false);
  const [hasOtherAssets, setHasOtherAssets] = useState<boolean>(false);

  // Array states for repeater sections
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  
  // Form mode state
  const [formMode, setFormMode] = useState<'standard' | 'yesno'>(() => {
    return (formData?.assets as any)?._completed ? 'standard' : 'yesno';
  });

  const currentAssetsData = useMemo(() => ({
    hasVehicle,
    hasProperty,
    hasMortgage,
    hasDebt,
    hasDepositAccount,
    hasCrypto,
    hasOtherAssets,
    vehicles,
    properties,
    debts
  }), [hasVehicle, hasProperty, hasMortgage, hasDebt, hasDepositAccount, hasCrypto, hasOtherAssets, vehicles, properties, debts]);

  // Load existing data
  useEffect(() => {
    if (formData?.assets) {
      setHasVehicle(formData.assets.hasVehicle || false);
      setHasProperty(formData.assets.hasProperty || false);
      setHasMortgage(formData.assets.hasMortgage || false);
      setHasDebt(formData.assets.hasDebt || false);
      setHasDepositAccount(formData.assets.hasDepositAccount || false);
      setHasCrypto(formData.assets.hasCrypto || false);
      setHasOtherAssets(formData.assets.hasOtherAssets || false);
      setVehicles(formData.assets.vehicles || []);
      setProperties(formData.assets.properties || []);
      setDebts(formData.assets.debts || []);
    }
  }, [formData]);

  // Clear arrays when boolean flags are turned off
  useEffect(() => {
    if (!hasVehicle && vehicles.length > 0) {
      setVehicles([]);
    }
  }, [hasVehicle, vehicles.length]);

  useEffect(() => {
    if (!hasProperty && properties.length > 0) {
      setProperties([]);
    }
  }, [hasProperty, properties.length]);

  useEffect(() => {
    if (!hasDebt && debts.length > 0) {
      setDebts([]);
    }
  }, [hasDebt, debts.length]);

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    try {
      const dataWithCompleted = { ...currentAssetsData, _completed: true };
      // Save to database first
      await saveSection('assets', dataWithCompleted);
      // Update form progress
      updateFormProgress('assets', true);
      // Update local state
      updateFormData('assets', dataWithCompleted);
      
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
      console.error('Error saving assets:', error);
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
    setCurrentStep(4);
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  // Render multi-step yes/no form
  if (formMode === 'yesno') {
    return (
      <ErrorBoundary>
        <MultiStepYesNoForm
          section="assets"
          onComplete={handleYesNoComplete}
          onModeSwitch={handleModeSwitch}
        />
      </ErrorBoundary>
    );
  }

  const renderAssetsForm = () => (
    <ExpertFormContainer
      title={t.assets.title}
      onBack={() => setSearchParams({ year: taxYear })}
      onSubmit={handleSubmit}
      submitLabel={t.forms.save}
      showFooter={!embedded}
    >
      {/* Checkbox List */}
      <div className="animate-fade-in opacity-0" style={{ animationDelay: '0ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasVehicle"
          checked={hasVehicle}
          onCheckedChange={(checked) => setHasVehicle(checked === true)}
          label={t.assets.hasVehicle}
          explanation={t.assets.hasVehicleExplanation}
        />
      </div>

      {/* Vehicle Repeater */}
      {hasVehicle && (
        <div className="animate-fade-in opacity-0 pl-4" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
          <VehicleRepeater vehicles={vehicles} onUpdate={setVehicles} />
        </div>
      )}

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasProperty"
          checked={hasProperty}
          onCheckedChange={(checked) => setHasProperty(checked === true)}
          label={t.assets.hasProperty}
          explanation={t.assets.hasPropertyExplanation}
        />
      </div>

      {/* Property Repeater */}
      {hasProperty && (
        <div className="animate-fade-in opacity-0 pl-4" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
          <PropertyRepeater properties={properties} onUpdate={setProperties} />
        </div>
      )}

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasMortgage"
          checked={hasMortgage}
          onCheckedChange={(checked) => setHasMortgage(checked === true)}
          label={t.assets.hasMortgage}
          explanation={t.assets.hasMortgageExplanation}
        />
      </div>

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasDebt"
          checked={hasDebt}
          onCheckedChange={(checked) => setHasDebt(checked === true)}
          label={t.assets.hasDebt}
          explanation={t.assets.hasDebtExplanation}
        />
      </div>

      {/* Debt Repeater */}
      {hasDebt && (
        <div className="animate-fade-in opacity-0 pl-4" style={{ animationDelay: '50ms', animationFillMode: 'forwards' }}>
          <DebtRepeater debts={debts} onUpdate={setDebts} />
        </div>
      )}

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasDepositAccount"
          checked={hasDepositAccount}
          onCheckedChange={(checked) => setHasDepositAccount(checked === true)}
          label={t.assets.hasDepositAccount}
          explanation={t.assets.hasDepositAccountExplanation}
        />
      </div>

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasCrypto"
          checked={hasCrypto}
          onCheckedChange={(checked) => setHasCrypto(checked === true)}
          label={t.assets.hasCrypto}
          explanation={t.assets.hasCryptoExplanation}
        />
      </div>

      <div className="animate-fade-in opacity-0" style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
        <CustomCheckbox
          id="hasOtherAssets"
          checked={hasOtherAssets}
          onCheckedChange={(checked) => setHasOtherAssets(checked === true)}
          label={t.assets.hasOtherAssets}
          explanation={t.assets.hasOtherAssetsExplanation}
        />
      </div>
    </ExpertFormContainer>
  );

  if (embedded) {
    return renderAssetsForm();
  }

  return (
    <Card className="w-full bg-transparent border-0">
      <CardContent className="p-0">
        {renderAssetsForm()}
      </CardContent>
    </Card>
  );
};

export default AssetsForm;
