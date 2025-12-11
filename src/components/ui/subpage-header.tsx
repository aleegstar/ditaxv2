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
    <div className={cn("px-4 py-4 sticky top-0 z-50", className)}>
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} 
        className="flex items-center justify-between w-full p-1.5 rounded-full" 
        style={{
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          boxShadow: '0 8px 32px -8px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.6)',
          border: '1px solid rgba(255,255,255,0.5)'
        }}
      >
        {/* Left side: Back Button */}
        <div className="flex items-center gap-2">
          {onBack && (
            <motion.button 
              onClick={onBack}
              whileHover={{ scale: 1.05 }} 
              whileTap={{ scale: 0.95 }} 
              className="flex hover:bg-white/80 transition-all duration-200 w-9 h-9 rounded-full items-center justify-center"
            >
              <ArrowLeft className="h-5 w-5 text-slate-600" />
            </motion.button>
          )}
        </div>

        {/* Center: Title */}
        <div className="flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
          <span className="text-sm font-semibold text-slate-900">{title}</span>
        </div>

        {/* Right side: Mode Toggle or empty space */}
        <div className="flex items-center">
          {showModeToggle && onModeChange ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleToggle}
              className="flex items-center gap-2 text-xs rounded-full h-8 px-3 hover:bg-white/80"
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
            <div className="w-9 h-9" /> 
          )}
        </div>
      </motion.div>
    </div>
  );
};
