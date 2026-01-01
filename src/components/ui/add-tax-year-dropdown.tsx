import React, { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { motion } from "framer-motion";
import {
  Drawer,
  DrawerContent,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

interface AddTaxYearDropdownProps {
  onYearSelect: (year: string) => void;
  existingYears: string[];
  isCreating?: boolean;
  variant?: 'default' | 'card';
}

export function AddTaxYearDropdown({ onYearSelect, existingYears, isCreating, variant = 'default' }: AddTaxYearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Available years: 2024-2030, excluding existing years
  const allYears = ['2030', '2029', '2028', '2027', '2026', '2025', '2024'];
  const availableYears = allYears.filter(year => !existingYears.includes(year));

  const handleYearClick = (year: string) => {
    setIsOpen(false);
    onYearSelect(year);
  };

  // Card variant for light theme
  if (variant === 'card') {
    if (availableYears.length === 0) {
      return (
        <div className="group relative flex flex-col p-3 rounded-[2.5rem] border-2 border-dashed border-gray-200 items-center justify-center text-center min-h-[420px] opacity-50">
          <div className="w-20 h-20 rounded-2xl bg-gray-50 text-gray-300 flex items-center justify-center mb-6">
            <Check className="w-8 h-8" strokeWidth={1.5} />
          </div>
          <h3 className="text-xl font-medium text-gray-900 font-jakarta tracking-tight mb-2">
            Alle Jahre erstellt
          </h3>
          <p className="text-sm font-medium text-gray-500 font-jakarta">
            2024-2030 sind bereits vorhanden
          </p>
        </div>
      );
    }

    return (
      <Drawer open={isOpen} onOpenChange={setIsOpen}>
        <DrawerTrigger asChild>
          <button 
            className={`group relative flex flex-col p-3 rounded-[2.5rem] border-2 border-dashed border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all duration-300 items-center justify-center text-center min-h-[420px] ${
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
              Neues Jahr
            </h3>
            <p className="text-sm font-medium text-gray-500 font-jakarta">
              Starten Sie eine neue Steuererklärung
            </p>
          </button>
        </DrawerTrigger>

        <DrawerContent className="bg-white border-t border-gray-200 rounded-t-3xl max-h-[85vh]">
          {/* Handle bar */}
          <div className="flex justify-center pt-3 pb-2">
            <div className="w-12 h-1.5 rounded-full bg-gray-200" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                <Plus className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Steuerjahr hinzufügen</h3>
                <p className="text-sm text-gray-500">Wähle ein Steuerjahr aus</p>
              </div>
            </div>
            <DrawerClose asChild>
              <button className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </DrawerClose>
          </div>

          {/* Year options */}
          <div className="px-4 py-4 space-y-2 overflow-y-auto">
            {availableYears.map((year) => (
              <button
                key={year}
                onClick={() => handleYearClick(year)}
                className="w-full flex items-center gap-4 p-4 rounded-2xl bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 transition-all group"
              >
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Plus className="w-5 h-5 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-base font-medium text-gray-900">Steuerjahr {year}</p>
                  <p className="text-sm text-gray-500">Steuererklärung erstellen</p>
                </div>
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
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
    <Drawer open={isOpen} onOpenChange={setIsOpen}>
      <DrawerTrigger asChild>
        <motion.div
          data-tour="add-year"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
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
            <p className="text-sm text-zinc-500 font-jakarta">
              Steuerjahr auswählen
            </p>
          </div>
        </motion.div>
      </DrawerTrigger>

      <DrawerContent className="bg-[#0A0C10] border-t border-white/10 rounded-t-3xl max-h-[85vh]">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#1D64FF]/10 flex items-center justify-center">
              <Plus className="w-6 h-6 text-[#1D64FF]" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Steuerjahr hinzufügen</h3>
              <p className="text-sm text-zinc-500">Wähle ein Steuerjahr aus</p>
            </div>
          </div>
          <DrawerClose asChild>
            <button className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-zinc-400" />
            </button>
          </DrawerClose>
        </div>

        {/* Year options */}
        <div className="px-4 py-4 space-y-2 overflow-y-auto">
          {availableYears.map((year) => (
            <button
              key={year}
              onClick={() => handleYearClick(year)}
              className="w-full flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-[#1D64FF]/10 border border-white/5 hover:border-[#1D64FF]/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-[#1D64FF]/10 flex items-center justify-center group-hover:bg-[#1D64FF] transition-colors">
                <Plus className="w-5 h-5 text-[#1D64FF] group-hover:text-white transition-colors" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-base font-medium text-white">Steuerjahr {year}</p>
                <p className="text-sm text-zinc-500">Steuererklärung erstellen</p>
              </div>
            </button>
          ))}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
