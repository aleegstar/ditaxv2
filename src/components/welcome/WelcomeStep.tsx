import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface WelcomeStepProps {
  title: string;
  children: ReactNode;
  variant?: 'light' | 'dark';
}

export const WelcomeStep = ({ title, children, variant = 'dark' }: WelcomeStepProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="w-full flex flex-col items-center text-center space-y-6 md:space-y-8 px-4"
    >
      <h1 className={`text-2xl font-bold leading-tight ${
        variant === 'light' 
          ? 'text-slate-900' 
          : 'bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent'
      }`}>
        {title}
      </h1>

      <div className="w-full flex justify-center">
        {children}
      </div>
    </motion.div>
  );
};
