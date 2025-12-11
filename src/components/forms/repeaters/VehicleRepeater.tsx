
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SecureFormInput } from '@/components/ui/secure-form-input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
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
      <div className="flex items-center justify-between">
        <h4 className="text-black font-medium">Fahrzeuge</h4>
        <Button
          type="button"
          onClick={addVehicle}
          size="sm"
          className="bg-white/10 border-white/30 text-black hover:bg-white/20"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          Fahrzeug hinzufügen
        </Button>
      </div>

      {vehicles.map((vehicle, index) => (
        <AnimatedFormField key={vehicle.id} delay={0.1 * index}>
          <Card className="bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-gray-800 font-medium">Fahrzeug {index + 1}</h5>
                <Button
                  type="button"
                  onClick={() => removeVehicle(vehicle.id)}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor={`name-${vehicle.id}`} className="text-black">
                    Bezeichnung
                  </Label>
                  <SecureFormInput
                    id={`name-${vehicle.id}`}
                    value={vehicle.name || ''}
                    onChange={(e) => updateVehicle(vehicle.id, 'name', e.target.value)}
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
                    placeholder="z.B. BMW X3, Honda Civic, etc."
                    validationOptions={{
                      maxLength: 100,
                      allowedChars: /^[a-zA-Z0-9äöüÄÖÜß\s\-\.,]+$/
                    }}
                    sanitizeOnBlur={true}
                  />
                </div>

                <div>
                  <Label htmlFor={`purchasePrice-${vehicle.id}`} className="text-black">
                    Kaufpreis (CHF)
                  </Label>
                  <Input
                    id={`purchasePrice-${vehicle.id}`}
                    type="number"
                    value={vehicle.purchasePrice || ''}
                    onChange={(e) => updateVehicle(vehicle.id, 'purchasePrice', parseFloat(e.target.value) || 0)}
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
                    placeholder="z.B. 25000"
                  />
                </div>

                <div>
                  <Label htmlFor={`purchaseYear-${vehicle.id}`} className="text-black">
                    Kaufjahr
                  </Label>
                  <Input
                    id={`purchaseYear-${vehicle.id}`}
                    type="number"
                    value={vehicle.purchaseYear || ''}
                    onChange={(e) => updateVehicle(vehicle.id, 'purchaseYear', parseInt(e.target.value) || 0)}
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
                    placeholder="z.B. 2020"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedFormField>
      ))}

      {vehicles.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          <p>Noch keine Fahrzeuge hinzugefügt</p>
          <Button
            type="button"
            onClick={addVehicle}
            className="mt-2 w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200"
            style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
          >
            Erstes Fahrzeug hinzufügen
          </Button>
        </div>
      )}

      {/* Add another button at the bottom */}
      {vehicles.length > 0 && (
        <Button
          type="button"
          onClick={addVehicle}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-dashed border-2 border-[#E2E8F0] text-[#718096] hover:border-[#1d64ff] hover:text-[#1d64ff] hover:bg-[#1d64ff]/5"
        >
          <Plus className="w-5 h-5" />
          Weiteres Fahrzeug hinzufügen
        </Button>
      )}
    </div>
  );
};
