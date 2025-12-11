import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export const AnimatedHeader: React.FC<AnimatedHeaderProps> = ({
  children,
  className
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={cn("", className)}
    >
      {children}
    </motion.div>
  );
};