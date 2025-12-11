import { motion } from 'framer-motion';
import { Shield, User, Calendar, CheckCircle } from 'lucide-react';

interface WelcomeJourneyPathProps {
  currentStep: number;
  totalSteps: number;
  variant?: 'light' | 'dark';
}

const stepIcons = [Shield, User, Calendar, CheckCircle];

export const WelcomeJourneyPath = ({ currentStep, totalSteps, variant = 'dark' }: WelcomeJourneyPathProps) => {
  const colors = variant === 'light'
    ? { pathBg: 'rgba(29, 100, 255, 0.2)', pathActive: '#1d64ff', circleActive: 'bg-[#1d64ff]', circlePast: 'bg-[#1d64ff]/90', circleFuture: 'bg-gray-200', glow: 'bg-[#1d64ff]/20' }
    : { pathBg: 'rgba(255, 255, 255, 0.2)', pathActive: 'white', circleActive: 'bg-white', circlePast: 'bg-white/90', circleFuture: 'bg-white/30', glow: 'bg-white/30' };

  // Calculate exact position along the arc matching the SVG path
  const getPositionOnArc = (index: number) => {
    const t = index / (totalSteps - 1); // 0 to 1
    
    // Match the SVG path: M 0,25 Q 25,10 50,8 T 100,25
    // This is a quadratic bezier curve
    const x = t * 100;
    
    // For the first half (0 to 0.5): quadratic bezier from (0,25) via (25,10) to (50,8)
    // For the second half (0.5 to 1): smooth continuation to (100,25)
    let y;
    if (t <= 0.5) {
      const localT = t * 2; // 0 to 1 for first segment
      // Quadratic bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
      const y0 = 25, y1 = 10, y2 = 8;
      y = Math.pow(1-localT, 2) * y0 + 2 * (1-localT) * localT * y1 + Math.pow(localT, 2) * y2;
    } else {
      const localT = (t - 0.5) * 2; // 0 to 1 for second segment
      // Mirror of first curve from (50,8) to (100,25)
      const y0 = 8, y1 = 10, y2 = 25;
      y = Math.pow(1-localT, 2) * y0 + 2 * (1-localT) * localT * y1 + Math.pow(localT, 2) * y2;
    }
    
    return { x, y };
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto h-24 md:h-32 mb-2">
      {/* Curved path SVG */}
      <svg 
        className="absolute bottom-0 left-0 w-full h-full" 
        viewBox="0 0 100 30" 
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        {/* Background path - subtle semicircle */}
        <motion.path
          d="M 0,25 Q 25,10 50,8 T 100,25"
          stroke={colors.pathBg}
          strokeWidth="0.3"
          fill="none"
          strokeLinecap="round"
        />
        
        {/* Active path */}
        <motion.path
          d="M 0,25 Q 25,10 50,8 T 100,25"
          stroke={colors.pathActive}
          strokeWidth="0.3"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: currentStep / (totalSteps - 1) }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        />
      </svg>

    </div>
  );
};
