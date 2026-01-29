import React from 'react';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { useI18n } from '@/contexts/I18nContext';
import { User, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface TaxFilerSelectorProps {
  className?: string;
}

/**
 * TaxFilerSelector - Shows the currently active tax filer as a clickable header element.
 * When clicked, navigates back to the person selection page.
 * Only renders if there are multiple tax filers.
 */
const TaxFilerSelector: React.FC<TaxFilerSelectorProps> = ({ className }) => {
  const { taxFilers, activeTaxFiler, hasMultipleFilers } = useTaxFiler();
  const { t } = useI18n();
  const navigate = useNavigate();

  // Only show if there are multiple tax filers
  if (!hasMultipleFilers || !activeTaxFiler) {
    return null;
  }

  const handleClick = () => {
    navigate('/select-person');
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full',
        'bg-primary/5 hover:bg-primary/10 border border-primary/20',
        'transition-all duration-200 group',
        className
      )}
    >
      <User className="w-4 h-4 text-primary" strokeWidth={1.5} />
      <span className="text-sm font-medium text-foreground">
        {activeTaxFiler.first_name} {activeTaxFiler.last_name}
      </span>
      <ChevronRight 
        className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" 
        strokeWidth={1.5} 
      />
    </button>
  );
};

export default TaxFilerSelector;
