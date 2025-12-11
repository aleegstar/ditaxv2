import React from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface StepNavigationProps {
  canGoBack: boolean;
  onNext: () => void;
  onBack: () => void;
}

export const StepNavigation: React.FC<StepNavigationProps> = ({
  canGoBack,
  onNext,
  onBack
}) => {
  return (
    <div className="flex justify-between mt-8">
      <button
        onClick={onBack}
        disabled={!canGoBack}
        className="flex items-center gap-2 bg-white text-black border border-[#E2E8F0] hover:bg-gray-50 font-medium px-6 py-4 min-h-[56px] text-base rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-none"
      >
        <ArrowLeft className="w-4 h-4" />
        Zurück
      </button>
      
      <button
        onClick={onNext}
        className="flex items-center gap-2 bg-[#1d64ff] text-white hover:bg-[#1d64ff]/90 font-medium px-6 py-4 min-h-[56px] text-base rounded-xl transition-colors duration-200 shadow-none"
      >
        Weiter
        <ArrowRight className="w-4 h-4" />
      </button>
    </div>
  );
};