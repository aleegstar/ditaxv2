import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProgressStep {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending';
  badge?: string;
}

interface TrackingProgressStepsProps {
  workflowStep: string;
  className?: string;
}

export const TrackingProgressSteps: React.FC<TrackingProgressStepsProps> = ({
  workflowStep,
  className
}) => {
  const [expanded, setExpanded] = useState(false);

  const getSteps = (): ProgressStep[] => {
    const allSteps: ProgressStep[] = [
      {
        id: 'data_collection',
        title: 'Daten eingereicht',
        description: 'Deine Steuerdaten wurden erfolgreich übermittelt.',
        status: 'completed'
      },
      {
        id: 'document_upload',
        title: 'Unterlagen erhalten',
        description: 'Alle erforderlichen Dokumente sind bei uns eingegangen.',
        status: 'completed'
      },
      {
        id: 'submission',
        title: 'Zahlung bestätigt',
        description: 'Deine Zahlung wurde erfolgreich verarbeitet.',
        status: 'completed'
      },
      {
        id: 'in_creation',
        title: 'Steuererklärung wird erstellt',
        description: 'Deine Steuererklärung wird von unserem Team erstellt. Dies dauert zwischen 40–90 Tage.',
        status: workflowStep === 'in_creation' ? 'in_progress' : 'pending',
        badge: workflowStep === 'in_creation' ? 'In Bearbeitung' : undefined
      },
      {
        id: 'quality_check',
        title: 'Qualitätsprüfung',
        description: 'Deine Steuererklärung wird auf Vollständigkeit und Richtigkeit geprüft.',
        status: 'pending'
      },
      {
        id: 'completed',
        title: 'Versand per Post',
        description: 'Du erhältst deine fertige Steuererklärung per Post.',
        status: 'pending'
      }
    ];

    return expanded ? allSteps : allSteps.slice(0, 4);
  };

  const steps = getSteps();

  return (
    <div className={cn("px-6 py-4 relative", className)}>
      <div className="space-y-8 relative z-10">
        {steps.map((step) => (
          <div key={step.id} className="flex gap-4 group">
            <div className="flex-shrink-0 relative">
              {step.status === 'completed' ? (
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_15px_-3px_rgba(37,99,235,0.4)] border border-blue-500 transition-transform group-hover:scale-105">
                  <Check className="w-4 h-4 text-white" strokeWidth={3} />
                </div>
              ) : step.status === 'in_progress' ? (
                <div className="relative">
                  {/* Pulsing Ring Effect */}
                  <div className="absolute inset-0 rounded-full bg-blue-500/20 animate-ping" />
                  <div 
                    className="w-8 h-8 rounded-full bg-[#020408] border-[2.5px] border-blue-500 flex items-center justify-center shadow-[0_0_20px_-5px_rgba(37,99,235,0.5)] z-10"
                  >
                    <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                  </div>
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800/50 border border-zinc-700 flex items-center justify-center">
                  <div className="w-2.5 h-2.5 bg-zinc-600 rounded-full" />
                </div>
              )}
            </div>

            <div className={step.status === 'in_progress' ? 'pt-0.5' : 'pt-1'}>
              <div className="flex items-center gap-2 mb-1.5">
                <h3
                  className={cn(
                    "text-sm font-semibold leading-none",
                    step.status === 'completed' || step.status === 'in_progress'
                      ? "text-white"
                      : "text-zinc-500"
                  )}
                >
                  {step.title}
                </h3>
                {step.badge && (
                  <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-[10px] font-semibold text-orange-400 tracking-wide">
                    {step.badge}
                  </span>
                )}
              </div>
              {step.description && (
                <p
                  className={cn(
                    "text-xs leading-relaxed max-w-[280px]",
                    step.status === 'in_progress'
                      ? "text-zinc-400"
                      : step.status === 'completed'
                      ? "text-zinc-500"
                      : "text-zinc-600"
                  )}
                >
                  {step.description}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {!expanded && (
        <button
          onClick={() => setExpanded(true)}
          className="mt-8 ml-[42px] flex items-center gap-1.5 text-xs font-medium text-blue-500 hover:text-blue-400 transition-colors"
        >
          Vollständiges Tracking anzeigen
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
