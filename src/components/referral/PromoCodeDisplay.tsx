import React from 'react';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { Gift, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface PromoCodeDisplayProps {
  showInPayment?: boolean;
}

export const PromoCodeDisplay: React.FC<PromoCodeDisplayProps> = ({ showInPayment = false }) => {
  const { promoCodes, isLoading, getActivePromoCode, getTotalSavings } = usePromoCodes();

  const activePromo = getActivePromoCode();
  const totalSavings = getTotalSavings();

  if (isLoading || !activePromo) {
    return null;
  }

  const formatCurrency = (amount: number) => {
    return `CHF ${(amount / 100).toFixed(2)}`;
  };

  if (showInPayment) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-green-500/10 border border-green-500/20 rounded-lg p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-500/20 rounded-full">
              <Gift className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="font-medium text-green-700 dark:text-green-400">
                Rabattcode aktiv
              </p>
              <p className="text-sm text-muted-foreground">
                Code <span className="font-mono">{activePromo.code}</span> wird angewendet
              </p>
            </div>
          </div>
          <div className="text-xl font-bold text-green-600">
            -{formatCurrency(activePromo.amount)}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-xl p-4"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-green-500/20 rounded-full">
          <CheckCircle className="h-5 w-5 text-green-500" />
        </div>
        <div className="flex-1">
          <p className="font-medium text-green-700 dark:text-green-400">
            Du hast {promoCodes.length} Rabattcode{promoCodes.length > 1 ? 's' : ''}
          </p>
          <p className="text-sm text-muted-foreground">
            Gesamtersparnis: {formatCurrency(totalSavings)}
          </p>
        </div>
      </div>
    </motion.div>
  );
};
