
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Trash2, Plus } from 'lucide-react';
import { Property } from '@/types';
import { AnimatedFormField } from '@/components/ui/animated-form-field';

interface PropertyRepeaterProps {
  properties: Property[];
  onUpdate: (properties: Property[]) => void;
}

export const PropertyRepeater: React.FC<PropertyRepeaterProps> = ({ properties, onUpdate }) => {
  const addProperty = () => {
    const newProperty: Property = {
      id: crypto.randomUUID(),
      address: '',
      type: 'house',
      taxValue: 0,
      rentalValue: 0,
      isOutsideCanton: false,
      isOlderThanFiveYears: false,
      purchasedThisYear: false,
      value: 0 // Keep for compatibility
    };
    onUpdate([...properties, newProperty]);
  };

  const removeProperty = (id: string) => {
    onUpdate(properties.filter(p => p.id !== id));
  };

  const updateProperty = (id: string, field: keyof Property, value: any) => {
    onUpdate(properties.map(p => 
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-slate-600 font-medium">Immobilien</h4>
        <Button
          type="button"
          onClick={addProperty}
          size="sm"
          className="border-slate-200 text-slate-600 hover:bg-slate-100"
          variant="outline"
          style={{ touchAction: 'manipulation' }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Immobilie hinzufügen
        </Button>
      </div>

      {properties.map((property, index) => (
        <AnimatedFormField key={property.id} delay={0.1 * index}>
          <Card className="bg-white border border-gray-200 rounded-lg">
            <CardContent className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h5 className="text-gray-800 font-medium">Immobilie {index + 1}</h5>
                <Button
                  type="button"
                  onClick={() => removeProperty(property.id)}
                  size="sm"
                  variant="ghost"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor={`address-${property.id}`} className="text-black">
                    Adresse
                  </Label>
                  <Input
                    id={`address-${property.id}`}
                    value={property.address}
                    onChange={(e) => updateProperty(property.id, 'address', e.target.value)}
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
                    placeholder="z.B. Musterstrasse 1, 8000 Zürich"
                  />
                </div>

                <div>
                  <Label htmlFor={`type-${property.id}`} className="text-black">
                    Typ
                  </Label>
                  <Select
                    value={property.type}
                    onValueChange={(value) => updateProperty(property.id, 'type', value)}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-800">
                      <SelectValue placeholder="Immobilientyp wählen" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 z-50">
                      <SelectItem value="house">Einfamilienhaus</SelectItem>
                      <SelectItem value="apartment">Eigentumswohnung</SelectItem>
                      <SelectItem value="multi_family">Mehrfamilienhaus</SelectItem>
                      <SelectItem value="commercial">Gewerbeimmobilie</SelectItem>
                      <SelectItem value="land">Bauland</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`taxValue-${property.id}`} className="text-black">
                    Steuerwert (CHF) *
                  </Label>
                  <Input
                    id={`taxValue-${property.id}`}
                    type="number"
                    value={property.taxValue || ''}
                    onChange={(e) => updateProperty(property.id, 'taxValue', parseFloat(e.target.value) || 0)}
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
                    placeholder="z.B. 750000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor={`rentalValue-${property.id}`} className="text-black">
                    Eigenmietwert (CHF) *
                  </Label>
                  <Input
                    id={`rentalValue-${property.id}`}
                    type="number"
                    value={property.rentalValue || ''}
                    onChange={(e) => updateProperty(property.id, 'rentalValue', parseFloat(e.target.value) || 0)}
                    className="bg-white border-gray-300 text-gray-800 placeholder:text-gray-500"
                    placeholder="z.B. 18000"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor={`isOutsideCanton-${property.id}`} className="text-black">
                    Ausserhalb des Wohnkantons *
                  </Label>
                  <Select
                    value={property.isOutsideCanton ? 'ja' : 'nein'}
                    onValueChange={(value) => updateProperty(property.id, 'isOutsideCanton', value === 'ja')}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 z-50">
                      <SelectItem value="nein">Nein</SelectItem>
                      <SelectItem value="ja">Ja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor={`isOlderThanFiveYears-${property.id}`} className="text-black">
                    Seit mehr als 5 Jahren im Besitz *
                  </Label>
                  <Select
                    value={property.isOlderThanFiveYears ? 'ja' : 'nein'}
                    onValueChange={(value) => updateProperty(property.id, 'isOlderThanFiveYears', value === 'ja')}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 z-50">
                      <SelectItem value="nein">Nein</SelectItem>
                      <SelectItem value="ja">Ja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor={`purchasedThisYear-${property.id}`} className="text-black">
                    Wurde im aktuellen Steuerjahr erworben *
                  </Label>
                  <Select
                    value={property.purchasedThisYear ? 'ja' : 'nein'}
                    onValueChange={(value) => updateProperty(property.id, 'purchasedThisYear', value === 'ja')}
                  >
                    <SelectTrigger className="bg-white border-gray-300 text-gray-800">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-200 z-50">
                      <SelectItem value="nein">Nein</SelectItem>
                      <SelectItem value="ja">Ja</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </AnimatedFormField>
      ))}

      {properties.length === 0 && (
        <div className="text-center py-8 bg-slate-50 border border-slate-200 rounded-2xl text-slate-500">
          <p>Noch keine Immobilien hinzugefügt</p>
          <Button
            type="button"
            onClick={addProperty}
            className="mt-2 border-slate-200 text-slate-600 hover:bg-slate-100"
            variant="outline"
            style={{ touchAction: 'manipulation' }}
          >
            Erste Immobilie hinzufügen
          </Button>
        </div>
      )}

      {/* Add another button at the bottom */}
      {properties.length > 0 && (
        <Button
          type="button"
          onClick={addProperty}
          variant="outline"
          className="w-full flex items-center justify-center gap-2 min-h-[56px] rounded-xl border-dashed border-2 border-[#E2E8F0] text-[#718096] hover:border-[#1d64ff] hover:text-[#1d64ff] hover:bg-[#1d64ff]/5"
        >
          <Plus className="w-5 h-5" />
          Weitere Immobilie hinzufügen
        </Button>
      )}
    </div>
  );
};
