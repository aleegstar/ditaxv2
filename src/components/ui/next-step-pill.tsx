import React from 'react';
import { Play } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NextStepPillProps {
  className?: string;
  text?: string;
}

export const NextStepPill: React.FC<NextStepPillProps> = ({
  className,
  text = 'Nächster Schritt',
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
        'bg-white/20 text-white ring-1 ring-white/30 backdrop-blur',
        className,
      )}
      aria-label={text}
    >
      <Play className="w-3.5 h-3.5" aria-hidden="true" />
      {text}
    </span>
  );
};