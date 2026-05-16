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
    <div className="inline-flex items-center gap-0.5 p-0.5 rounded-full bg-[#F2F2EF] overflow-x-auto max-w-full [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {years.map(year => {
        const active = year === selectedYear;
        return (
          <button
            key={year}
            onClick={() => onSelect(year)}
            className={cn(
              'shrink-0 px-3.5 h-8 rounded-full text-[13px] font-medium tabular-nums transition-all duration-200 active:scale-[0.97]',
              active
                ? 'bg-white text-foreground shadow-[0_1px_2px_rgba(15,27,61,0.06),0_2px_8px_-2px_rgba(15,27,61,0.08)]'
                : 'text-muted-foreground/85 hover:text-foreground'
            )}
          >
            {year}
          </button>
        );
      })}
    </div>
  );
};
