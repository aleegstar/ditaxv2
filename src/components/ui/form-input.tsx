
import React, { forwardRef } from "react";
import { Input, InputProps } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormInputProps extends InputProps {
  label?: string;
  error?: boolean;
  errorMessage?: string;
  securityLevel?: 'basic' | 'enhanced' | 'strict';
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ className, label, error, errorMessage, id, variant = "transparent-white", securityLevel = 'basic', ...props }, ref) => {
    return (
      <div className="form-group">
        {label && (
          <Label 
            htmlFor={id} 
            className={cn(
              "block mb-2 text-black font-medium",
              error ? "text-red-400" : ""
            )}
          >
            {label} {props.required && <span className="text-red-400">*</span>}
          </Label>
        )}
        <Input
          id={id}
          ref={ref}
          variant={variant}
          className={cn(
            className,
            error && "border-red-400 focus:border-red-400 animate-shake",
            securityLevel === 'strict' && "font-mono" // Monospace font for strict mode to detect character anomalies
          )}
          // Add security attributes based on security level
          autoComplete={securityLevel === 'strict' ? 'off' : props.autoComplete}
          spellCheck={securityLevel === 'strict' ? false : props.spellCheck}
          {...props}
        />
        {error && errorMessage && (
          <p className="mt-1 text-xs text-red-400">{errorMessage}</p>
        )}
      </div>
    );
  }
);

FormInput.displayName = "FormInput";

export { FormInput };
