import { RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PullToRefreshIndicatorProps {
  pullDistance: number;
  isRefreshing: boolean;
  threshold?: number;
}

export const PullToRefreshIndicator = ({
  pullDistance,
  isRefreshing,
  threshold = 60
}: PullToRefreshIndicatorProps) => {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = pullDistance * 3.6;
  const isReady = pullDistance > threshold;

  return (
    <AnimatePresence>
      {pullDistance > 0 && (
        <motion.div
          className="fixed top-0 left-0 right-0 flex justify-center pt-4 z-50 pointer-events-none"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className={`p-3 rounded-full shadow-lg ${
              isReady || isRefreshing 
                ? 'bg-[#1D64FF] text-white' 
                : 'bg-white text-slate-500'
            }`}
            animate={{ scale: isReady ? 1.1 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <RefreshCw
              className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`}
              style={{ 
                transform: isRefreshing ? undefined : `rotate(${rotation}deg)`,
                opacity: 0.3 + (progress * 0.7)
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
