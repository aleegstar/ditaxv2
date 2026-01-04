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
  variant?: 'dark' | 'light';
}

export const SubpageHeader: React.FC<SubpageHeaderProps> = ({
  title,
  onBack,
  className,
  showModeToggle = false,
  currentMode = 'yesno',
  onModeChange,
  variant = 'light'
}) => {
  const handleToggle = () => {
    if (onModeChange) {
      onModeChange(currentMode === 'standard' ? 'yesno' : 'standard');
    }
  };

  const isLight = variant === 'light';

  return (
    <div className={cn(
      "px-4 py-4 sticky top-0 z-50",
      isLight ? "bg-white border-b border-slate-200" : "bg-[#020408]",
      className
    )}>
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
              className={cn(
                "w-10 h-10 rounded-full border flex items-center justify-center transition-colors",
                isLight 
                  ? "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100" 
                  : "bg-white/5 border-white/10 text-white hover:bg-white/10"
              )}
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
          <span className={cn(
            "text-base font-medium",
            isLight ? "text-slate-800" : "text-white"
          )}>{title}</span>
        </div>

        {/* Right side: Mode Toggle or empty space */}
        <div className="flex items-center">
          {showModeToggle && onModeChange ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className={cn(
                "flex items-center gap-2 text-xs rounded-full h-8 px-3",
                isLight 
                  ? "text-slate-700 hover:bg-slate-100" 
                  : "text-white hover:bg-white/10"
              )}
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
