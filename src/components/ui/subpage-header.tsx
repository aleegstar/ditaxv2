import React from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, HelpCircle, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SubpageHeaderProps {
  title: string;
  onBack?: () => void;
  className?: string;
  showModeToggle?: boolean;
  currentMode?: 'standard' | 'yesno';
  onModeChange?: (mode: 'standard' | 'yesno') => void;
}

export const SubpageHeader: React.FC<SubpageHeaderProps> = ({
  title,
  onBack,
  className,
  showModeToggle = false,
  currentMode = 'yesno',
  onModeChange
}) => {
  const handleToggle = () => {
    if (onModeChange) {
      onModeChange(currentMode === 'standard' ? 'yesno' : 'standard');
    }
  };

  return (
    <div className={cn("px-4 py-4 sticky top-0 z-50 bg-[#020408]", className)}>
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} 
        className="flex items-center justify-between w-full"
      >
        {/* Left side: Back Button */}
        <div className="flex items-center gap-2">
          {onBack && (
            <motion.button 
              onClick={onBack}
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="flex items-center justify-center w-10 h-10 rounded-full border border-white/20 hover:bg-white/10 transition-all duration-200"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </motion.button>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
          <span className="text-base font-medium text-white">{title}</span>
        </div>

        {/* Right side: Mode Toggle or empty space */}
        <div className="flex items-center">
          {showModeToggle && onModeChange ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="flex items-center gap-2 text-xs rounded-full h-8 px-3 text-white hover:bg-white/10"
            >
              {currentMode === 'yesno' ? (
                <>
                  <List className="w-3 h-3" />
                  Experten
                </>
              ) : (
                <>
                  <HelpCircle className="w-3 h-3" />
                  Ja/Nein
                </>
              )}
            </Button>
          ) : (
            <div className="w-10 h-10" /> 
          )}
        </div>
      </motion.div>
    </div>
  );
};
