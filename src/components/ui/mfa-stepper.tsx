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
    <div className="w-full py-6">
      <div className="flex items-center justify-between w-full px-2">
        {steps.map((step, index) => (
          <React.Fragment key={index}>
            {/* Step Circle */}
            <div className="relative flex flex-col items-center shrink-0">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center ring-4 ring-white z-10 transition-all",
                index < currentStep 
                  ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/20"
                  : index === currentStep
                  ? "bg-white border-2 border-blue-500 text-blue-600 shadow-lg shadow-blue-500/30"
                  : "bg-slate-100 border border-slate-200 text-slate-400"
              )}>
                {index < currentStep ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-semibold">{index + 1}</span>
                )}
              </div>
              
              {/* Step Label - only show for current step */}
              {index === currentStep && (
                <span className="absolute top-10 text-[10px] font-semibold text-blue-600 uppercase tracking-wider whitespace-nowrap">
                  {step.title}
                </span>
              )}
            </div>
            
            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div className={cn(
                "flex-1 h-1 rounded-full mx-2 transition-all",
                index < currentStep 
                  ? "bg-gradient-to-r from-blue-600 to-blue-500" 
                  : "bg-slate-200"
              )} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};
