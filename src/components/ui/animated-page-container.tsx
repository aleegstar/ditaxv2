import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isAndroidEnvironment } from '@/utils/platform';

interface AnimatedPageContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedPageContainer: React.FC<AnimatedPageContainerProps> = ({
  children,
  className,
  delay = 0
}) => {
  // Use plain div on Android to avoid WebView animation issues
  if (isAndroidEnvironment()) {
    return (
      <div className={cn("pb-20 md:pb-0", className)}>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("pb-20 md:pb-0", className)}>
      {children}
    </div>
  );
};