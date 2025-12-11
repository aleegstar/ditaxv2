import React from 'react';
import { Check, FileText, Upload, Send, PenTool, Mail } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { useI18n } from '@/contexts/I18nContext';

interface ProgressStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
  icon: React.ComponentType<{
    className?: string;
  }>;
}

interface TaxReturnProgressTrackerProps {
  currentStep: string;
  taxYear?: string;
  className?: string;
}

export function TaxReturnProgressTracker({
  currentStep,
  taxYear,
  className = ''
}: TaxReturnProgressTrackerProps) {
  const {
    t
  } = useI18n();

  const workflowSteps: Record<string, ProgressStep> = {
    data_collection: {
      id: 'data_collection',
      title: t.taxReturn.dataCollection,
      description: t.taxReturn.dataCollectionDescription,
      completed: false,
      active: false,
      icon: FileText
    },
    document_upload: {
      id: 'document_upload',
      title: t.taxReturn.documentUpload,
      description: t.taxReturn.documentUploadDescription,
      completed: false,
      active: false,
      icon: Upload
    },
    submission: {
      id: 'submission',
      title: t.taxReturn.submission,
      description: t.taxReturn.submissionDescription,
      completed: false,
      active: false,
      icon: Send
    },
    in_creation: {
      id: 'in_creation',
      title: t.taxReturn.inCreation,
      description: t.taxReturn.inCreationDescription,
      completed: false,
      active: false,
      icon: PenTool
    },
    completed: {
      id: 'completed',
      title: t.taxReturn.completedMessage,
      description: t.taxReturn.completedDescription,
      completed: false,
      active: false,
      icon: Mail
    }
  };

  const steps = Object.values(workflowSteps);
  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  // Update step states based on current step
  const updatedSteps = steps.map((step, index) => ({
    ...step,
    completed: index < currentStepIndex,
    active: index === currentStepIndex
  }));

  // For 'in_creation' step, mark the first 3 steps as completed and 4th as active
  if (currentStep === 'in_creation') {
    updatedSteps.forEach((step, index) => {
      if (index < 3) {
        step.completed = true;
        step.active = false;
      } else if (index === 3) {
        step.completed = false;
        step.active = true;
      } else {
        step.completed = false;
        step.active = false;
      }
    });
  }

  return <Card className={`w-full transition-all duration-300 ${className}`} style={{
    background: 'none',
    backdropFilter: 'none',
    WebkitBackdropFilter: 'blur(15px)',
    borderRadius: '0px',
    border: 'none',
    boxShadow: `
         none
        `
  }}>
      <CardContent className="p-6 relative overflow-visible px-0">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 opacity-0 pointer-events-none" style={{
        background: 'none',
        borderRadius: '0px'
      }} />
        
        <div className="relative z-10">
          {/* Tax Year Display */}
          <div className="flex justify-center mb-6">
            <div className="text-center">
              <span className="font-semibold text-lg text-black">
                {taxYear || '2024'}
              </span>
            </div>
          </div>

          {/* Current Step Info */}
          <div className="text-center mb-6">
            <h3 className="font-medium text-lg mb-2 text-black">
              {updatedSteps[currentStepIndex]?.title || t.taxReturn.loadingError}
            </h3>
            <p className="text-sm text-black">
              {t.taxReturn.currentProcessing}
            </p>
          </div>

          {/* Steps List */}
          <div className="space-y-3">
            {updatedSteps.map((step, index) => {
            const Icon = step.icon;
            return <div key={step.id} className="flex items-center space-x-3 p-3 rounded-lg" style={{
              background: step.active ? 'rgba(82, 152, 228, 0.2)' : step.completed ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
              border: step.active ? '1px solid rgba(82, 152, 228, 0.3)' : '1px solid transparent'
            }}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center`} style={{
                backgroundColor: step.completed ? 'rgba(34, 197, 94, 0.2)' : step.active ? '#EEF7FF' : 'rgba(255, 255, 255, 0.2)'
              }}>
                    {step.completed ? <Check className="w-4 h-4" style={{
                  color: '#fff'
                }} /> : <Icon className={`w-4 h-4 ${step.active ? 'text-black' : 'text-black/60'}`} />}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium ${step.active ? 'text-black' : step.completed ? 'text-black' : 'text-black/80'}`}>
                      {step.title}
                    </p>
                  </div>
                </div>;
          })}
          </div>
        </div>
      </CardContent>
    </Card>;
}
