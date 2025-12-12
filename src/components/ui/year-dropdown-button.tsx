import React, { useState } from 'react';
import { Plus, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface YearDropdownButtonProps {
  existingYears: string[];
  onYearSelect: (year: string) => void;
  disabled?: boolean;
}

export const YearDropdownButton = ({ existingYears, onYearSelect, disabled }: YearDropdownButtonProps) => {
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
      {/* Pill Button Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        data-tour="add-year"
        className="year-dropdown-button inline-flex items-center gap-2 rounded-full px-6 py-3 bg-white transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02]"
        style={{
          boxShadow: 'rgba(0, 0, 0, 0.15) 0px 0px 22px -5px'
        }}
      >
        <Plus className="h-4 w-4 text-primary" />
        <span className="text-base font-semibold text-gray-900">
          Steuerjahr hinzufügen
        </span>
        <ChevronDown className={`h-4 w-4 text-primary transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown Content */}
          <div 
            className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2 z-50 min-w-[220px] rounded-lg border border-border bg-background shadow-lg"
          >
            <div className="p-2">
              <div className="text-sm font-medium text-foreground px-3 py-2 border-b border-border text-center">
                Jahr auswählen
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {availableYears.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className="w-full text-center px-3 py-2 text-foreground hover:bg-accent hover:text-accent-foreground rounded-md transition-colors duration-200 flex items-center justify-center"
                  >
                    <span className="font-medium">{year}</span>
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