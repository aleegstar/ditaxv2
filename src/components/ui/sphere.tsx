import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface SphereProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
  triggerPulse?: boolean;
  onPulseComplete?: () => void;
}

export const Sphere: React.FC<SphereProps> = ({
  className,
  size = 'medium',
  triggerPulse = false,
  onPulseComplete
}) => {
  const [showPulse, setShowPulse] = useState(false);

  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  useEffect(() => {
    if (triggerPulse) {
      setShowPulse(true);
      const timer = setTimeout(() => {
        setShowPulse(false);
        onPulseComplete?.();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [triggerPulse, onPulseComplete]);

  return (
    <div className={cn(
      'relative rounded-full flex items-center justify-center overflow-hidden',
      sizeClasses[size],
      showPulse && 'animate-pulse',
      className
    )}>
      <img
        src="/sphere-animation.gif"
        alt="AI Sphere"
        className="w-[140%] h-[140%] object-cover rounded-full"
      />
    </div>
  );
};