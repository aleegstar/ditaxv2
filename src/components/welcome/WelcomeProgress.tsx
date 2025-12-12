import { motion } from 'framer-motion';

interface WelcomeProgressProps {
  currentStep: number;
  totalSteps: number;
  variant?: 'light' | 'dark';
}

export const WelcomeProgress = ({ currentStep, totalSteps, variant = 'dark' }: WelcomeProgressProps) => {
  const colors = variant === 'light'
    ? { active: 'bg-[#1d64ff]', past: 'bg-[#1d64ff]/70', future: 'bg-gray-300' }
    : { active: 'bg-[#1D64FF]', past: 'bg-[#1D64FF]/70', future: 'bg-white/[0.08]' };

  return (
    <div className="absolute top-4 left-4 right-4 sm:top-6 sm:left-6 sm:right-6 flex items-center gap-1.5 sm:gap-2">
      {Array.from({ length: totalSteps }, (_, i) => (
        <motion.div
          key={i}
          className="flex-1 h-1 sm:h-1.5 rounded-full overflow-hidden"
          initial={false}
        >
          <motion.div 
            className={`h-full transition-colors duration-300 ${
              i === currentStep 
                ? colors.active 
                : i < currentStep 
                  ? colors.past 
                  : colors.future
            }`}
            initial={false}
            animate={{
              scaleX: i === currentStep ? 1 : 1,
            }}
            transition={{ duration: 0.3 }}
          />
        </motion.div>
      ))}
    </div>
  );
};
