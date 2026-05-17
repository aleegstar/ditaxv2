import React from 'react';
import { Bell } from 'lucide-react';
import { ProfileWithNotifications } from '@/components/ui/profile-with-notifications';
import TaxFilerSelector from '@/components/dashboard/TaxFilerSelector';
import { cn } from '@/lib/utils';

interface DesktopHeroProps {
  firstName?: string | null;
  taxYear?: string | null;
  percent: number;
  stepsDone: number;
  totalSteps: number;
  avatarUrl?: string | null;
}

export const DesktopHero: React.FC<DesktopHeroProps> = ({
  firstName,
  taxYear,
  percent,
  stepsDone,
  totalSteps,
  avatarUrl,
}) => {
  return (
    <section className="hidden md:block pb-8">
      {/* Top utility row: notifications + filer pill */}
      <div className="flex items-center justify-end gap-1.5 mb-8">
        <ProfileWithNotifications avatarUrl={avatarUrl ?? undefined} firstName={firstName ?? undefined} />
        <TaxFilerSelector />
      </div>

      {/* Headline */}
      <h1 className="text-[28px] xl:text-[30px] font-semibold tracking-[-0.028em] text-foreground leading-[1.1]">
        Willkommen zurück{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-[13.5px] text-muted-foreground/85 mt-2 tracking-[-0.005em]">
        {taxYear ? `Steuerjahr ${taxYear} · ` : ''}
        <span className="tabular-nums">{percent}% abgeschlossen</span>
      </p>

      {/* Progress bar */}
      <div className="mt-5 flex items-center gap-4">
        <div className="flex-1 h-[5px] rounded-full bg-foreground/[0.06] overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full bg-foreground transition-[width] duration-700 ease-out'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[12px] font-medium text-foreground tabular-nums tracking-[-0.005em]">
            {stepsDone} von {totalSteps} Schritten
          </span>
          <span className="text-[10.5px] text-muted-foreground/70">abgeschlossen</span>
        </div>
      </div>
    </section>
  );
};

export default DesktopHero;
