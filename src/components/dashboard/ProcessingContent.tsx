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
      <div className="mb-12">
        <ExpressUpgradeCard taxReturnId={taxReturnId} currentExpressService={expressService} />
      </div>
      <TrackingProgressSteps workflowStep={workflowStep} />
    </div>
  );
};
