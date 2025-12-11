import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  title: string;
  description: string;
}

interface MfaStepperProps {
  steps: Step[];
  currentStep: number;
}

export const MfaStepper: React.FC<MfaStepperProps> = ({ steps, currentStep }) => {
  return (
    <div className="w-full py-4">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex flex-col items-center flex-1">
            <div className="flex items-center w-full">
              {/* Step Circle */}
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                index < currentStep 
                  ? "bg-primary border-primary text-primary-foreground"
                  : index === currentStep
                  ? "border-primary text-primary bg-background"
                  : "border-muted text-muted-foreground bg-background"
              )}>
                {index < currentStep ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <span className="text-sm font-medium">{index + 1}</span>
                )}
              </div>
              
              {/* Connecting Line */}
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-0.5 mx-2 transition-colors",
                  index < currentStep ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
            
            {/* Step Label */}
            <div className="mt-2 text-center max-w-24">
              <div className={cn(
                "text-xs font-medium",
                index <= currentStep ? "text-foreground" : "text-muted-foreground"
              )}>
                {step.title}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};