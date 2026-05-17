import React from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, CheckCircle2, ArrowRight, Sparkles } from 'lucide-react';
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

const StatTile: React.FC<{
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  icon?: React.ReactNode;
  accent?: boolean;
}> = ({ label, value, sub, icon, accent }) => (
  <div
    className={cn(
      'rounded-[16px] px-4 py-3.5 ring-1 transition-colors',
      accent
        ? 'bg-foreground text-background ring-foreground'
        : 'bg-white ring-black/[0.05]'
    )}
  >
    <div className={cn(
      'flex items-center gap-1.5 text-[10.5px] font-medium uppercase tracking-[0.08em]',
      accent ? 'text-background/65' : 'text-muted-foreground/70'
    )}>
      {icon}
      <span>{label}</span>
    </div>
    <div className={cn(
      'mt-1.5 text-[19px] font-semibold tracking-[-0.02em] tabular-nums leading-none',
      accent ? 'text-background' : 'text-foreground'
    )}>
      {value}
    </div>
    {sub && (
      <div className={cn(
        'mt-1.5 text-[11.5px] leading-snug',
        accent ? 'text-background/70' : 'text-muted-foreground/80'
      )}>
        {sub}
      </div>
    )}
  </div>
);

export const DesktopHero: React.FC<DesktopHeroProps> = ({
  firstName,
  taxYear,
  percent,
  stepsDone,
  totalSteps,
  avatarUrl,
}) => {
  const navigate = useNavigate();
  const stepsLeft = Math.max(totalSteps - stepsDone, 0);
  const deadline = taxYear ? `31. März ${parseInt(taxYear) + 1}` : '31. März';

  const nextAction =
    percent >= 100 ? 'Erklärung abgeschlossen'
    : percent >= 67 ? 'Unterlagen prüfen'
    : percent >= 33 ? 'Belege hochladen'
    : 'Persönliche Daten erfassen';

  return (
    <section className="hidden md:block pb-7">
      {/* Top utility row */}
      <div className="flex items-center justify-between gap-2 mb-7">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted-foreground/65">
            Übersicht
          </span>
          <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
          <span className="text-[11px] text-muted-foreground/60 tabular-nums">
            {new Date().toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ProfileWithNotifications avatarUrl={avatarUrl ?? undefined} firstName={firstName ?? undefined} />
          <TaxFilerSelector />
        </div>
      </div>

      {/* Headline + CTA row */}
      <div className="flex items-end justify-between gap-6 mb-5">
        <div className="min-w-0">
          <h1 className="text-[28px] xl:text-[30px] font-semibold tracking-[-0.028em] text-foreground leading-[1.1]">
            Willkommen zurück{firstName ? `, ${firstName}` : ''}
          </h1>
          <p className="text-[13.5px] text-muted-foreground/85 mt-2 tracking-[-0.005em]">
            {taxYear ? `Steuerjahr ${taxYear} · ` : ''}
            <span className="tabular-nums font-medium text-foreground/85">{percent}% abgeschlossen</span>
            <span className="mx-1.5 text-muted-foreground/40">·</span>
            <span className="tabular-nums">{stepsDone} von {totalSteps} Schritten erledigt</span>
          </p>
        </div>
        <button
          onClick={() => navigate('/?section=kontakt')}
          className="hidden xl:inline-flex items-center gap-2 h-9 px-4 rounded-full bg-foreground text-background text-[12.5px] font-medium tracking-[-0.005em] hover:bg-foreground/90 transition-colors shadow-[0_4px_14px_-4px_rgba(15,27,61,0.25)]"
        >
          <Sparkles className="w-[13px] h-[13px]" strokeWidth={2} />
          {nextAction}
          <ArrowRight className="w-[13px] h-[13px]" strokeWidth={2} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-4 mb-5">
        <div className="flex-1 h-[5px] rounded-full bg-foreground/[0.06] overflow-hidden">
          <div
            className="h-full rounded-full bg-foreground transition-[width] duration-700 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <span className="text-[11px] font-medium text-muted-foreground/75 tabular-nums tracking-[-0.005em]">
          {percent}%
        </span>
      </div>

      {/* Metric tiles */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
        <StatTile
          label="Steuerjahr"
          value={taxYear || '—'}
          sub="Aktiv ausgewählt"
        />
        <StatTile
          label="Fortschritt"
          value={`${stepsDone}/${totalSteps}`}
          sub={stepsLeft === 0 ? 'Alle Schritte erledigt' : `Noch ${stepsLeft} Schritt${stepsLeft === 1 ? '' : 'e'} offen`}
          icon={<CheckCircle2 className="w-[11px] h-[11px]" strokeWidth={2} />}
        />
        <StatTile
          label="Nächste Frist"
          value={deadline}
          sub="Einreichungsfrist"
          icon={<CalendarClock className="w-[11px] h-[11px]" strokeWidth={2} />}
        />
        <StatTile
          label="Empfohlen"
          value={nextAction}
          sub="Tippe oben rechts, um fortzufahren"
          accent
        />
      </div>
    </section>
  );
};

export default DesktopHero;
