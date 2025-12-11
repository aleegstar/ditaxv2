
import * as React from 'react';
import { cn } from '@/lib/utils';
import { InfoToggle } from './info-toggle';
import { Checkbox } from './checkbox';

type CustomCheckboxProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  label?: React.ReactNode;
  className?: string;
  labelClassName?: string;
  explanation?: string;
  id?: string;
};

const CustomCheckbox = ({
  className,
  label,
  labelClassName,
  id,
  explanation,
  checked = false,
  onCheckedChange,
}: CustomCheckboxProps) => {
  const checkboxId = id || React.useId();

  const handleCheckedChange = (isChecked: boolean | 'indeterminate') => {
    if (onCheckedChange && typeof isChecked === 'boolean') {
      onCheckedChange(isChecked);
    }
  };

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-5 rounded-xl transition-all duration-200 border',
        checked ? 'border-[#1d64ff]' : 'border-gray-300',
        className
      )}
      style={{
        backgroundColor: '#FAFAFA'
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Checkbox 
          id={checkboxId}
          checked={checked} 
          onCheckedChange={handleCheckedChange}
          size="lg"
          className="bg-gray-100 border-gray-300 data-[state=checked]:bg-primary data-[state=checked]:border-primary h-7 w-7 rounded-md"
        />
      </div>
      
      {label && (
        <div className="flex-1">
          <label
            htmlFor={checkboxId}
            className={cn(
              'text-base font-medium cursor-pointer text-gray-700',
              labelClassName
            )}
          >
            {label}
          </label>
        </div>
      )}

      {explanation && <InfoToggle explanation={explanation} className="flex-shrink-0" />}
    </div>
  );
};

CustomCheckbox.displayName = 'CustomCheckbox';

export { CustomCheckbox };
export type { CustomCheckboxProps as CheckboxProps };
