import { motion } from 'framer-motion';

interface WelcomeProgressProps {
  currentStep: number;
  totalSteps: number;
  variant?: 'light' | 'dark';
}

export const WelcomeProgress = ({ currentStep, totalSteps, variant = 'dark' }: WelcomeProgressProps) => {
  return (
    <>
      {/* White curved element at top - subtle curve downward */}
      <div className="absolute top-0 left-0 right-0 overflow-hidden pointer-events-none">
        <div 
          className="relative w-[200%] -left-1/2 h-16 bg-white rounded-b-[100%]"
        />
      </div>
      
      {/* Progress bar inside the white area */}
      <div className="absolute top-4 left-6 right-6 sm:top-6 sm:left-8 sm:right-8 flex items-center gap-1.5 sm:gap-2 z-10">
        {Array.from({ length: totalSteps }, (_, i) => (
          <motion.div
            key={i}
            className="flex-1 h-1.5 sm:h-2 rounded-full overflow-hidden bg-gray-200"
            initial={false}
          >
            <motion.div 
              className={`h-full transition-colors duration-300 ${
                i <= currentStep 
                  ? 'bg-[#1D64FF]' 
                  : 'bg-transparent'
              }`}
              initial={false}
              animate={{
                scaleX: 1,
              }}
              transition={{ duration: 0.3 }}
            />
          </motion.div>
        ))}
      </div>
    </>
  );
};
