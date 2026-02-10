import React from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

interface ExpressUpgradeCardProps {
  taxReturnId: string;
  currentExpressService: boolean;
  className?: string;
}

export const ExpressUpgradeCard: React.FC<ExpressUpgradeCardProps> = ({
  taxReturnId,
  currentExpressService,
  className
}) => {
  const navigate = useNavigate();

  if (currentExpressService) {
    return null;
  }

  const handleUpgrade = () => {
    navigate(`/payment?upgrade=true&returnId=${taxReturnId}`);
  };

  return (
    <div className="px-6 mt-8">
      <div className="rounded-2xl p-5 relative overflow-hidden bg-slate-50 border border-slate-200">
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-3">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500/20" />
            <h3 className="text-sm font-semibold text-slate-800">Express-Service</h3>
          </div>
          
          <p className="text-xs text-slate-500 leading-relaxed mb-6">
            Möchtest du deine Steuererklärung schneller erhalten? Mit unserem Express-Service wird deine Steuererklärung bevorzugt bearbeitet.
          </p>

          {/* Comparison Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Standardlieferung</div>
              <div className="text-xs font-medium text-slate-600">Variierende Bearbeitungszeit</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold mb-1">Express-Lieferung</div>
              <div className="text-xs font-semibold text-[#1D64FF]">Innert 10 Tagen</div>
            </div>
          </div>

          {/* Action Box */}
          <div className="bg-white rounded-xl p-4 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-medium text-slate-400">Upgrade-Preis</span>
              <span className="text-sm font-bold text-slate-800">CHF 100.00</span>
            </div>
            
            <Button
              onClick={handleUpgrade}
              className="w-full h-11 rounded-xl bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white font-semibold text-sm flex items-center justify-center gap-2 border-0 shadow-none"
            >
              Jetzt auf Express upgraden
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
