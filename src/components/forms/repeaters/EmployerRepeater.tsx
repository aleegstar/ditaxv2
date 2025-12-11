
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700">Arbeitgeber Details</h4>
        <Button
          type="button"
          onClick={addEmployer}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Arbeitgeber hinzufügen
        </Button>
      </div>

      {employers.map((employer, index) => (
        <AnimatedFormField key={employer.id} delay={0.1 * index}>
          <Card className="relative">
            <CardContent className="pt-6">
              <div className="absolute top-2 right-2">
                <Button
                  type="button"
                  onClick={() => removeEmployer(employer.id)}
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`workLocation-${employer.id}`}>Arbeitsort</Label>
                  <SecureFormInput
                    id={`workLocation-${employer.id}`}
                    value={employer.workLocation}
                    onChange={(e) => updateEmployer(employer.id, 'workLocation', e.target.value)}
                    placeholder="Stadt oder PLZ"
                    validationOptions={{
                      maxLength: 100,
                      allowedChars: /^[a-zA-ZäöüÄÖÜß0-9\s\-]+$/
                    }}
                    sanitizeOnBlur={true}
                  />
                </div>

                <div>
                  <Label htmlFor={`workload-${employer.id}`}>Arbeitspensum (%)</Label>
                  <Input
                    id={`workload-${employer.id}`}
                    type="number"
                    value={employer.workload}
                    onChange={(e) => updateEmployer(employer.id, 'workload', parseInt(e.target.value) || 0)}
                    placeholder="z.B. 100"
                  />
                </div>

                <div>
                  <Label htmlFor={`workDays-${employer.id}`}>Arbeitstage pro Woche</Label>
                  <Input
                    id={`workDays-${employer.id}`}
                    type="number"
                    value={employer.workDays}
                    onChange={(e) => updateEmployer(employer.id, 'workDays', parseInt(e.target.value) || 0)}
                    placeholder="z.B. 5"
                  />
                </div>

                <div>
                  <Label htmlFor={`commute-${employer.id}`}>Arbeitsweg</Label>
                  <Select
                    value={employer.commute}
                    onValueChange={(value) => updateEmployer(employer.id, 'commute', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Wählen Sie den Arbeitsweg" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Öffentliche Verkehrsmittel</SelectItem>
                      <SelectItem value="publicBike">Öffentliche Verkehrsmittel + Fahrrad</SelectItem>
                      <SelectItem value="bike">Fahrrad</SelectItem>
                      <SelectItem value="car">Auto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {employer.commute === 'car' && (
                  <div className="md:col-span-2">
                    <Label htmlFor={`carReason-${employer.id}`}>Grund für Autonutzung</Label>
                    <Select
                      value={employer.carReason || ''}
                      onValueChange={(value) => updateEmployer(employer.id, 'carReason', value)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Wählen Sie den Grund" />
                      </SelectTrigger>
                      <SelectContent className="bg-white z-50">
                        <SelectItem value="noPublicTransport">Fehlen eines öffentlichen Verkehrsmittels</SelectItem>
                        <SelectItem value="timeSaving">Zeitersparnis von über 1 Stunde</SelectItem>
                        <SelectItem value="workUsage">Ständige Benützung während der Arbeitszeit</SelectItem>
                        <SelectItem value="healthReasons">Infolge von Krankheit oder Gebrechlichkeit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </AnimatedFormField>
      ))}

      {employers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p>Noch keine Arbeitgeber hinzugefügt</p>
          <Button
            type="button"
            onClick={addEmployer}
            variant="outline"
            className="mt-2"
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
          variant="outline"
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-dashed border-2 border-[#E2E8F0] text-[#718096] hover:border-[#1d64ff] hover:text-[#1d64ff] hover:bg-[#1d64ff]/5"
        >
          <Plus className="w-5 h-5" />
          Weiteren Arbeitgeber hinzufügen
        </Button>
      )}
    </div>
  );
};
