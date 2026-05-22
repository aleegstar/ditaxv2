import React from 'react';
import { useFormContext } from '../../contexts/FormContext';
import { toast } from '@/hooks/use-toast';
import { useI18n } from '@/contexts/I18nContext';
import { useNavigate } from 'react-router-dom';
import { MultiStepYesNoForm } from './multistep/MultiStepYesNoForm';
import ErrorBoundary from '@/components/ErrorBoundary';

interface IncomeFormProps {
  onSave: () => void;
  embedded?: boolean;
}

const IncomeForm = ({ onSave, embedded = false }: IncomeFormProps) => {
  const { formData, updateFormData, saveSection, updateFormProgress, taxYear } = useFormContext();
  const { t } = useI18n();
  const navigate = useNavigate();

  // Confirming the summary saves the section and returns to the overview.
  // The previous "Experten-Modus" (flat checkbox list) view has been removed.
  const handleComplete = async () => {
    try {
      const current = formData?.income || {};
      const dataWithCompleted = { ...current, _completed: true };
      await saveSection('income', dataWithCompleted);
      updateFormProgress('income', true);
      updateFormData('income', dataWithCompleted);
      toast({
        title: t.forms.savedSuccessfully,
        description: t.forms.savedSuccessfullyDescription,
      });
      if (!embedded) {
        navigate(`/personal-info?year=${taxYear}`);
      } else {
        onSave();
      }
    } catch (error) {
      toast({
        title: t.forms.saveError,
        description: t.forms.saveErrorDescription,
        variant: 'destructive',
      });
    }
  };

  return (
    <ErrorBoundary>
      <MultiStepYesNoForm
        section="income"
        onComplete={handleComplete}
        onModeSwitch={handleComplete}
      />
    </ErrorBoundary>
  );
};

export default IncomeForm;
