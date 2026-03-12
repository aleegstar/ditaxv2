import React from 'react';
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
        className="group flex items-center gap-3 rounded-full bg-gradient-to-b from-card to-muted border border-border px-5 py-3 font-medium text-base text-foreground transition-all shadow-[0_2px_8px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.5)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground transition-colors group-hover:bg-accent">
          <ArrowLeft className="h-4 w-4 stroke-[1.5] group-hover:-translate-x-0.5 transition-transform" />
        </div>
        <span>Zurück</span>
      </button>
      
      <button
        onClick={onNext}
        className="group flex items-center gap-3 rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-5 py-3 font-medium text-base text-white transition-all shadow-[0_2px_8px_hsl(222,100%,56%,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_hsl(222,100%,56%,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110 active:scale-[0.97]"
      >
        <span>Weiter</span>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors group-hover:bg-white/25">
          <ArrowRight className="h-4 w-4 stroke-[1.5] group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>
    </div>
  );
};
