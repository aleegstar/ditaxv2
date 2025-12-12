import React, { useState, useRef, useEffect } from "react";
import { Plus, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AddTaxYearDropdownProps {
  onYearSelect: (year: string) => void;
  existingYears: string[];
  isCreating?: boolean;
}

export function AddTaxYearDropdown({ onYearSelect, existingYears, isCreating }: AddTaxYearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Available years: 2024-2030, excluding existing years
  const allYears = ['2030', '2029', '2028', '2027', '2026', '2025', '2024'];
  const availableYears = allYears.filter(year => !existingYears.includes(year));
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleYearClick = (year: string) => {
    setIsOpen(false);
    onYearSelect(year);
  };

  if (availableYears.length === 0) {
    return (
      <div className="group relative w-full border border-dashed border-white/10 rounded-[1.5rem] p-6 bg-gradient-to-b from-[#0a0a0a] to-[#020202] opacity-50">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-600 mb-4">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-zinc-500 font-jakarta mb-1">
            Alle Jahre erstellt
          </h3>
          <p className="text-sm text-zinc-600 font-jakarta">
            2024-2030 sind bereits vorhanden
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative w-full">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
        onClick={() => !isCreating && setIsOpen(!isOpen)}
        className={`group relative w-full border border-dashed rounded-[1.5rem] p-6 transition-all duration-300 cursor-pointer bg-gradient-to-b from-[#0a0a0a] to-[#020202] ${
          isOpen 
            ? 'border-[#1D64FF]/50 shadow-[0_0_25px_-5px_rgba(29,100,255,0.3)]' 
            : 'border-white/10 hover:border-[#1D64FF]/50'
        } ${isCreating ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 transition-all ${
            isOpen 
              ? 'bg-[#1D64FF] text-white' 
              : 'bg-[#1D64FF]/10 text-[#1D64FF] group-hover:bg-[#1D64FF] group-hover:text-white'
          }`}>
            {isCreating ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Plus className="w-6 h-6" />
            )}
          </div>
          <h3 className="text-lg font-medium text-zinc-300 font-jakarta mb-1">
            Neue Steuererklärung
          </h3>
          <div className="flex items-center gap-2 text-sm text-zinc-500 font-jakarta">
            <span>Steuerjahr auswählen</span>
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </div>
      </motion.div>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#0A0C10] border border-white/10 rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl"
          >
            <div className="p-2">
              <div className="px-3 py-2 text-xs text-zinc-500 font-medium uppercase tracking-wider">
                Verfügbare Jahre
              </div>
              {availableYears.map((year) => (
                <button
                  key={year}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleYearClick(year);
                  }}
                  className="w-full px-4 py-3 text-left rounded-xl hover:bg-[#1D64FF]/10 transition-colors group/item flex items-center justify-between"
                >
                  <span className="text-base font-medium text-zinc-200 group-hover/item:text-white transition-colors">
                    Steuerjahr {year}
                  </span>
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover/item:bg-[#1D64FF] transition-colors">
                    <Plus className="w-4 h-4 text-zinc-400 group-hover/item:text-white transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
