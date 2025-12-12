
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
          ? 'border border-[#1D64FF] bg-[#1D64FF]/[0.03] shadow-[0_0_20px_-10px_rgba(29,100,255,0.15)]' 
          : 'border border-white/[0.08] bg-[#0A0C10] hover:bg-white/[0.02] hover:border-white/20',
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
              : 'border border-white/20 bg-transparent group-hover:border-white/40'
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
            checked ? 'text-white' : 'text-zinc-300 group-hover:text-zinc-100',
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
            checked ? 'text-[#1D64FF]' : 'text-zinc-600 group-hover:text-zinc-400'
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
