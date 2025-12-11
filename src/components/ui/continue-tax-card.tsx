import React, { ComponentType } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NextStepPill } from '@/components/ui/next-step-pill';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { BorderBeam } from '@/components/ui/border-beam';
// Note: Using uploaded overlay image via public URL

interface ContinueTaxCardProps {
  hasInProgressTaxReturn: boolean;
  onContinue: () => void;
  onAddNew: () => void;
  className?: string;
  nextStepTitle?: string;
  nextStepSubtitle?: string;
  nextStepIcon?: ComponentType<{ className?: string }>;
  taxYear?: string;
  currentStep?: number; // 1 = Angaben, 2 = Unterlagen, 3 = Einreichen
  variant?: 'default' | 'dashboard'; // New variant prop
  isFirstStep?: boolean; // New prop to determine if this is the first step
}
export const ContinueTaxCard: React.FC<ContinueTaxCardProps> = ({
  hasInProgressTaxReturn,
  onContinue,
  onAddNew,
  className,
  nextStepTitle,
  nextStepSubtitle,
  nextStepIcon,
  taxYear,
  currentStep = 1,
  variant = 'default',
  isFirstStep = false
}) => {
  const handleClick = () => {
    if (hasInProgressTaxReturn) {
      onContinue();
    } else {
      onAddNew();
    }
  };

  const steps = [
    { label: 'Angaben', step: 1 },
    { label: 'Unterlagen', step: 2 },
    { label: 'Einreichen', step: 3 }
  ];

  const getStepProgress = () => {
    return ((currentStep - 1) / (steps.length - 1)) * 100;
  };
  return <div 
    className={cn("relative overflow-hidden rounded-[24px] p-6 text-white cursor-pointer hover:scale-[1.02] transition-transform duration-200 h-[180px]", className)}
    onClick={handleClick}
    data-continue-card
    style={{
      background: 'linear-gradient(rgb(29, 100, 255), rgb(29, 100, 255) 100%)'
    }}
  >
    <BorderBeam 
      size={120} 
      duration={12} 
      anchor={90} 
      borderWidth={2} 
      colorFrom="#ffffff" 
      colorTo="#ffffff" 
      delay={0} 
      className="rounded-[24px]"
    />
      
      {/* Content */}
      <div className="relative z-10 flex items-center justify-center h-full">
        {/* Centered Year Pill */}
        <div className="inline-flex items-center gap-3 rounded-full px-6 py-3 bg-white" style={{
          boxShadow: 'rgba(0, 0, 0, 0.15) 0px 32px 32px -12px'
        }}>
          {/* Outer blue circle with gradient */}
          <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{
            background: 'linear-gradient(rgb(54, 132, 255) 0%, rgb(10, 105, 255) 100%)',
            boxShadow: 'rgba(255, 255, 255, 0.1) 0px 0.78125px 0px 0px inset'
          }}>
            {/* Inner white circle */}
            <div className="w-2.5 h-2.5 rounded-full" style={{
              backgroundColor: 'rgb(250, 251, 252)'
            }} />
          </div>
          <span className="text-base font-semibold text-gray-900">
            {nextStepTitle || 'Steuerjahr fortsetzen'}
          </span>
        </div>
      </div>
    </div>;
};