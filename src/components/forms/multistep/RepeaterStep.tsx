import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check, ArrowRight } from 'lucide-react';
import { isAndroidEnvironment } from '@/utils/platform';
import { EmployerRepeater } from '../repeaters/EmployerRepeater';
import { RentalIncomeRepeater } from '../repeaters/RentalIncomeRepeater';
import { VehicleRepeater } from '../repeaters/VehicleRepeater';
import { PropertyRepeater } from '../repeaters/PropertyRepeater';
import { DebtRepeater } from '../repeaters/DebtRepeater';
import { YesNoQuestion } from '@/types/multiStepYesNo';
interface RepeaterStepProps {
  question: YesNoQuestion;
  data: any[];
  onDataChange: (data: any[]) => void;
  onContinue: () => void;
  canContinue: boolean;
}
export const RepeaterStep: React.FC<RepeaterStepProps> = ({
  question,
  data,
  onDataChange,
  onContinue,
  canContinue
}) => {
  const isAndroid = isAndroidEnvironment();
  const renderRepeater = () => {
    if (!question.requiresRepeater) return null;
    const {
      component
    } = question.requiresRepeater;
    switch (component) {
      case 'EmployerRepeater':
        return <EmployerRepeater employers={data} onChange={onDataChange} />;
      case 'RentalIncomeRepeater':
        return <RentalIncomeRepeater rentalIncomes={data} onChange={onDataChange} />;
      case 'VehicleRepeater':
        return <VehicleRepeater vehicles={data} onUpdate={onDataChange} />;
      case 'PropertyRepeater':
        return <PropertyRepeater properties={data} onUpdate={onDataChange} />;
      case 'DebtRepeater':
        return <DebtRepeater debts={data} onUpdate={onDataChange} />;
      default:
        return null;
    }
  };

  // Android-safe version without motion or blur
  if (isAndroid) {
    return <div className="w-full max-w-4xl mx-auto space-y-6">
        {/* Repeater Content */}
        <div className="space-y-4">
          {renderRepeater()}
        </div>

        {/* Validation Message */}
        {!canContinue && data.length === 0 && <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-400">
              Du musst mindestens einen Eintrag erfassen um fortzufahren.
            </p>
          </div>}

        {/* Continue Button */}
        <div className="flex justify-center pt-4">
          <Button onClick={onContinue} disabled={!canContinue} className="w-full">
            {canContinue ? <>
                <Check className="w-5 h-5 mr-2" />
                Weiter
              </> : 'Mindestens 1 Eintrag erforderlich'}
          </Button>
        </div>
      </div>;
  }

  // Original version with animations for web
  return <motion.div initial={{
    opacity: 0,
    y: 20
  }} animate={{
    opacity: 1,
    y: 0
  }} exit={{
    opacity: 0,
    y: -20
  }} transition={{
    duration: 0.3
  }} className="w-full max-w-4xl mx-auto space-y-6">
      {/* Repeater Content */}
      <div className="space-y-4">
        {renderRepeater()}
      </div>

      {/* Validation Message */}
      {!canContinue && data.length === 0 && <motion.div initial={{
      opacity: 0,
      scale: 0.95
    }} animate={{
      opacity: 1,
      scale: 1
    }} className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-sm text-red-400">Du musst mindestens einen Eintrag erfassen, um fortzufahren.</p>
        </motion.div>}

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button onClick={onContinue} disabled={!canContinue} className="w-full">
          {canContinue ? <>
              <Check className="w-5 h-5 mr-2" />
              Weiter
            </> : 'Mindestens 1 Eintrag erforderlich'}
        </Button>
      </div>
    </motion.div>;
};