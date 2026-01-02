
import * as React from 'react';
import { cn } from '@/lib/utils';
import { HelpCircle, Check } from 'lucide-react';

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

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCheckedChange?.(!checked);
  };

  return (
    <label
      htmlFor={checkboxId}
      className={cn(
        'relative flex items-center gap-4 p-4 rounded-2xl cursor-pointer group transition-all duration-200',
        checked 
          ? 'border border-[#1D64FF] bg-blue-50 shadow-[0_0_20px_-10px_rgba(29,100,255,0.15)]' 
          : 'border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300',
        className
      )}
      onClick={handleClick}
    >
      {/* Custom Checkbox */}
      <div className="shrink-0 relative">
        <input 
          type="checkbox" 
          id={checkboxId}
          checked={checked}
          onChange={() => {}}
          className="peer sr-only"
        />
        <div 
          className={cn(
            'w-6 h-6 rounded-lg flex items-center justify-center transition-all duration-200',
            checked 
              ? 'border border-[#1D64FF] bg-[#1D64FF]' 
              : 'border border-slate-300 bg-white group-hover:border-slate-400'
          )}
        >
          {checked && (
            <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
          )}
        </div>
      </div>
      
      {/* Label */}
      {label && (
        <span 
          className={cn(
            'text-[15px] font-medium leading-snug flex-1 transition-colors',
            checked ? 'text-slate-800' : 'text-slate-700 group-hover:text-slate-900',
            labelClassName
          )}
        >
          {label}
        </span>
      )}

      {/* Help Icon */}
      {explanation && (
        <div 
          className={cn(
            'shrink-0 transition-colors',
            checked ? 'text-[#1D64FF]' : 'text-slate-400 group-hover:text-slate-500'
          )}
          title={explanation}
        >
          <HelpCircle className="w-5 h-5 opacity-80" strokeWidth={1.5} />
        </div>
      )}
    </label>
  );
};

CustomCheckbox.displayName = 'CustomCheckbox';

export { CustomCheckbox };
export type { CustomCheckboxProps as CheckboxProps };
