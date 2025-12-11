import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
        description: 'Deine Steuererklärung wird von unserem Team erstellt. Dies dauert zwischen 40-90 Tage.',
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
    <div className={cn("space-y-6", className)}>
      <div className="relative">
        {steps.map((step, index) => (
          <div key={step.id} className="relative flex gap-4 pb-8 last:pb-0">
            {/* Timeline line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "absolute left-4 top-8 w-0.5 h-full -ml-px",
                  step.status === 'completed' ? "bg-primary" : "bg-gray-200"
                )}
              />
            )}

            {/* Status indicator */}
            <div className="relative flex-shrink-0">
              {step.status === 'completed' ? (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Check className="w-5 h-5 text-white" />
                </div>
              ) : step.status === 'in_progress' ? (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-white" />
                </div>
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                </div>
              )}
            </div>

            {/* Content */}
            <div className="flex-1 pt-1">
              <div className="flex items-center gap-2 mb-1">
                <h3
                  className={cn(
                    "font-semibold",
                    step.status === 'completed' || step.status === 'in_progress'
                      ? "text-gray-900"
                      : "text-gray-400"
                  )}
                >
                  {step.title}
                </h3>
                {step.badge && (
                  <Badge variant="secondary" className="bg-orange-100 text-orange-800 hover:bg-orange-100">
                    {step.badge}
                  </Badge>
                )}
              </div>
              {step.description && (
                <p
                  className={cn(
                    "text-sm",
                    step.status === 'in_progress'
                      ? "text-gray-700"
                      : step.status === 'completed'
                      ? "text-gray-600"
                      : "text-gray-400"
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
        <Button
          variant="ghost"
          onClick={() => setExpanded(true)}
          className="text-primary hover:text-primary/80 flex items-center gap-2"
        >
          Vollständiges Tracking anzeigen
          <ChevronDown className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
};
