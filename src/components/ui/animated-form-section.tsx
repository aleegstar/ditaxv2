import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedFormSectionProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedFormSection: React.FC<AnimatedFormSectionProps> = ({
  children,
  className,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: "easeOut" }}
      className={cn("", className)}
    >
      {children}
    </motion.div>
  );
};