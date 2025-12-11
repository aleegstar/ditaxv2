
import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { Debt } from '@/types';
import { AnimatedFormField } from '@/components/ui/animated-form-field';

interface DebtRepeaterProps {
  debts: Debt[];
  onUpdate: (debts: Debt[]) => void;
}

export const DebtRepeater: React.FC<DebtRepeaterProps> = ({ debts, onUpdate }) => {
  const addDebt = () => {
    const newDebt: Debt = {
      id: crypto.randomUUID(),
      amount: 0,
      description: '',
      type: 'loan'
    };
    onUpdate([...debts, newDebt]);
  };

  const removeDebt = (id: string) => {
    onUpdate(debts.filter(d => d.id !== id));
  };

  const updateDebt = (id: string, field: keyof Debt, value: any) => {
    onUpdate(debts.map(d => 
      d.id === id ? { ...d, [field]: value } : d
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-black font-medium">Schulden</h4>
        <Button
          type="button"
          onClick={addDebt}
          size="sm"
          className="bg-white/10 border-white/30 text-black hover:bg-white/20"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Schuld hinzufügen
        </Button>
      </div>

      {debts.map((debt, index) => (
        <AnimatedFormField key={debt.id} delay={0.1 * index}>
          <Card className="bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-gray-800 font-medium">Schuld {index + 1}</h5>
                <Button
                  type="button"
                  onClick={() => removeDebt(debt.id)}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor={`type-${debt.id}`} className="text-black">
                    Art der Schuld
                  </Label>
                  <Select
                    value={debt.type}
                    onValueChange={(value) => updateDebt(debt.id, 'type', value)}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-800">
                      <SelectValue placeholder="Schuldtyp wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="loan">Bankkredit</SelectItem>
                      <SelectItem value="mortgage">Hypothek</SelectItem>
                      <SelectItem value="credit_card">Kreditkarte</SelectItem>
                      <SelectItem value="private">Privatdarlehen</SelectItem>
                      <SelectItem value="other">Andere</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`amount-${debt.id}`} className="text-black">
                    Betrag (CHF)
                  </Label>
                  <Input
                    id={`amount-${debt.id}`}
                    type="number"
                    value={debt.amount}
                    onChange={(e) => updateDebt(debt.id, 'amount', parseFloat(e.target.value) || 0)}
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
                    placeholder="z.B. 15000"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor={`description-${debt.id}`} className="text-black">
                    Beschreibung
                  </Label>
                  <Input
                    id={`description-${debt.id}`}
                    value={debt.description}
                    onChange={(e) => updateDebt(debt.id, 'description', e.target.value)}
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
                    placeholder="z.B. Autokredit bei Bank XY"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedFormField>
      ))}

      {debts.length === 0 && (
        <div className="text-center py-8 text-white/60">
          <p>Noch keine Schulden hinzugefügt</p>
          <Button
            type="button"
            onClick={addDebt}
            className="mt-2 bg-white/10 border-white/30 text-black hover:bg-white/20"
            variant="outline"
          >
            Erste Schuld hinzufügen
          </Button>
        </div>
      )}

      {/* Add another button at the bottom */}
      {debts.length > 0 && (
        <Button
          type="button"
          onClick={addDebt}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-dashed border-2 border-[#E2E8F0] text-[#718096] hover:border-[#1d64ff] hover:text-[#1d64ff] hover:bg-[#1d64ff]/5"
        >
          <Plus className="w-5 h-5" />
          Weitere Schuld hinzufügen
        </Button>
      )}
    </div>
  );
};
