import { AnimatePresence, motion } from 'framer-motion';
import { ReactNode, cloneElement, isValidElement } from 'react';
import { useLocation, Routes } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -6,
  },
};

const pageTransition = {
  duration: 0.22,
  ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
};

export const PageTransition = ({ children, className }: PageTransitionProps) => {
  const location = useLocation();
  
  // Use pathname + search as key so query param changes also animate
  const locationKey = location.pathname;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={locationKey}
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
        transition={pageTransition}
        className={className}
        style={{ willChange: 'opacity, transform', minHeight: 'inherit' }}
      >
        {/* Clone Routes children with location prop so AnimatePresence works */}
        {isValidElement(children) && children.type === Routes
          ? cloneElement(children as React.ReactElement<any>, { location })
          : children
        }
      </motion.div>
    </AnimatePresence>
  );
};
