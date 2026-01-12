
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { AnimatedFormField } from '@/components/ui/animated-form-field';

interface RentalIncomeData {
  id: string;
  property: string;
  annualIncome: number;
  expenses: number;
}

interface RentalIncomeRepeaterProps {
  rentalIncomes: RentalIncomeData[];
  onChange: (rentalIncomes: RentalIncomeData[]) => void;
}

export const RentalIncomeRepeater: React.FC<RentalIncomeRepeaterProps> = ({ rentalIncomes, onChange }) => {
  const addRentalIncome = () => {
    const newRental: RentalIncomeData = {
      id: Math.random().toString(36).substr(2, 9),
      property: '',
      annualIncome: 0,
      expenses: 0
    };
    onChange([...rentalIncomes, newRental]);
  };

  const removeRentalIncome = (id: string) => {
    onChange(rentalIncomes.filter(rental => rental.id !== id));
  };

  const updateRentalIncome = (id: string, field: keyof RentalIncomeData, value: any) => {
    onChange(rentalIncomes.map(rental => 
      rental.id === id ? { ...rental, [field]: value } : rental
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-slate-600">Mieteinnahmen Details</h4>
        <Button
          type="button"
          onClick={addRentalIncome}
          variant="outline"
          size="sm"
          className="flex items-center gap-2 border-slate-200 text-slate-600 hover:bg-slate-100"
        >
          <Plus className="w-4 h-4" />
          Mieteinnahme hinzufügen
        </Button>
      </div>

      {rentalIncomes.map((rental, index) => (
        <AnimatedFormField key={rental.id} delay={0.1 * index}>
          <Card className="relative bg-slate-50 border border-slate-200 rounded-2xl">
            <CardContent className="pt-6">
              <div className="absolute top-2 right-2">
                <Button
                  type="button"
                  onClick={() => removeRentalIncome(rental.id)}
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor={`property-${rental.id}`} className="text-slate-700">Immobilie</Label>
                  <Input
                    id={`property-${rental.id}`}
                    value={rental.property}
                    onChange={(e) => updateRentalIncome(rental.id, 'property', e.target.value)}
                    placeholder="Adresse oder Bezeichnung der Immobilie"
                    className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <Label htmlFor={`annualIncome-${rental.id}`} className="text-slate-700">Jährliche Mieteinnahmen (CHF)</Label>
                  <Input
                    id={`annualIncome-${rental.id}`}
                    type="number"
                    value={rental.annualIncome}
                    onChange={(e) => updateRentalIncome(rental.id, 'annualIncome', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                  />
                </div>

                <div>
                  <Label htmlFor={`expenses-${rental.id}`} className="text-slate-700">Jährliche Ausgaben (CHF)</Label>
                  <Input
                    id={`expenses-${rental.id}`}
                    type="number"
                    value={rental.expenses}
                    onChange={(e) => updateRentalIncome(rental.id, 'expenses', parseFloat(e.target.value) || 0)}
                    placeholder="0.00"
                    className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedFormField>
      ))}

      {rentalIncomes.length === 0 && (
        <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500">
          <p>Noch keine Mieteinnahmen hinzugefügt</p>
          <Button
            type="button"
            onClick={addRentalIncome}
            variant="outline"
            className="mt-2 border-slate-200 text-slate-600 hover:bg-slate-100"
          >
            Erste Mieteinnahme hinzufügen
          </Button>
        </div>
      )}

      {/* Add another button at the bottom */}
      {rentalIncomes.length > 0 && (
        <Button
          type="button"
          onClick={addRentalIncome}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-dashed border-2 border-[#E2E8F0] text-[#718096] hover:border-[#1d64ff] hover:text-[#1d64ff] hover:bg-[#1d64ff]/5"
        >
          <Plus className="w-5 h-5" />
          Weitere Mieteinnahme hinzufügen
        </Button>
      )}
    </div>
  );
};
