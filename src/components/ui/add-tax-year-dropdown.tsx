import React, { useState, useEffect } from "react";
import { Plus, Check } from "lucide-react";
import { motion } from "framer-motion";
import { useI18n } from '@/contexts/I18nContext';

interface AddTaxYearDropdownProps {
  onYearSelect: (year: string) => void;
  existingYears: string[];
  isCreating?: boolean;
  variant?: 'default' | 'card';
}

// Custom CSS Bottom Sheet (no Vaul spring animation)
function BottomSheet({ isOpen, onClose, children }: { isOpen: boolean; onClose: () => void; children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      document.body.style.overflow = 'hidden';
    } else {
      const timer = setTimeout(() => setMounted(false), 350);
      document.body.style.overflow = '';
      return () => clearTimeout(timer);
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!mounted) return null;

  return (
    <div className="fixed inset-0 z-[10002]">
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black/50 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
      />
      {/* Sheet */}
      <div
        className={`absolute inset-x-0 bottom-0 bg-white rounded-t-[28px] max-h-[85vh] transition-transform duration-300 ease-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
        style={{ willChange: 'transform' }}
      >
        {children}
      </div>
    </div>
  );
}

export function AddTaxYearDropdown({ onYearSelect, existingYears, isCreating, variant = 'default' }: AddTaxYearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useI18n();
  
  const allYears = ['2030', '2029', '2028', '2027', '2026', '2025', '2024'];
  const availableYears = allYears.filter(year => !existingYears.includes(year));

  const handleYearClick = (year: string) => {
    onYearSelect(year);
    setTimeout(() => setIsOpen(false), 150);
  };

  const sheetContent = (
    <>
      {/* Handle bar */}
      <div className="flex justify-center pt-3 pb-2">
        <div className="w-12 h-1.5 rounded-full bg-gray-200" />
      </div>

      {/* Header */}
      <div className="px-6 pt-4 pb-5 border-b border-gray-100 flex items-center gap-4">
        <div className="w-12 h-12 rounded-[18px] bg-blue-50 flex items-center justify-center flex-shrink-0 border border-blue-100/50 shadow-sm">
          <Plus className="w-6 h-6 text-blue-600" strokeWidth={1.5} />
        </div>
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-gray-900 leading-tight">{t.addTaxYear.addTaxYear}</h3>
          <p className="text-base text-gray-500 mt-1">{t.addTaxYear.chooseYear}</p>
        </div>
      </div>

      {/* Year options */}
      <div className="p-4 space-y-3 bg-gray-50/30 overflow-y-auto">
        {availableYears.map((year) => (
          <button
            key={year}
            onClick={() => handleYearClick(year)}
            style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
            className="w-full group flex items-center gap-4 p-4 rounded-2xl border border-gray-200/80 bg-white hover:border-blue-200 hover:bg-blue-50/30 hover:shadow-sm transition-all duration-200 text-left focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <div className="w-10 h-10 rounded-full bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors duration-200 border border-gray-100 group-hover:border-blue-200">
              <Plus className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors duration-200" strokeWidth={1.5} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-base font-medium text-gray-900">{t.addTaxYear.taxYear} {year}</p>
              <p className="text-sm text-gray-500">{t.addTaxYear.createTaxReturn}</p>
            </div>
          </button>
        ))}
      </div>
    </>
  );

  // Card variant for light theme
  if (variant === 'card') {
    if (availableYears.length === 0) {
      return (
        <div className="group relative flex flex-col p-3 rounded-[2.5rem] border-2 border-dashed border-gray-200 items-center justify-center text-center h-full min-h-[420px] opacity-50">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center mb-6">
            <Check className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-medium text-gray-900 font-jakarta tracking-tight mb-2">
            {t.addTaxYear.allYearsCreated}
          </h3>
          <p className="text-sm font-medium text-gray-500 font-jakarta">
            {t.addTaxYear.yearsAlreadyExist}
          </p>
        </div>
      );
    }

    return (
      <>
        <button
          data-tour="add-year-card"
          onClick={() => setIsOpen(true)}
          style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
          className={`group relative flex flex-col p-3 rounded-[2.5rem] border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 items-center justify-center text-center h-full min-h-[420px] ${
            isCreating ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <div className="w-20 h-20 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-white group-hover:text-blue-600 group-hover:shadow-lg group-hover:shadow-blue-200 transition-all duration-300">
            {isCreating ? (
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin" />
            ) : (
              <Plus className="w-8 h-8" strokeWidth={1.5} />
            )}
          </div>
          <h3 className="text-xl font-medium text-gray-900 font-jakarta tracking-tight mb-2">
            {t.addTaxYear.newYear}
          </h3>
          <p className="text-sm font-medium text-gray-500 font-jakarta">
            {t.addTaxYear.startNewTaxReturn}
          </p>
        </button>

        <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
          {sheetContent}
        </BottomSheet>
      </>
    );
  }

  // Default dark variant
  if (availableYears.length === 0) {
    return (
      <div className="group relative w-full border border-dashed border-white/10 rounded-[1.5rem] p-6 bg-gradient-to-b from-[#0a0a0a] to-[#020202] opacity-50">
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-14 h-14 rounded-full bg-zinc-800/50 flex items-center justify-center text-zinc-600 mb-4">
            <Check className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-medium text-zinc-500 font-jakarta mb-1">
            {t.addTaxYear.allYearsCreated}
          </h3>
          <p className="text-sm text-zinc-600 font-jakarta">
            {t.addTaxYear.yearsAlreadyExist}
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <motion.div
        data-tour="add-year"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
        onClick={() => setIsOpen(true)}
        style={{ touchAction: 'manipulation', WebkitTapHighlightColor: 'transparent' }}
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
            {t.addTaxYear.newTaxReturn}
          </h3>
          <p className="text-sm text-zinc-500 font-jakarta">
            {t.addTaxYear.selectTaxYear}
          </p>
        </div>
      </motion.div>

      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)}>
        {sheetContent}
      </BottomSheet>
    </>
  );
}
