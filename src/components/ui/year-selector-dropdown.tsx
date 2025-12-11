
import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { RainbowButton } from '@/components/ui/rainbow-button';

interface YearSelectorDropdownProps {
  existingYears: string[];
  onYearSelect: (year: string) => void;
  disabled?: boolean;
}

export const YearSelectorDropdown = ({ existingYears, onYearSelect, disabled }: YearSelectorDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Generate years from 2024 to 2034, excluding existing ones
  const allYears = Array.from({ length: 11 }, (_, i) => (2024 + i).toString());
  const availableYears = allYears.filter(year => !existingYears.includes(year));

  const handleYearSelect = (year: string) => {
    onYearSelect(year);
    setIsOpen(false);
  };

  if (availableYears.length === 0) {
    return null; // Don't show dropdown if no years available
  }

  return (
    <div className="relative inline-block">
      {/* Rainbow Button Trigger */}
      <RainbowButton
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full bg-[#1d64ff] text-white hover:bg-[#1d64ff]/90 rounded-xl px-6 py-4 min-h-[56px] text-base font-medium shadow-none border-0 flex items-center justify-center"
      >
        Neue Steuererklärung
        <ChevronDown className={`ml-2 h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </RainbowButton>

      {/* Liquid Glass Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content with Enhanced Liquid Glass Effect */}
          <div 
            className="fixed left-1/2 transform -translate-x-1/2 z-50 min-w-[220px] max-w-[90vw] rounded-3xl border border-white/20 shadow-2xl backdrop-blur-2xl animate-fade-in"
            style={{
              top: 'calc(50% - 150px)',
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.25) 0%, rgba(255, 255, 255, 0.1) 100%)',
              backdropFilter: 'blur(25px) saturate(180%)',
              WebkitBackdropFilter: 'blur(25px) saturate(180%)',
              boxShadow: `
                inset 0 1px 0 rgba(255, 255, 255, 0.4),
                0 25px 50px rgba(0, 0, 0, 0.2),
                0 0 0 1px rgba(255, 255, 255, 0.1)
              `
            }}
          >
            <div className="p-3">
              <div className="text-sm font-semibold text-gray-800/90 px-4 py-3 border-b border-white/30 text-center">
                Jahr auswählen
              </div>
              <div className="max-h-[40vh] overflow-y-auto py-2">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className="w-full text-center px-4 py-3 text-gray-800/80 hover:text-gray-900 hover:bg-white/30 rounded-2xl transition-all duration-300 flex items-center justify-center group mx-2 my-1"
                    style={{
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                    }}
                  >
                    <span className="font-medium text-base">{year}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
