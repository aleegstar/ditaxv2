import React, { useState } from "react";
import { MoreVertical } from "lucide-react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useI18n } from "@/contexts/I18nContext";

interface AddTaxYearSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existingYears: string[];
  onYearSelect: (year: string) => void;
}

const currentYear = new Date().getFullYear().toString();

export function AddTaxYearSheet({ open, onOpenChange, existingYears, onYearSelect }: AddTaxYearSheetProps) {
  const { t, language } = useI18n();
  const allYears = ['2025', '2026', '2027', '2028', '2029', '2030'];
  const availableYears = allYears.filter(y => !existingYears.includes(y));
  const [selectedYear, setSelectedYear] = useState<string>(availableYears[0] || '');

  const getSubtitle = (year: string) => {
    const completedSteps = year === currentYear ? 0 : 0;
    const totalSteps = 6;
    return language === 'de'
      ? `${completedSteps} von ${totalSteps} Schritten erfolgreich abgeschlossen.`
      : `${completedSteps} of ${totalSteps} steps completed.`;
  };

  const handleConfirm = () => {
    if (selectedYear) {
      onYearSelect(selectedYear);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent variant="bottom-sheet" className="focus:outline-none">
        <div className="mx-auto w-full max-w-md flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="text-center pt-1 px-6 pb-5">
            <h2 className="text-2xl font-semibold text-foreground tracking-tight">
              {language === 'de' ? 'Steuerjahr wählen' : 'Choose tax year'}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {language === 'de' ? 'Welches Jahr möchtest du erstellen?' : 'Which year would you like to create?'}
            </p>
          </div>

          {/* Year List - card style matching TaxYearCard */}
          <div className="px-5 overflow-y-auto pb-6 flex-1 space-y-3">
            {availableYears.map((year) => {
              const isSelected = selectedYear === year;
              const isCurrent = year === currentYear;

              return (
                <button
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`w-full text-left relative overflow-hidden rounded-[20px] p-6 transition-all duration-200 ${
                    isSelected
                      ? 'ring-2 ring-primary shadow-xl'
                      : 'shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] hover:shadow-lg'
                  }`}
                  style={{
                    background: 'hsla(0, 0%, 97%, 1)',
                    border: '1px solid rgba(0, 0, 0, 0.06)',
                  }}
                >
                  {/* Three dots icon top-right */}
                  <div className="absolute top-4 right-4">
                    <MoreVertical className="h-4 w-4 text-muted-foreground/50" />
                  </div>

                  {/* Badge */}
                  <div className="mb-3">
                    <span
                      className="inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium backdrop-blur-sm border"
                      style={{
                        background: 'rgba(82, 152, 228, 0.28)',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        color: '#000000',
                      }}
                    >
                      {language === 'de' ? 'In Erfassung' : 'Draft'}
                    </span>
                  </div>

                  {/* Year */}
                  <h3 className="text-3xl font-bold text-black mb-1">{year}</h3>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                    {getSubtitle(year)}
                  </p>

                  {/* Progress bars placeholder */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-[5px] flex-1 rounded-full"
                        style={{
                          background: 'rgba(0, 0, 0, 0.08)',
                        }}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-border/50 shrink-0">
            <button
              onClick={handleConfirm}
              disabled={!selectedYear}
              className="w-full py-3.5 rounded-full text-sm font-semibold text-primary-foreground transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
              style={{
                background: 'linear-gradient(180deg, hsl(222 100% 56%) 0%, hsl(222 100% 44%) 100%)',
              }}
            >
              {language === 'de' ? 'Steuerjahr erstellen' : 'Create tax year'}
            </button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
