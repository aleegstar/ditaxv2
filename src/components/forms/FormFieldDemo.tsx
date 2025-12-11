
import React from 'react';
import { useFormContext } from '../../contexts';
import { ResettableCheckbox } from '@/components/ui/resettable-checkbox';
import { FormSectionWrapper } from '@/components/ui/form-section-wrapper';
import { FormInput } from '@/components/ui/form-input';
import { FieldResetButton } from '@/components/ui/field-reset-button';

// This is a demo component showing how to integrate the new reset functionality
const FormFieldDemo: React.FC = () => {
  const { formData, updateFormData, resetFormField, resetFormSection } = useFormContext();

  const handleCheckboxChange = (fieldName: string, checked: boolean) => {
    updateFormData('deductions', { [fieldName]: checked });
    
    // Also reset related amount field when unchecking
    if (!checked) {
      const amountField = `${fieldName.replace('has', '').toLowerCase()}Amount`;
      updateFormData('deductions', { [amountField]: 0 });
    }
  };

  const handleFieldReset = (fieldName: string) => {
    resetFormField('deductions', fieldName);
    
    // Also reset related amount field
    const amountField = `${fieldName.replace('has', '').toLowerCase()}Amount`;
    resetFormField('deductions', amountField);
  };

  const hasAnyDeductionContent = () => {
    return Object.entries(formData.deductions).some(([key, value]) => 
      key.startsWith('has') && value === true
    );
  };

  return (
    <FormSectionWrapper
      title="Abzüge (mit Reset-Funktionalität)"
      onResetSection={() => resetFormSection('deductions')}
      hasContent={hasAnyDeductionContent()}
    >
      <div className="space-y-4">
        <ResettableCheckbox
          checked={formData.deductions.hasPillar3a}
          onCheckedChange={(checked) => handleCheckboxChange('hasPillar3a', checked)}
          onReset={() => handleFieldReset('hasPillar3a')}
          label="Säule 3a Einzahlung"
          explanation="Beiträge in die private Vorsorge (Säule 3a) sind steuerlich abzugsfähig"
        />
        
        {formData.deductions.hasPillar3a && (
          <div className="ml-6 flex items-center gap-2">
            <FormInput
              label="Betrag (CHF)"
              type="number"
              value={formData.deductions.retirementContributions}
              onChange={(e) => updateFormData('deductions', { retirementContributions: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            <FieldResetButton
              onReset={() => resetFormField('deductions', 'retirementContributions')}
              variant="field"
            />
          </div>
        )}

        <ResettableCheckbox
          checked={formData.deductions.hasEducationExpenses}
          onCheckedChange={(checked) => handleCheckboxChange('hasEducationExpenses', checked)}
          onReset={() => handleFieldReset('hasEducationExpenses')}
          label="Bildungskosten"
          explanation="Kosten für berufliche Aus- und Weiterbildung"
        />
        
        {formData.deductions.hasEducationExpenses && (
          <div className="ml-6 flex items-center gap-2">
            <FormInput
              label="Betrag (CHF)"
              type="number"
              value={formData.deductions.educationExpenses}
              onChange={(e) => updateFormData('deductions', { educationExpenses: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            <FieldResetButton
              onReset={() => resetFormField('deductions', 'educationExpenses')}
              variant="field"
            />
          </div>
        )}

        <ResettableCheckbox
          checked={formData.deductions.hasDonations}
          onCheckedChange={(checked) => handleCheckboxChange('hasDonations', checked)}
          onReset={() => handleFieldReset('hasDonations')}
          label="Spenden"
          explanation="Spenden an gemeinnützige Organisationen"
        />
        
        {formData.deductions.hasDonations && (
          <div className="ml-6 flex items-center gap-2">
            <FormInput
              label="Betrag (CHF)"
              type="number"
              value={formData.deductions.charitableDonations}
              onChange={(e) => updateFormData('deductions', { charitableDonations: parseInt(e.target.value) || 0 })}
              placeholder="0"
            />
            <FieldResetButton
              onReset={() => resetFormField('deductions', 'charitableDonations')}
              variant="field"
            />
          </div>
        )}
      </div>
    </FormSectionWrapper>
  );
};

export default FormFieldDemo;
