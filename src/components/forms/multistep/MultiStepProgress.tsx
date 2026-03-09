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
    <div className={cn("mb-8 px-4", className)}>
      {/* Segment bars */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: safeTotal }).map((_, index) => (
          <div
            key={index}
            className={cn(
              "h-1 flex-1 rounded-full transition-all duration-500",
              index <= safeCurrent
                ? "bg-primary"
                : "bg-foreground/[0.08]"
            )}
          />
        ))}
      </div>
      {/* Counter text */}
      <p className="text-xs text-muted-foreground mt-2.5 text-center font-medium tabular-nums">
        Frage {safeCurrent + 1} von {safeTotal}
      </p>
    </div>
  );
};
