
import { useState, useCallback } from 'react';
import { EnhancedInputValidator, ValidationOptions, ValidationResult } from '@/utils/enhancedInputValidation';

export interface UseEnhancedValidationOptions {
  validationRules: Record<string, ValidationOptions>;
  onValidationChange?: (isValid: boolean, errors: Record<string, string>) => void;
}

export const useEnhancedValidation = (options: UseEnhancedValidationOptions) => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValid, setIsValid] = useState(true);

  const validateField = useCallback((field: string, value: string): ValidationResult => {
    const rules = options.validationRules[field];
    if (!rules) {
      return { isValid: true };
    }

    const result = EnhancedInputValidator.validateText(value, rules);
    
    setErrors(prev => {
      const newErrors = { ...prev };
      if (result.isValid) {
        delete newErrors[field];
      } else {
        newErrors[field] = result.error || 'Validation failed';
      }
      
      const newIsValid = Object.keys(newErrors).length === 0;
      setIsValid(newIsValid);
      
      if (options.onValidationChange) {
        options.onValidationChange(newIsValid, newErrors);
      }
      
      return newErrors;
    });

    return result;
  }, [options]);

  const validateForm = useCallback((formData: Record<string, any>) => {
    const result = EnhancedInputValidator.validateFormData(formData, options.validationRules);
    
    setErrors(result.errors);
    setIsValid(result.isValid);
    
    if (options.onValidationChange) {
      options.onValidationChange(result.isValid, result.errors);
    }
    
    return result;
  }, [options]);

  const clearErrors = useCallback(() => {
    setErrors({});
    setIsValid(true);
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      
      const newIsValid = Object.keys(newErrors).length === 0;
      setIsValid(newIsValid);
      
      return newErrors;
    });
  }, []);

  return {
    errors,
    isValid,
    validateField,
    validateForm,
    clearErrors,
    clearFieldError
  };
};
