import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { useI18n } from '@/contexts/I18nContext';
import idleCouple from '@/assets/idle-couple.webp';

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
      <DrawerContent variant="bottom-sheet" className="px-0 pb-8 pt-2 overflow-hidden">
        <div className="mb-4" />

        {/* Hero card — matches dashboard "Vorjahres" card pattern */}
        <div className="mx-5 sm:mx-6 rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
          <div className="relative h-36 sm:h-40 bg-muted overflow-hidden">
            <img
              src={idleCouple}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-card/95 backdrop-blur px-2.5 py-1 text-[11px] font-medium text-foreground shadow-sm border border-border tabular-nums">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
              {formatTime(timeLeft)}
            </div>
          </div>
          <div className="px-5 py-5">
            <DrawerTitle className="text-[17px] font-semibold text-foreground tracking-tight">
              {t.idle.title}
            </DrawerTitle>
            <DrawerDescription className="text-[13px] text-muted-foreground mt-1.5 leading-relaxed">
              {t.idle.message}{' '}
              <span className="font-semibold text-orange-500 tabular-nums">{formatTime(timeLeft)}</span>.
            </DrawerDescription>
          </div>
        </div>

        <div className="px-5 sm:px-6 mt-5">
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
