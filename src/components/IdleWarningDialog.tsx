import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
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
    <Drawer open={isOpen} dismissible={false}>
      <DrawerContent variant="bottom-sheet" className="px-6 pb-8 pt-2 overflow-hidden">
        <div className="mb-6" />

        <div className="text-center space-y-2 mb-6">
          <div className="w-16 h-16 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-2">
            <Clock className="w-8 h-8 text-orange-500" />
          </div>
          <DrawerTitle className="text-xl font-bold text-foreground">
            {t.idle.title}
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            {t.idle.message}{' '}
            <span className="font-semibold text-orange-500">{formatTime(timeLeft)}</span>.
          </DrawerDescription>
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            onClick={onExtendSession}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          >
            {t.idle.extendSession}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
