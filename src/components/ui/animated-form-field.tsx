import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AnimatedFormFieldProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

export const AnimatedFormField: React.FC<AnimatedFormFieldProps> = ({
  children,
  className,
  delay = 0
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2, delay, ease: "easeOut" }}
      whileHover={{ scale: 1.005 }}
      className={cn("", className)}
    >
      {children}
    </motion.div>
  );
};