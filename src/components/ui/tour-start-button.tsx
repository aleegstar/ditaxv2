import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

interface TourStartButtonProps {
  onStartTour: () => void;
}

export const TourStartButton: React.FC<TourStartButtonProps> = ({ onStartTour }) => {
  const [isVisible, setIsVisible] = useState(true);

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem('tour-button-dismissed');
    if (dismissed === 'true') {
      setIsVisible(false);
    }
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    localStorage.setItem('tour-button-dismissed', 'true');
    setIsVisible(false);
  };

  const handleStartTour = () => {
    onStartTour();
  };

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full py-4 px-6 flex justify-start"
    >
      <div className="relative">
        <button
          onClick={handleStartTour}
          className="text-foreground rounded-full px-4 py-2 h-9 text-sm font-medium border-0 transition-colors duration-200 flex items-center justify-center gap-2 relative hover:bg-gray-200"
          style={{ backgroundColor: '#FAFAFA' }}
        >
          <svg width="16" height="16" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" clipRule="evenodd" d="M24 44C12.9543 44 4 35.0457 4 24C4 12.9543 12.9543 4 24 4C35.0457 4 44 12.9543 44 24C44 35.0457 35.0457 44 24 44ZM24 8C27.6974 8 31.1019 9.25416 33.8113 11.3603L29.5148 15.6568C27.9339 14.6098 26.0382 14 24 14C21.9618 14 20.0661 14.6098 18.4852 15.6568L14.1887 11.3603C16.8981 9.25416 20.3026 8 24 8ZM32.3432 18.4852L36.6397 14.1887C38.7458 16.8981 40 20.3026 40 24C40 27.6974 38.7458 31.1019 36.6397 33.8113L32.3432 29.5148C33.3902 27.9339 34 26.0382 34 24C34 21.9618 33.3902 20.0661 32.3432 18.4852ZM14.1887 36.6397C16.8981 38.7458 20.3026 40 24 40C27.6974 40 31.1019 38.7458 33.8113 36.6397L29.5148 32.3432C27.9339 33.3902 26.0382 34 24 34C21.9618 34 20.0661 33.3902 18.4852 32.3432L14.1887 36.6397ZM15.6568 29.5148L11.3603 33.8113C9.25416 31.1019 8 27.6974 8 24C8 20.3026 9.25416 16.8981 11.3603 14.1887L15.6568 18.4852C14.6098 20.0661 14 21.9618 14 24C14 26.0382 14.6098 27.9339 15.6568 29.5148ZM30 24C30 27.3137 27.3137 30 24 30C20.6863 30 18 27.3137 18 24C18 20.6863 20.6863 18 24 18C27.3137 18 30 20.6863 30 24Z" fill="currentColor"/>
          </svg>
          Anleitung starten
        </button>
        
        {/* Red dismiss circle */}
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs transition-colors duration-200 z-10"
          title="Button ausblenden"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
};