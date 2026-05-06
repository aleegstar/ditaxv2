import React from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface YearPillSelectorProps {
  years: string[];
  selectedYear: string | null;
  onSelect: (year: string) => void;
  onAdd: () => void;
}

export const YearPillSelector: React.FC<YearPillSelectorProps> = ({
  years,
  selectedYear,
  onSelect,
  onAdd,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {years.map(year => {
        const active = year === selectedYear;
        return (
          <button
            key={year}
            onClick={() => onSelect(year)}
            className={cn(
              'shrink-0 px-5 py-2 rounded-full text-[15px] font-medium transition-all duration-200 active:scale-[0.97] border-[1.5px]',
              active
                ? 'bg-white text-primary border-primary'
                : 'bg-[#EEEFF1] text-foreground/80 border-transparent hover:bg-[#E6E7EA]'
            )}
          >
            {year}
          </button>
        );
      })}
      <button
        onClick={onAdd}
        aria-label="Steuerjahr hinzufügen"
        className="shrink-0 h-9 w-9 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 flex items-center justify-center transition-all duration-200 active:scale-[0.97]"
      >
        <Plus className="w-4 h-4" strokeWidth={2} />
      </button>
    </div>
  );
};
