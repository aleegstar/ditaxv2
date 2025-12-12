import React from 'react';
import { Zap, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
      <div 
        className="rounded-2xl p-5 relative overflow-hidden group"
        style={{
          background: 'rgba(255, 255, 255, 0.02)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-transparent opacity-50 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-2.5 mb-3">
            <Zap className="w-4 h-4 text-yellow-400 fill-yellow-400/20" />
            <h3 className="text-sm font-semibold text-white">Express-Service</h3>
          </div>
          
          <p className="text-xs text-zinc-400 leading-relaxed mb-6">
            Möchtest du deine Steuererklärung schneller erhalten? Mit unserem Express-Service wird deine Steuererklärung bevorzugt bearbeitet.
          </p>

          {/* Comparison Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">Standardlieferung</div>
              <div className="text-xs font-medium text-zinc-300">Variierende Bearbeitungszeit</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-zinc-600 font-semibold mb-1">Express-Lieferung</div>
              <div className="text-xs font-semibold text-blue-400">Innert 10 Tagen</div>
            </div>
          </div>

          {/* Action Box */}
          <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
            <div className="flex justify-between items-center mb-4">
              <span className="text-xs font-medium text-zinc-400">Upgrade-Preis</span>
              <span className="text-sm font-bold text-white">CHF 100.00</span>
            </div>
            
            <button
              onClick={handleUpgrade}
              className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white text-xs font-semibold py-3 rounded-lg shadow-[0_0_20px_-5px_rgba(37,99,235,0.6)] transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Jetzt auf Express upgraden
              <ArrowRight className="w-3.5 h-3.5 opacity-80" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
