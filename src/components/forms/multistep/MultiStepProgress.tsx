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
    <div className={cn("mb-10 px-4", className)}>
      {/* Segment bars */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: safeTotal }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-[3px] flex-1 rounded-full transition-all duration-700 ease-out",
              index <= safeCurrent
                ? "bg-primary"
                : "bg-foreground/[0.06]"
            )}
          />
        ))}
      </div>
      {/* Counter text */}
      <p className="text-[11px] text-muted-foreground/60 mt-3 text-center font-medium tabular-nums tracking-[0.04em]">
        Frage {safeCurrent + 1} von {safeTotal}
      </p>
    </div>
  );
};
