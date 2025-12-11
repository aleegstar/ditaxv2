import React from 'react';
import { motion } from 'framer-motion';
import { Progress } from '@/components/ui/progress';
import { Card } from '@/components/ui/card';
import { isAndroidEnvironment } from '@/utils/platform';

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
  const progressPercentage = ((safeCurrent + 1) / safeTotal) * 100;
  const isAndroid = isAndroidEnvironment();

  // Android-safe version without blur or motion
  if (isAndroid) {
    return (
      <Card className={`bg-card border-border ${className}`}>
        <div className="p-6">
          <div className="space-y-4">
            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress 
                value={progressPercentage} 
                segments={safeTotal}
                variant="segmented"
                className="h-1.5"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
              </div>
            </div>
          </div>
        </div>
      </Card>
    );
  }

  // Original version with animations for web
  return (
    <Card className={`bg-card/30 backdrop-blur-sm border-border/50 ${className}`}>
      <div className="p-6">
        <div className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress 
              value={progressPercentage} 
              segments={safeTotal}
              variant="segmented"
              className="h-1.5"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};