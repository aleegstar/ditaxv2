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
}

export function AddTaxYearDropdown({ onYearSelect, existingYears, isCreating }: AddTaxYearDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Available years: 2024-2030, excluding existing years
  const allYears = ['2030', '2029', '2028', '2027', '2026', '2025', '2024'];
  const availableYears = allYears.filter(year => !existingYears.includes(year));

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
