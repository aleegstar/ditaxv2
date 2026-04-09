import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 6,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -4,
  },
};

const pageTransition = {
  duration: 0.18,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  const location = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={location.pathname}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
        style={{ willChange: 'opacity', minHeight: 'inherit' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};
