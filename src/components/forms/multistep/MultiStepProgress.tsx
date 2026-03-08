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
  const progressPercent = ((safeCurrent + 1) / safeTotal) * 100;

  return (
    <div className={cn("mb-8", className)}>
      <div className="w-full bg-muted/40 rounded-full h-1 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-primary to-primary/70 h-1 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );
};
