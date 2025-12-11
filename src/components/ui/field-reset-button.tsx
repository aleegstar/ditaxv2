
import React from 'react';
import { Button } from "@/components/ui/button";
import { X, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useI18n } from '@/contexts/I18nContext';

interface FieldResetButtonProps {
  onReset: () => void;
  size?: 'sm' | 'default';
  variant?: 'field' | 'section';
  className?: string;
  disabled?: boolean;
}

const FieldResetButton: React.FC<FieldResetButtonProps> = ({
  onReset,
  size = 'sm',
  variant = 'field',
  className,
  disabled = false
}) => {
  const { t } = useI18n();
  const Icon = variant === 'field' ? X : RotateCcw;
  const tooltipText = variant === 'field' ? t.forms.fieldReset : t.forms.sectionReset;
  
  return (
    <Button
      type="button"
      variant="ghost"
      size={size}
      onClick={onReset}
      disabled={disabled}
      className={cn(
        "text-red-400 hover:text-red-300 hover:bg-red-500/10",
        size === 'sm' && "h-8 w-8 p-0",
        className
      )}
      title={tooltipText}
    >
      <Icon className="h-4 w-4" />
      {size === 'sm' && variant === 'section' && (
        <span className="ml-1">{t.forms.reset}</span>
      )}
    </Button>
  );
};

export { FieldResetButton };
