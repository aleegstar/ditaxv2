import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { isAndroidEnvironment } from '@/utils/platform';

interface AnimatedPageContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.04,
    },
  },
};

export const staggerItem = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export const AnimatedPageContainer: React.FC<AnimatedPageContainerProps> = ({
  children,
  className,
  delay = 0
}) => {
  if (isAndroidEnvironment()) {
    return (
      <div className={cn("pb-20 md:pb-0", className)}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={cn("pb-20 md:pb-0", className)}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {children}
    </motion.div>
  );
};
