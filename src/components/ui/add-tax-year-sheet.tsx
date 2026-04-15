import React, { useState } from "react";
import { FolderOpen } from "lucide-react";
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
    if (year === currentYear) return undefined;
    const deadlineYear = parseInt(year) + 1;
    return language === 'de' ? `Frist endet am 31.07.${deadlineYear}` : `Deadline: 31.07.${deadlineYear}`;
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

          {/* Year List */}
          <div className="px-6 overflow-y-auto pb-6 flex-1 space-y-2.5">
            {availableYears.map((year) => {
              const isSelected = selectedYear === year;
              const isCurrent = year === currentYear;
              const subtitle = getSubtitle(year);

              return (
                <label
                  key={year}
                  onClick={() => setSelectedYear(year)}
                  className={`group relative flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-foreground bg-background shadow-[0_2px_10px_-4px_rgba(0,0,0,0.1)]'
                      : 'border-border hover:border-foreground/20 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base font-medium text-foreground">{year}</span>
                        {isCurrent && (
                          <span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                            {language === 'de' ? 'Aktuell' : 'Current'}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground mt-0.5">
                        {subtitle || (language === 'de' ? 'Neu anlegen' : 'Create new')}
                      </span>
                    </div>
                  </div>

                  {/* Radio indicator */}
                  <div className="pl-4">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isSelected
                        ? 'border-foreground bg-foreground'
                        : 'border-muted-foreground/30'
                    }`}>
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-background" />
                      )}
                    </div>
                  </div>
                </label>
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
