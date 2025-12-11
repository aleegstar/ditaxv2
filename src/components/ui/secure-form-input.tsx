
import React, { forwardRef, useState, useCallback } from "react";
import { FormInput } from "@/components/ui/form-input";
import { EnhancedInputValidator, ValidationOptions } from "@/utils/enhancedInputValidation";
import { cn } from "@/lib/utils";

interface SecureFormInputProps extends React.ComponentProps<typeof FormInput> {
  validationOptions?: ValidationOptions;
  onValidationChange?: (isValid: boolean, error?: string) => void;
  sanitizeOnBlur?: boolean;
}

const SecureFormInput = forwardRef<HTMLInputElement, SecureFormInputProps>(
  ({ 
    className, 
    validationOptions = {}, 
    onValidationChange,
    sanitizeOnBlur = true,
    onChange,
    onBlur,
    ...props 
  }, ref) => {
    const [validationError, setValidationError] = useState<string | undefined>();
    const [isValid, setIsValid] = useState(true);

    const validateInput = useCallback((value: string) => {
      const result = EnhancedInputValidator.validateText(value, validationOptions);
      
      setValidationError(result.isValid ? undefined : result.error);
      setIsValid(result.isValid);
      
      if (onValidationChange) {
        onValidationChange(result.isValid, result.error);
      }
      
      return result;
    }, [validationOptions, onValidationChange]);

    const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Real-time validation for dangerous patterns
      if (validationOptions.strictMode) {
        validateInput(value);
      }
      
      if (onChange) {
        onChange(e);
      }
    }, [onChange, validateInput, validationOptions.strictMode]);

    const handleBlur = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
      const value = e.target.value;
      
      // Always validate on blur
      const result = validateInput(value);
      
      // Sanitize value if requested and valid
      if (sanitizeOnBlur && result.isValid && result.sanitizedValue) {
        e.target.value = result.sanitizedValue;
      }
      
      if (onBlur) {
        onBlur(e);
      }
    }, [onBlur, validateInput, sanitizeOnBlur]);

    return (
      <FormInput
        ref={ref}
        className={cn(
          className,
          !isValid && "border-red-500 focus:border-red-500"
        )}
        error={!isValid}
        errorMessage={validationError}
        onChange={handleChange}
        onBlur={handleBlur}
        {...props}
      />
    );
  }
);

SecureFormInput.displayName = "SecureFormInput";

export { SecureFormInput };
