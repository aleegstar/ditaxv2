import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, CalendarIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileFriendlyDateInputProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  defaultYear?: number; // For birth dates, defaults to 1990
}

export const MobileFriendlyDateInput: React.FC<MobileFriendlyDateInputProps> = ({
  id,
  value,
  onChange,
  label,
  placeholder,
  className,
  required = false,
  defaultYear = 1990
}) => {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  // Parse the date value into components
  const parseDate = (dateString: string) => {
    if (!dateString) return { day: '', month: '', year: '' };
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return { day: '', month: '', year: '' };
    
    return {
      day: String(date.getDate()).padStart(2, '0'),
      month: String(date.getMonth() + 1).padStart(2, '0'),
      year: String(date.getFullYear())
    };
  };

  const [dateComponents, setDateComponents] = useState(parseDate(value));

  useEffect(() => {
    const parsed = parseDate(value);
    setDateComponents(parsed);
    // If value is empty but we parsed valid components from a prior load, re-sync
    // (no-op here since we're parsing from value itself)
  }, [value]);

  // When all three date components are set but parent value is empty, sync upward
  // This handles the case where existing data is displayed but parent state wasn't updated
  useEffect(() => {
    if (dateComponents.day && dateComponents.month && dateComponents.year && !value) {
      const dateString = `${dateComponents.year}-${dateComponents.month}-${dateComponents.day}`;
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        onChange(dateString);
      }
    }
  }, [dateComponents.day, dateComponents.month, dateComponents.year]);

  // Generate year options (last 100 years, starting from defaultYear)
  const generateYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const startYear = Math.max(currentYear - 100, 1900);
    const years = [];
    
    // Start from defaultYear and go both directions
    for (let i = defaultYear; i >= startYear; i--) {
      years.push(i);
    }
    for (let i = defaultYear + 1; i <= currentYear; i++) {
      years.push(i);
    }
    
    return years.sort((a, b) => b - a); // Most recent first, but defaultYear will be near top
  };

  // Generate month options
  const monthOptions = [
    { value: '01', label: 'Januar' },
    { value: '02', label: 'Februar' },
    { value: '03', label: 'März' },
    { value: '04', label: 'April' },
    { value: '05', label: 'Mai' },
    { value: '06', label: 'Juni' },
    { value: '07', label: 'Juli' },
    { value: '08', label: 'August' },
    { value: '09', label: 'September' },
    { value: '10', label: 'Oktober' },
    { value: '11', label: 'November' },
    { value: '12', label: 'Dezember' }
  ];

  // Generate day options
  const generateDayOptions = () => {
    const days = [];
    for (let i = 1; i <= 31; i++) {
      const dayStr = String(i).padStart(2, '0');
      days.push({ value: dayStr, label: dayStr });
    }
    return days;
  };

  const updateDate = (component: 'day' | 'month' | 'year', newValue: string) => {
    setDateComponents(prev => {
      const newComponents = { ...prev, [component]: newValue };

      // Only call onChange if we have all components
      if (newComponents.day && newComponents.month && newComponents.year) {
        const dateString = `${newComponents.year}-${newComponents.month}-${newComponents.day}`;
        // Validate the date
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          // Use setTimeout to avoid calling onChange during setState
          setTimeout(() => onChange(dateString), 0);
        }
      } else if (!newComponents.day && !newComponents.month && !newComponents.year) {
        // All empty, clear the value
        setTimeout(() => onChange(''), 0);
      }

      return newComponents;
    });
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      const dateString = format(date, 'yyyy-MM-dd');
      onChange(dateString);
      setIsOpen(false);
    }
  };

  // For mobile, show individual selects, for desktop show calendar popover
  if (isMobile) {
    return (
      <div className="space-y-2">
        {label && (
          <Label htmlFor={id} className="block mb-3 text-muted-foreground text-base font-medium">
            {label} {required && <span className="text-red-400">*</span>}
          </Label>
        )}
        
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Tag</Label>
            <Select value={dateComponents.day} onValueChange={(value) => updateDate('day', value)}>
              <SelectTrigger className="min-h-[48px] text-base">
                <SelectValue placeholder="Tag" />
              </SelectTrigger>
              <SelectContent>
                {generateDayOptions().map(day => (
                  <SelectItem key={day.value} value={day.value}>{day.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Monat</Label>
            <Select value={dateComponents.month} onValueChange={(value) => updateDate('month', value)}>
              <SelectTrigger className="min-h-[48px] text-base">
                <SelectValue placeholder="Monat" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(month => (
                  <SelectItem key={month.value} value={month.value}>{month.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Jahr</Label>
            <Select value={dateComponents.year} onValueChange={(value) => updateDate('year', value)}>
              <SelectTrigger className="min-h-[48px] text-base">
                <SelectValue placeholder="Jahr" />
              </SelectTrigger>
              <SelectContent>
                {generateYearOptions().map(year => (
                  <SelectItem key={year} value={String(year)}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    );
  }

  // Desktop version with calendar popover
  const selectedDate = value ? new Date(value) : undefined;

  return (
    <div className="space-y-2">
      {label && (
        <Label htmlFor={id} className="block mb-3 text-muted-foreground text-base font-medium">
          {label} {required && <span className="text-red-400">*</span>}
        </Label>
      )}
      
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            variant="outline"
            className={cn(
              "min-h-[56px] px-6 py-4 text-base rounded-xl justify-start text-left font-normal",
              !value && "text-muted-foreground",
              className
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(new Date(value), "dd.MM.yyyy") : placeholder || "Datum auswählen"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            mode="single"
            selected={selectedDate}
            onSelect={handleCalendarSelect}
            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
            initialFocus
            defaultMonth={selectedDate || new Date(defaultYear, 0, 1)} // Start at defaultYear
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};