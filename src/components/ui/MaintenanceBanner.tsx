import React, { useState, useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MaintenanceBannerProps {
  message?: string;
  className?: string;
}

const STORAGE_KEY = 'ditax_maintenance_banner_dismissed';

export const MaintenanceBanner: React.FC<MaintenanceBannerProps> = ({
  message = 'Wartungsarbeiten laufen. Einige Funktionen könnten vorübergehend eingeschränkt sein.',
  className,
}) => {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDismissed(localStorage.getItem(STORAGE_KEY) === '1');
    }
  }, []);

  const handleDismiss = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, '1');
    }
    setDismissed(true);
  };

  if (dismissed) return null;

  return (
    <div
      className={cn(
        'relative w-full bg-amber-50 border-b border-amber-200 px-4 py-3 md:px-6',
        className
      )}
      role="alert"
    >
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle
            className="w-[18px] h-[18px] text-amber-600 shrink-0"
            strokeWidth={1.75}
          />
          <span className="text-[13px] md:text-[14px] font-medium text-amber-800 leading-snug">
            {message}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 p-1.5 rounded-full text-amber-600/70 hover:text-amber-800 hover:bg-amber-100 transition"
          aria-label="Schliessen"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};

export default MaintenanceBanner;
