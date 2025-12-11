
import React from 'react';
import { cn } from '@/lib/utils';

interface NotificationBadgeProps {
  count: number;
  children: React.ReactNode;
  className?: string;
  show?: boolean;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  children, 
  className,
  show = true
}) => {
  return (
    <div className={cn("relative inline-block", className)}>
      {children}
      {show && count > 0 && (
        <div className="absolute -top-2 -right-2 z-50">
          <div className="bg-red-500 text-black text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-lg border-2 border-white">
            {count > 99 ? '99+' : count}
          </div>
        </div>
      )}
    </div>
  );
};
