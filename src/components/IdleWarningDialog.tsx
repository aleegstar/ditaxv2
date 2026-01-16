import React from 'react';
import {
  UnifiedAlertDialog,
  UnifiedAlertDialogAction,
  UnifiedAlertDialogContent,
  UnifiedAlertDialogDescription,
  UnifiedAlertDialogFooter,
  UnifiedAlertDialogHeader,
  UnifiedAlertDialogIcon,
  UnifiedAlertDialogTitle,
} from '@/components/ui/unified-alert-dialog';
import { Clock } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface IdleWarningDialogProps {
  isOpen: boolean;
  timeLeft: number;
  onExtendSession: () => void;
}

export function IdleWarningDialog({ isOpen, timeLeft, onExtendSession }: IdleWarningDialogProps) {
  const { t } = useI18n();

  const formatTime = (milliseconds: number) => {
    const totalSeconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <UnifiedAlertDialog open={isOpen}>
      <UnifiedAlertDialogContent showCloseButton={false}>
        <UnifiedAlertDialogHeader>
          <UnifiedAlertDialogIcon variant="warning">
            <Clock className="w-8 h-8 text-orange-500" />
          </UnifiedAlertDialogIcon>
          <UnifiedAlertDialogTitle>
            {t.idle.title}
          </UnifiedAlertDialogTitle>
          <UnifiedAlertDialogDescription>
            {t.idle.message} <span className="font-semibold text-orange-500">{formatTime(timeLeft)}</span>.
            <br />
            <br />
            {t.idle.extendSession}?
          </UnifiedAlertDialogDescription>
        </UnifiedAlertDialogHeader>
        <UnifiedAlertDialogFooter>
          <UnifiedAlertDialogAction onClick={onExtendSession}>
            {t.idle.extendSession}
          </UnifiedAlertDialogAction>
        </UnifiedAlertDialogFooter>
      </UnifiedAlertDialogContent>
    </UnifiedAlertDialog>
  );
}
