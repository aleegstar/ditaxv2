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
import { VehicleRepeater } from './repeaters/VehicleRepeater';
import { PropertyRepeater } from './repeaters/PropertyRepeater';
import { DebtRepeater } from './repeaters/DebtRepeater';
import { Vehicle, Property, Debt } from '@/types';
import { FormModeToggle } from '@/components/ui/form-mode-toggle';
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
    generateChecklist,
    setCurrentStep,
    currentStep
  } = useFormContext();
  const isMobile = useIsMobile();
  const {
    t
  } = useI18n();
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
  const [formMode, setFormMode] = useState<'standard' | 'yesno'>('yesno');
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

      // Load array data
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
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateFormData('assets', currentAssetsData);
    toast({
      title: t.forms.savedSuccessfully,
      description: t.forms.savedSuccessfullyDescription
    });
    if (!embedded) {
      setSearchParams({});
    } else {
      onSave();
    }
  };
  const handleNext = async () => {
    try {
      await saveSection('assets', currentAssetsData);
      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription
      });
      setCurrentStep(4);
      setTimeout(() => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }, 100);
    } catch (error) {
      console.error('Error saving assets:', error);
      toast({
        title: t.forms.saveError,
        description: t.forms.saveErrorDescription,
        variant: "destructive"
      });
    }
  };
  const handleBack = () => {
    setCurrentStep(2);
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  };

  const handleModeSwitch = () => {
    setFormMode(formMode === 'standard' ? 'yesno' : 'standard');
  };

  const handleYesNoComplete = () => {
    setCurrentStep(4); // Move to next step (deductions)
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

  const renderAssetsForm = () => <AnimatedPageContainer className="">
      <form onSubmit={handleSubmit} className="space-y-6 px-[20px] py-[20px]">
        {/* Header for non-embedded mode */}
        {!embedded && (
          <SubpageHeader 
            title={t.assets.title}
            onBack={() => setSearchParams({})}
            showModeToggle={true}
            currentMode={formMode}
            onModeChange={setFormMode}
          />
        )}

        <AnimatedFormSection delay={0.1} className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <ImportFromPreviousYear section="assets" sectionName={t.assets.title} />
            
          </div>
        </AnimatedFormSection>

        {/* Boolean checkboxes */}
        <div className="space-y-4">
          <AnimatedFormField delay={0.2}>
            <CustomCheckbox id="hasVehicle" checked={hasVehicle} onCheckedChange={checked => setHasVehicle(checked === true)} label={t.assets.hasVehicle} explanation={t.assets.hasVehicleExplanation} />
          </AnimatedFormField>

          {/* Vehicle Repeater */}
          {hasVehicle && <AnimatedFormField delay={0.25}>
              <VehicleRepeater vehicles={vehicles} onUpdate={setVehicles} />
            </AnimatedFormField>}

          <AnimatedFormField delay={0.3}>
            <CustomCheckbox id="hasProperty" checked={hasProperty} onCheckedChange={checked => setHasProperty(checked === true)} label={t.assets.hasProperty} explanation={t.assets.hasPropertyExplanation} />
          </AnimatedFormField>

          {/* Property Repeater */}
          {hasProperty && <AnimatedFormField delay={0.35}>
              <PropertyRepeater properties={properties} onUpdate={setProperties} />
            </AnimatedFormField>}

          <AnimatedFormField delay={0.4}>
            <CustomCheckbox id="hasMortgage" checked={hasMortgage} onCheckedChange={checked => setHasMortgage(checked === true)} label={t.assets.hasMortgage} explanation={t.assets.hasMortgageExplanation} />
          </AnimatedFormField>

          <AnimatedFormField delay={0.5}>
            <CustomCheckbox id="hasDebt" checked={hasDebt} onCheckedChange={checked => setHasDebt(checked === true)} label={t.assets.hasDebt} explanation={t.assets.hasDebtExplanation} />
          </AnimatedFormField>

          {/* Debt Repeater */}
          {hasDebt && <AnimatedFormField delay={0.55}>
              <DebtRepeater debts={debts} onUpdate={setDebts} />
            </AnimatedFormField>}

          <AnimatedFormField delay={0.6}>
            <CustomCheckbox id="hasDepositAccount" checked={hasDepositAccount} onCheckedChange={checked => setHasDepositAccount(checked === true)} label={t.assets.hasDepositAccount} explanation={t.assets.hasDepositAccountExplanation} />
          </AnimatedFormField>

          <AnimatedFormField delay={0.7}>
            <CustomCheckbox id="hasCrypto" checked={hasCrypto} onCheckedChange={checked => setHasCrypto(checked === true)} label={t.assets.hasCrypto} explanation={t.assets.hasCryptoExplanation} />
          </AnimatedFormField>

          <AnimatedFormField delay={0.8}>
            <CustomCheckbox id="hasOtherAssets" checked={hasOtherAssets} onCheckedChange={checked => setHasOtherAssets(checked === true)} label={t.assets.hasOtherAssets} explanation={t.assets.hasOtherAssetsExplanation} />
          </AnimatedFormField>
        </div>

        {/* Form buttons */}
        {!embedded && <AnimatedFormField delay={0.9} className="flex justify-center">
            <button 
              type="submit" 
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]"
              style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
            >
              Speichern
            </button>
          </AnimatedFormField>}

        {embedded && <AnimatedFormField delay={0.9} className="flex w-full gap-3 mt-8">
            <motion.button onClick={handleBack} disabled={currentStep === 0} className={cn("rounded-full bg-white text-black font-medium px-8 py-3 transition-colors", currentStep === 0 && 'opacity-0 pointer-events-none', isMobile ? "flex-shrink-0" : "w-[30%]")} whileHover={currentStep !== 0 ? {
          scale: 1.02
        } : {}} whileTap={currentStep !== 0 ? {
          scale: 0.98
        } : {}} transition={{
          duration: 0.2
        }}>
              {t.forms.back}
            </motion.button>
            
            <FramerButton variant="desktop" onClick={handleNext} className="flex-1">
              {t.forms.continue}
            </FramerButton>
          </AnimatedFormField>}
      </form>
    </AnimatedPageContainer>;
  if (embedded) {
    return renderAssetsForm();
  }
  return <Card className="w-full bg-transparent border-0">
      <CardContent className="p-0">
        {renderAssetsForm()}
      </CardContent>
    </Card>;
};
export default AssetsForm;