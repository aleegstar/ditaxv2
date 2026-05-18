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
        Grüezi{firstName ? `, ${firstName}` : ''}
      </h1>
    </section>
  );
};

export default DesktopHero;
