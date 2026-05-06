import React from 'react';
import { TrackingProgressSteps } from '@/components/tax-tracking/TrackingProgressSteps';
import { ExpressUpgradeCard } from '@/components/tax-tracking/ExpressUpgradeCard';

interface ProcessingContentProps {
  taxReturnId: string;
  workflowStep: string;
  expressService: boolean;
}

export const ProcessingContent: React.FC<ProcessingContentProps> = ({
  taxReturnId,
  workflowStep,
  expressService,
}) => {
  return (
    <div className="w-full">
      <TrackingProgressSteps workflowStep={workflowStep} />
      <div className="mt-12 -mx-6">
        <ExpressUpgradeCard taxReturnId={taxReturnId} currentExpressService={expressService} />
      </div>
    </div>
  );
};
