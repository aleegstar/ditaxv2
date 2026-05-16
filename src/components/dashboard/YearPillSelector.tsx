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
    <div className="inline-flex items-center gap-0.5 p-[3px] rounded-full bg-foreground/[0.045] overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {years.map(year => {
        const active = year === selectedYear;
        return (
          <button
            key={year}
            onClick={() => onSelect(year)}
            className={cn(
              'shrink-0 px-3 h-7 rounded-full text-[12.5px] tabular-nums transition-all duration-200 active:scale-[0.97]',
              active
                ? 'bg-white text-foreground font-semibold shadow-[0_1px_2px_rgba(15,27,61,0.06),0_4px_10px_-3px_rgba(15,27,61,0.1)]'
                : 'text-muted-foreground/65 font-medium hover:text-foreground/85'
            )}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
};
