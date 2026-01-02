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
    <div className={cn("flex items-center justify-center gap-2 mb-12 px-4", className)}>
      {Array.from({ length: safeTotal }).map((_, index) => (
        <div
          key={index}
          className={cn(
            "h-1 flex-1 rounded-full transition-all duration-300",
            index <= safeCurrent
              ? "bg-[#1D64FF]"
              : "bg-slate-200"
          )}
        />
      ))}
    </div>
  );
};
