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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
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

  // Prevent hydration mismatch — don't render until after mount
  if (!mounted || dismissed) return null;

  return (
    <div
      className={cn(
        'relative z-[9999] w-full bg-[#fff7ed] border-b border-[#fed7aa] px-4 py-3 md:px-6',
        className
      )}
      role="alert"
    >
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-2.5 min-w-0">
          <AlertTriangle
            className="w-[18px] h-[18px] text-[#ea580c] shrink-0"
            strokeWidth={1.75}
          />
          <span className="text-[13px] md:text-[14px] font-medium text-[#9a3412] leading-snug">
            {message}
          </span>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 p-1.5 rounded-full text-[#ea580c]/70 hover:text-[#9a3412] hover:bg-[#ffedd5] transition"
          aria-label="Schliessen"
        >
          <X className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
};

export default MaintenanceBanner;
