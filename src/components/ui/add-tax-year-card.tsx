import React from "react";
import { Plus } from "lucide-react";

interface AddTaxYearCardProps {
  onAddYear: () => void;
}

export function AddTaxYearCard({ onAddYear }: AddTaxYearCardProps) {
  return (
    <div className="w-full group" data-tour="add-year-card">
      <div 
        className="relative w-full overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#1d64ff] via-[#1550d6] to-[#002988] shadow-[0_30px_60px_-12px_rgba(29,100,255,0.4)] transition-transform duration-500 hover:scale-[1.005] cursor-pointer"
        onClick={onAddYear}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-96 h-96 bg-blue-400/30 rounded-full blur-3xl pointer-events-none mix-blend-overlay" />
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/4 w-80 h-80 bg-indigo-500/30 rounded-full blur-3xl pointer-events-none mix-blend-overlay" />

        {/* Card Content */}
        <div className="relative z-10 flex flex-col p-8 sm:p-10 md:p-14 h-full text-white">
          
          {/* Badge */}
          <div className="mb-6 sm:mb-8">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 backdrop-blur-md border border-white/10 shadow-[0_2px_10px_rgba(0,0,0,0.1)]">
              <div className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse" />
              <span className="text-xs font-medium tracking-wide text-blue-50">Startbereit</span>
            </div>
          </div>

          {/* Text Content */}
          <div className="mb-12 sm:mb-16 max-w-2xl">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight mb-4 leading-[1.1] text-white">
              Steuerjahr hinzufügen
            </h1>
            <p className="text-base sm:text-lg text-blue-100/90 font-light leading-relaxed tracking-wide">
              Es ist noch keine Steuererklärung vorhanden. Erstelle jetzt einen neuen Entwurf für das aktuelle Steuerjahr, um deine Rückerstattung zu berechnen.
            </p>
          </div>

          {/* Bottom Action Row */}
          <div className="mt-auto flex flex-col sm:flex-row items-start sm:items-end justify-between gap-8 sm:gap-4">
            
            {/* Status Indicator with Plus Icon */}
            <div className="flex items-center gap-5 cursor-default">
              <div className="relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px]">
                {/* SVG Ring */}
                <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
                  {/* Track */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="42" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    className="text-black/20"
                  />
                  {/* Empty Indicator (no progress) */}
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="42" 
                    fill="none" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    strokeDasharray="263.89"
                    strokeDashoffset="263.89"
                    strokeLinecap="round" 
                    className="text-white drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]"
                  />
                </svg>
                {/* Plus Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <Plus className="w-8 h-8 stroke-[2.5]" />
                </div>
              </div>
              
              <div className="flex flex-col gap-0.5">
                <span className="text-base sm:text-lg font-medium tracking-tight">Status</span>
                <span className="text-sm font-light text-blue-200/80">Nicht begonnen</span>
              </div>
            </div>

            {/* Action Button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                onAddYear();
              }}
              className="group/btn relative overflow-hidden bg-white text-blue-700 px-8 sm:px-10 py-4 rounded-full font-semibold text-sm sm:text-base shadow-[0_10px_20px_-5px_rgba(0,0,0,0.2)] hover:shadow-[0_15px_30px_-5px_rgba(255,255,255,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 w-full sm:w-auto flex items-center justify-center gap-2.5"
            >
              <span className="relative z-10">Jetzt erstellen</span>
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 relative z-10 transition-transform duration-300 group-hover/btn:rotate-90" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
