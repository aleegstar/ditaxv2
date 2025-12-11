
import React from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { FieldResetButton } from '@/components/ui/field-reset-button';
import { cn } from '@/lib/utils';

interface ResettableCheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  onReset?: () => void;
  label: string;
  explanation?: string;
  showReset?: boolean;
  disabled?: boolean;
  className?: string;
}

const ResettableCheckbox: React.FC<ResettableCheckboxProps> = ({
  checked,
  onCheckedChange,
  onReset,
  label,
  explanation,
  showReset = true,
  disabled = false,
  className
}) => {
  return (
    <div className={cn("flex items-center justify-between group", className)}>
      <Checkbox
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        label={label}
        description={explanation}
      />
      
      {showReset && checked && onReset && (
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <FieldResetButton
            onReset={onReset}
            variant="field"
            size="sm"
          />
        </div>
      )}
    </div>
  );
};

export { ResettableCheckbox };
