import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle, Check } from 'lucide-react';
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
        {/* Header Card */}
        <Card className="bg-card border-border">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-semibold">
              {question.requiresRepeater?.title}
            </CardTitle>
            <p className="text-muted-foreground">
              Bitte erfasse mindestens einen Eintrag um fortzufahren
            </p>
          </CardHeader>
        </Card>

        {/* Repeater Content */}
        <div className="space-y-4">
          {renderRepeater()}
        </div>

        {/* Validation Message */}
        {!canContinue && data.length === 0 && <div className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <p className="text-sm text-destructive">
              Du musst mindestens einen Eintrag erfassen um fortzufahren.
            </p>
          </div>}

        {/* Continue Button */}
        <div className="flex justify-center pt-4">
          <Button onClick={onContinue} disabled={!canContinue} className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]" style={{
          boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px'
        }}>
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
      {/* Header Card */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-semibold">
            {question.requiresRepeater?.title}
          </CardTitle>
          <p className="text-muted-foreground">Bitte erfasse mindestens einen Eintrag, um fortzufahren.</p>
        </CardHeader>
      </Card>

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
    }} className="flex items-center gap-2 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertCircle className="w-5 h-5 text-destructive" />
          <p className="text-sm text-destructive">Du musst mindestens einen Eintrag erfassen, um fortzufahren.</p>
        </motion.div>}

      {/* Continue Button */}
      <div className="flex justify-center pt-4">
        <Button onClick={onContinue} disabled={!canContinue} className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]" style={{
        boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px'
      }}>
          {canContinue ? <>
              <Check className="w-5 h-5 mr-2" />
              Weiter
            </> : 'Mindestens 1 Eintrag erforderlich'}
        </Button>
      </div>
    </motion.div>;
};