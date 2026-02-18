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
  className,
}) => {
  const [expanded, setExpanded] = useState(false);

  const getSteps = (): ProgressStep[] => {
    const allSteps: ProgressStep[] = [
      {
        id: 'data_collection',
        title: 'Daten eingereicht',
        description: 'Deine Steuerdaten wurden erfolgreich übermittelt.',
        status: 'completed',
      },
      {
        id: 'document_upload',
        title: 'Unterlagen erhalten',
        description: 'Alle erforderlichen Dokumente sind bei uns eingegangen.',
        status: 'completed',
      },
      {
        id: 'submission',
        title: 'Zahlung bestätigt',
        description: 'Deine Zahlung wurde erfolgreich verarbeitet.',
        status: 'completed',
      },
      {
        id: 'in_creation',
        title: 'Steuererklärung wird erstellt',
        description:
          'Deine Steuererklärung wird von unserem Team erstellt. Dies dauert zwischen 40–90 Tage.',
        status: workflowStep === 'in_creation' ? 'in_progress' : 'pending',
        badge: workflowStep === 'in_creation' ? 'In Bearbeitung' : undefined,
      },
      {
        id: 'quality_check',
        title: 'Qualitätsprüfung',
        description:
          'Deine Steuererklärung wird auf Vollständigkeit und Richtigkeit geprüft.',
        status: 'pending',
      },
      {
        id: 'completed',
        title: 'Zustellung',
        description: 'Deine fertige Steuererklärung wird dir zugestellt.',
        status: 'pending',
      },
    ];

    return expanded ? allSteps : allSteps.slice(0, 4);
  };

  const steps = getSteps();

  return (
    <div className={cn('relative', className)}>
      <div className="space-y-0 relative">
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          const nextStep = steps[index + 1];

          // Determine line color
          let lineClass = 'bg-slate-100';
          if (step.status === 'completed' && nextStep?.status === 'completed') {
            lineClass = 'bg-blue-500';
          } else if (
            step.status === 'completed' &&
            nextStep?.status === 'in_progress'
          ) {
            // Gradient from blue to slate
            lineClass = 'bg-gradient-to-b from-blue-500 to-slate-200';
          }

          return (
            <div
              key={step.id}
              className="flex gap-6 relative pb-12 last:pb-0"
            >
              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'absolute left-[1.5rem] top-[3.5rem] bottom-[-0.5rem] w-[2px] z-0',
                    lineClass
                  )}
                />
              )}

              {/* Icon */}
              <div className="relative z-10 flex-shrink-0">
                {step.status === 'completed' ? (
                  <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                    <Check className="w-6 h-6 text-white" strokeWidth={3} />
                  </div>
                ) : step.status === 'in_progress' ? (
                  <div className="w-12 h-12 rounded-full bg-white border-[3px] border-blue-500 flex items-center justify-center shadow-xl shadow-blue-100 ring-4 ring-blue-50">
                    <div className="w-3.5 h-3.5 bg-blue-600 rounded-full animate-pulse" />
                  </div>
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <div className="w-3 h-3 bg-slate-300 rounded-full" />
                  </div>
                )}
              </div>

              {/* Text */}
              <div className={step.status === 'in_progress' ? 'pt-1.5 w-full' : 'pt-2'}>
                <div className="flex flex-wrap items-center gap-3 mb-1.5">
                  <h3
                    className={cn(
                      'text-lg font-medium tracking-tight',
                      step.status === 'completed' || step.status === 'in_progress'
                        ? 'text-slate-900'
                        : 'text-slate-400'
                    )}
                  >
                    {step.title}
                  </h3>
                  {step.badge && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-100 tracking-wide">
                      {step.badge}
                    </span>
                  )}
                </div>
                {step.description && (
                  <p
                    className={cn(
                      'text-base leading-relaxed max-w-md',
                      step.status === 'in_progress'
                        ? 'text-slate-500'
                        : step.status === 'completed'
                        ? 'text-slate-500'
                        : 'text-slate-300'
                    )}
                  >
                    {step.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand button */}
      {!expanded && (
        <div className="mt-16 text-center">
          <button
            onClick={() => setExpanded(true)}
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-5 py-2.5 rounded-full transition-colors duration-200"
          >
            Vollständiges Tracking anzeigen
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
