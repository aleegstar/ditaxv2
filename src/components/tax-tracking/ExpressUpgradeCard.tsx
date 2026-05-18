import React from 'react';
import { Zap, ChevronRight } from 'lucide-react';
import expressHero from '@/assets/tracking-hero.webp';
import { useNavigate } from 'react-router-dom';

interface ExpressUpgradeCardProps {
  taxReturnId: string;
  currentExpressService: boolean;
  className?: string;
}

export const ExpressUpgradeCard: React.FC<ExpressUpgradeCardProps> = ({
  taxReturnId,
  currentExpressService,
}) => {
  const navigate = useNavigate();

  if (currentExpressService) return null;

  const handleUpgrade = () => {
    navigate(`/payment?upgrade=true&returnId=${taxReturnId}`);
  };

  return (
    <div className="relative rounded-2xl border border-border bg-card overflow-hidden shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]">
      {/* Hero image */}
      <div className="relative h-40 w-full overflow-hidden bg-muted">
        <img
          src={expressHero}
          alt="Lachendes Paar – Express-Service"
          loading="lazy"
          className="w-full h-full object-cover"
        />
        <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border/60">
          <Zap className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
          <span className="text-[11px] font-medium text-foreground">Innert 10 Tagen</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-5">
        <div>
          <h3 className="text-[16px] font-semibold text-foreground tracking-tight">
            Express-Service
          </h3>
          <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
            Deine Steuererklärung bevorzugt bearbeiten – fertig innert 10 Tagen.
          </p>
        </div>

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-background/50 p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
              Standard
            </div>
            <div className="text-[12.5px] font-medium text-foreground/80">
              Variierende Dauer
            </div>
          </div>
          <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3">
            <div className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-1">
              Express
            </div>
            <div className="text-[12.5px] font-semibold text-primary">
              Innert 10 Tagen
            </div>
          </div>
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">
              Upgrade
            </div>
            <div className="text-[18px] font-semibold text-foreground tabular-nums">
              CHF 100<span className="text-muted-foreground font-normal">.00</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleUpgrade}
            className="inline-flex items-center justify-center gap-2 h-12 px-5 rounded-2xl bg-gradient-to-b from-[#1E3A5F] to-[#0F1B3D] text-white text-[14px] font-medium shadow-[0_4px_16px_-4px_rgba(15,27,61,0.3)] hover:shadow-[0_8px_24px_-4px_rgba(15,27,61,0.4)] transition-all"
          >
            Jetzt upgraden
            <ChevronRight className="w-4 h-4 text-white/90" strokeWidth={2} />
          </button>
        </div>
      </div>
    </div>
  );
};
