import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface AISphereProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

/**
 * Animated AI Sphere using pure CSS/Framer Motion
 * A glowing, pulsing orb that represents AI processing
 */
export const AISphere: React.FC<AISphereProps> = ({
  className,
  size = 'medium'
}) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-24 h-24',
    large: 'w-32 h-32'
  };

  const innerSizes = {
    small: 'w-10 h-10',
    medium: 'w-14 h-14',
    large: 'w-20 h-20'
  };

  return (
    <div className={cn(
      'relative flex items-center justify-center',
      sizeClasses[size],
      className
    )}>
      {/* Outer glow ring - pulsing */}
      <motion.div
        className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 via-blue-400/15 to-violet-500/20"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.5, 0.3, 0.5],
        }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Secondary ring - counter-pulse */}
      <motion.div
        className="absolute inset-2 rounded-full bg-gradient-to-tr from-blue-500/25 via-primary/20 to-indigo-400/25"
        animate={{
          scale: [1.05, 0.95, 1.05],
          opacity: [0.4, 0.6, 0.4],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 0.3
        }}
      />

      {/* Inner sphere - main orb */}
      <motion.div
        className={cn(
          'relative rounded-full bg-gradient-to-br from-primary via-blue-500 to-indigo-600 shadow-lg shadow-primary/40',
          innerSizes[size]
        )}
        animate={{
          scale: [1, 1.05, 1],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Shine effect */}
        <div className="absolute inset-0 rounded-full overflow-hidden">
          <div className="absolute top-1 left-1/4 w-1/3 h-1/4 bg-white/40 rounded-full blur-sm" />
          <motion.div 
            className="absolute inset-0 bg-gradient-to-t from-transparent via-white/10 to-white/20"
            animate={{
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </div>

        {/* Core glow */}
        <motion.div
          className="absolute inset-3 rounded-full bg-white/20 blur-md"
          animate={{
            opacity: [0.4, 0.7, 0.4],
            scale: [0.8, 1, 0.8],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </motion.div>

      {/* Orbiting particles */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary/60 shadow-sm shadow-primary/50" />
      </motion.div>

      <motion.div
        className="absolute inset-0"
        animate={{ rotate: -360 }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <div className="absolute bottom-1 right-1/4 w-1.5 h-1.5 rounded-full bg-blue-400/50" />
      </motion.div>

      {/* Subtle sparkle effects */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 180 }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: "linear"
        }}
      >
        <motion.div 
          className="absolute top-2 right-2 w-1 h-1 rounded-full bg-white"
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 0.5
          }}
        />
      </motion.div>
    </div>
  );
};

export default AISphere;
