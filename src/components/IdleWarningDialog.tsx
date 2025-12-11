
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
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
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-md bg-background border">"
        <AlertDialogHeader>
          <AlertDialogTitle className="text-center">
            {t.idle.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            {t.idle.message} <span className="font-semibold text-orange-400">{formatTime(timeLeft)}</span>.
            <br />
            <br />
            {t.idle.extendSession}?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex justify-center gap-3">
          <AlertDialogAction asChild>
            <Button onClick={onExtendSession} className="bg-primary text-primary-foreground hover:bg-primary/90">
              {t.idle.extendSession}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
