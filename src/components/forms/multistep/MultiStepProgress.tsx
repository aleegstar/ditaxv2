import React from 'react';
import { cn } from '@/lib/utils';

interface MultiStepProgressProps {
  currentStep: number;
  totalSteps: number;
  sectionTitle: string;
  className?: string;
}

export const MultiStepProgress: React.FC<MultiStepProgressProps> = ({
  currentStep,
  totalSteps,
  sectionTitle,
  className
}) => {
  const safeTotal = Math.max(1, totalSteps);
  const safeCurrent = Math.min(Math.max(0, currentStep), safeTotal - 1);

  return (
    <div className={cn('mb-6 px-1', className)}>
      <div className="flex items-center gap-1.5">
        {Array.from({ length: safeTotal }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-[3px] flex-1 rounded-full transition-all duration-500 ease-out',
              index <= safeCurrent ? 'bg-primary' : 'bg-border'
            )}
          />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2.5">
        <span className="text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground">
          {sectionTitle}
        </span>
        <span className="text-[11px] text-muted-foreground tabular-nums">
          Frage {safeCurrent + 1} / {safeTotal}
        </span>
      </div>
    </div>
  );
};
