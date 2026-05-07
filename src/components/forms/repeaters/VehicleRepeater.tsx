
import React from 'react';
import vehicleEmptyImg from '@/assets/vehicle-empty.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecureFormInput } from '@/components/ui/secure-form-input';
import { Label } from '@/components/ui/label';
import { Trash2, Plus } from 'lucide-react';
import { Vehicle } from '@/types';
import { AnimatedFormField } from '@/components/ui/animated-form-field';

interface VehicleRepeaterProps {
  vehicles: Vehicle[];
  onUpdate: (vehicles: Vehicle[]) => void;
}

export const VehicleRepeater: React.FC<VehicleRepeaterProps> = ({ vehicles, onUpdate }) => {
  const addVehicle = () => {
    const newVehicle: Vehicle = {
      id: crypto.randomUUID(),
      name: '',
      purchasePrice: 0,
      purchaseYear: new Date().getFullYear()
    };
    onUpdate([...vehicles, newVehicle]);
  };

  const removeVehicle = (id: string) => {
    onUpdate(vehicles.filter(v => v.id !== id));
  };

  const updateVehicle = (id: string, field: keyof Vehicle, value: any) => {
    onUpdate(vehicles.map(v => 
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">Fahrzeuge</span>
        <button
          type="button"
          onClick={addVehicle}
          className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-4 py-2.5 font-semibold text-sm tracking-tight text-white transition-all hover:brightness-110 active:scale-[0.97]"
        >
          <Plus className="w-4 h-4" />
          Fahrzeug hinzufügen
        </button>
      </div>

      {vehicles.map((vehicle, index) => (
        <AnimatedFormField key={vehicle.id} delay={0.1 * index}>
          <div className="relative bg-slate-50 border border-slate-200 rounded-2xl p-5">
            {/* Header with title and delete button */}
            <div className="flex justify-between items-center mb-4">
              <h5 className="text-slate-800 font-medium">Fahrzeug {index + 1}</h5>
              <Button
                type="button"
                onClick={() => removeVehicle(vehicle.id)}
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bezeichnung */}
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor={`name-${vehicle.id}`} className="text-slate-700 text-sm font-medium">
                  Bezeichnung
                </Label>
                <SecureFormInput
                  id={`name-${vehicle.id}`}
                  value={vehicle.name || ''}
                  onChange={(e) => updateVehicle(vehicle.id, 'name', e.target.value)}
                  placeholder="z.B. BMW X3, Honda Civic, etc."
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl h-12 focus:border-[#1D64FF] focus:ring-1 focus:ring-[#1D64FF]"
                  validationOptions={{
                    maxLength: 100,
                    allowedChars: /^[a-zA-Z0-9äöüÄÖÜß\s\-\.,]+$/
                  }}
                  sanitizeOnBlur={true}
                />
              </div>

              {/* Kaufpreis */}
              <div className="space-y-2">
                <Label htmlFor={`purchasePrice-${vehicle.id}`} className="text-slate-700 text-sm font-medium">
                  Kaufpreis (CHF)
                </Label>
                <Input
                  id={`purchasePrice-${vehicle.id}`}
                  type="number"
                  value={vehicle.purchasePrice || ''}
                  onChange={(e) => updateVehicle(vehicle.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                  placeholder="z.B. 25000"
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl h-12 focus:border-[#1D64FF] focus:ring-1 focus:ring-[#1D64FF]"
                />
              </div>

              {/* Kaufjahr */}
              <div className="space-y-2">
                <Label htmlFor={`purchaseYear-${vehicle.id}`} className="text-slate-700 text-sm font-medium">
                  Kaufjahr
                </Label>
                <Input
                  id={`purchaseYear-${vehicle.id}`}
                  type="number"
                  value={vehicle.purchaseYear || ''}
                  onChange={(e) => updateVehicle(vehicle.id, 'purchaseYear', parseInt(e.target.value) || 0)}
                  placeholder="z.B. 2020"
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400 rounded-xl h-12 focus:border-[#1D64FF] focus:ring-1 focus:ring-[#1D64FF]"
                />
              </div>
            </div>
          </div>
        </AnimatedFormField>
      ))}

      {/* Empty State */}
      {vehicles.length === 0 && (
        <div className="text-center py-10 px-6 bg-white/60 border border-slate-200 rounded-3xl flex flex-col items-center">
          <img src={vehicleEmptyImg} alt="" className="w-40 h-40 object-contain mb-4" />
          <h3 className="text-base font-semibold text-slate-900 mb-1">Noch keine Fahrzeuge hinzugefügt</h3>
          <p className="text-sm text-slate-500 mb-5">Füge dein erstes Fahrzeug hinzu, um fortzufahren.</p>
          <button
            type="button"
            onClick={addVehicle}
            className="rounded-2xl border border-[#1D64FF]/30 bg-white px-6 py-3 text-sm font-semibold text-[#1D64FF] hover:bg-[#1D64FF]/5 transition-all"
          >
            Erstes Fahrzeug hinzufügen
          </button>
        </div>
      )}

      {/* Add another button at the bottom */}
      {vehicles.length > 0 && (
        <Button
          type="button"
          onClick={addVehicle}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border border-dashed border-slate-200 text-slate-500 hover:border-[#1D64FF] hover:text-[#1D64FF] hover:bg-[#1D64FF]/5 bg-transparent"
        >
          <Plus className="w-5 h-5" />
          Weiteres Fahrzeug hinzufügen
        </Button>
      )}
    </div>
  );
};
