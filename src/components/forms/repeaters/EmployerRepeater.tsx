
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecureFormInput } from '@/components/ui/secure-form-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { AnimatedFormField } from '@/components/ui/animated-form-field';

interface EmployerData {
  id: string;
  workLocation: string;
  workload: number;
  workDays: number;
  commute: 'public' | 'publicBike' | 'bike' | 'car';
  carReason?: string;
}

interface EmployerRepeaterProps {
  employers: EmployerData[];
  onChange: (employers: EmployerData[]) => void;
}

export const EmployerRepeater: React.FC<EmployerRepeaterProps> = ({ employers, onChange }) => {
  const addEmployer = () => {
    const newEmployer: EmployerData = {
      id: Math.random().toString(36).substr(2, 9),
      workLocation: '',
      workload: 100,
      workDays: 5,
      commute: 'public'
    };
    onChange([...employers, newEmployer]);
  };

  const removeEmployer = (id: string) => {
    onChange(employers.filter(emp => emp.id !== id));
  };

  const updateEmployer = (id: string, field: keyof EmployerData, value: any) => {
    onChange(employers.map(emp => 
      emp.id === id ? { ...emp, [field]: value } : emp
    ));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Arbeitgeber Details</span>
        <button
          type="button"
          onClick={addEmployer}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-4 py-2.5 font-semibold text-sm tracking-tight text-white transition-all hover:brightness-110 active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" />
          Arbeitgeber hinzufügen
        </button>
      </div>

      {employers.map((employer, index) => (
        <AnimatedFormField key={employer.id} delay={0.1 * index}>
          <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-5">
            {/* Delete Button */}
            <div className="absolute top-4 right-4">
              <Button
                type="button"
                onClick={() => removeEmployer(employer.id)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Arbeitsort */}
              <div className="space-y-2">
                <Label htmlFor={`workLocation-${employer.id}`} className="text-slate-700 text-sm font-medium">
                  Arbeitsort
                </Label>
                <SecureFormInput
                  id={`workLocation-${employer.id}`}
                  value={employer.workLocation}
                  onChange={(e) => updateEmployer(employer.id, 'workLocation', e.target.value)}
                  placeholder="Stadt oder PLZ"
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl h-12 focus:border-[#1D64FF] focus:ring-1 focus:ring-[#1D64FF]"
                  validationOptions={{
                    maxLength: 100,
                    allowedChars: /^[a-zA-ZäöüÄÖÜß0-9\s\-]+$/
                  }}
                  sanitizeOnBlur={true}
                />
              </div>

              {/* Arbeitspensum */}
              <div className="space-y-2">
                <Label htmlFor={`workload-${employer.id}`} className="text-slate-700 text-sm font-medium">
                  Arbeitspensum (%)
                </Label>
                <Input
                  id={`workload-${employer.id}`}
                  type="number"
                  value={employer.workload}
                  onChange={(e) => updateEmployer(employer.id, 'workload', parseInt(e.target.value) || 0)}
                  placeholder="z.B. 100"
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl h-12 focus:border-[#1D64FF] focus:ring-1 focus:ring-[#1D64FF]"
                />
              </div>

              {/* Arbeitstage pro Woche */}
              <div className="space-y-2">
                <Label htmlFor={`workDays-${employer.id}`} className="text-slate-700 text-sm font-medium">
                  Arbeitstage pro Woche
                </Label>
                <Input
                  id={`workDays-${employer.id}`}
                  type="number"
                  value={employer.workDays}
                  onChange={(e) => updateEmployer(employer.id, 'workDays', parseInt(e.target.value) || 0)}
                  placeholder="z.B. 5"
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl h-12 focus:border-[#1D64FF] focus:ring-1 focus:ring-[#1D64FF]"
                />
              </div>

              {/* Arbeitsweg */}
              <div className="space-y-2">
                <Label htmlFor={`commute-${employer.id}`} className="text-slate-700 text-sm font-medium">
                  Arbeitsweg
                </Label>
                <Select
                  value={employer.commute}
                  onValueChange={(value) => updateEmployer(employer.id, 'commute', value)}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800 rounded-xl h-12 focus:border-[#1D64FF] focus:ring-1 focus:ring-[#1D64FF]">
                    <SelectValue placeholder="Wählen Sie den Arbeitsweg" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="public" className="text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-800">Öffentliche Verkehrsmittel</SelectItem>
                    <SelectItem value="publicBike" className="text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-800">Öffentliche Verkehrsmittel + Fahrrad</SelectItem>
                    <SelectItem value="bike" className="text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-800">Fahrrad</SelectItem>
                    <SelectItem value="car" className="text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-800">Auto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Grund für Autonutzung */}
              {employer.commute === 'car' && (
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor={`carReason-${employer.id}`} className="text-slate-700 text-sm font-medium">
                    Grund für Autonutzung
                  </Label>
                  <Select
                    value={employer.carReason || ''}
                    onValueChange={(value) => updateEmployer(employer.id, 'carReason', value)}
                  >
                    <SelectTrigger className="bg-white border-slate-200 text-slate-800 rounded-xl h-12 focus:border-[#1D64FF] focus:ring-1 focus:ring-[#1D64FF]">
                      <SelectValue placeholder="Wählen Sie den Grund" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200 z-50">
                      <SelectItem value="noPublicTransport" className="text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-800">Fehlen eines öffentlichen Verkehrsmittels</SelectItem>
                      <SelectItem value="timeSaving" className="text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-800">Zeitersparnis von über 1 Stunde</SelectItem>
                      <SelectItem value="workUsage" className="text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-800">Ständige Benützung während der Arbeitszeit</SelectItem>
                      <SelectItem value="healthReasons" className="text-slate-800 hover:bg-slate-50 focus:bg-slate-50 focus:text-slate-800">Infolge von Krankheit oder Gebrechlichkeit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </AnimatedFormField>
      ))}

      {/* Empty State */}
      {employers.length === 0 && (
        <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-2xl">
          <p className="text-slate-500 mb-3">Noch keine Arbeitgeber hinzugefügt</p>
          <Button
            type="button"
            onClick={addEmployer}
            variant="ghost"
            className="text-[#1D64FF] hover:text-[#1D64FF] hover:bg-[#1D64FF]/10"
          >
            Ersten Arbeitgeber hinzufügen
          </Button>
        </div>
      )}

      {/* Add another button at the bottom */}
      {employers.length > 0 && (
        <Button
          type="button"
          onClick={addEmployer}
          variant="ghost"
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border border-dashed border-slate-200 text-slate-500 hover:border-[#1D64FF] hover:text-[#1D64FF] hover:bg-[#1D64FF]/5 bg-transparent"
        >
          <Plus className="w-5 h-5" />
          Weiteren Arbeitgeber hinzufügen
        </Button>
      )}
    </div>
  );
};
