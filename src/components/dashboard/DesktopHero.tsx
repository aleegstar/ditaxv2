import React from 'react';

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
}) => {
  return (
    <section className="hidden md:block mb-10 mt-4">
      <h1 className="text-[28px] xl:text-[30px] font-semibold tracking-[-0.022em] text-slate-900 leading-[1.15]">
        Willkommen zurück{firstName ? `, ${firstName}` : ''}
      </h1>
      <p className="text-[15px] text-slate-500 mt-2">
        {taxYear ? `Steuerjahr ${taxYear} ` : ''}
        <span className="mx-1.5 text-slate-300">•</span>
        <span className="tabular-nums">{percent}% abgeschlossen</span>
      </p>

      <div className="mt-8 flex items-center gap-6">
        <div className="flex-1 h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-slate-900 rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>
    </section>
  );
};

export default DesktopHero;
