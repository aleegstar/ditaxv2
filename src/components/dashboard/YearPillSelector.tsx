import React from 'react';
import { cn } from '@/lib/utils';

interface YearPillSelectorProps {
  years: string[];
  selectedYear: string | null;
  onSelect: (year: string) => void;
  /** Optional: legacy "+" affordance to add a year. */
  onAdd?: () => void;
}

export const YearPillSelector: React.FC<YearPillSelectorProps> = ({
  years,
  selectedYear,
  onSelect,
}) => {
  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {years.map(year => {
        const active = year === selectedYear;
        return (
          <button
            key={year}
            onClick={() => onSelect(year)}
            style={active ? { backgroundColor: '#FFFFFF' } : undefined}
            className={cn(
              'shrink-0 px-5 py-2 rounded-full text-[15px] font-medium transition-all duration-200 active:scale-[0.97] border-[1.5px]',
              active
                ? 'text-primary border-primary'
                : 'bg-[#EEEFF1] text-foreground/80 border-transparent hover:bg-[#E6E7EA]'
            )}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
};
