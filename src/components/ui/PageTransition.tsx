import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
  },
};

const pageTransition = {
  duration: 0.15,
  ease: [0.22, 0.61, 0.36, 1] as const, // easeOutCubic — quick + smooth
};

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  const location = useLocation();
  const transitionKey = `${location.pathname}${location.search}`;
  const disableTransition = location.pathname === '/payment-success';

  if (disableTransition) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={transitionKey}
      initial="initial"
      animate="animate"
      variants={pageVariants}
      transition={pageTransition}
      className={className}
      style={{ willChange: 'opacity' }}
    >
      {children}
    </motion.div>
  );
};
