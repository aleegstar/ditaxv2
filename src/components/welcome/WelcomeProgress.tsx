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
    <>
      {/* Inverted white curved element at top */}
      <div className="absolute top-0 left-0 right-0 h-24 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-[85%] left-1/2 -translate-x-1/2 w-[150%] aspect-[3/1] bg-white rounded-[50%]"
        />
      </div>
      
      {/* Progress bar */}
      <div className="absolute top-28 left-4 right-4 sm:left-6 sm:right-6 flex flex-col items-center">
        <div className="w-full flex items-center gap-1.5 sm:gap-2">
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
      </div>
    </>
  );
};
