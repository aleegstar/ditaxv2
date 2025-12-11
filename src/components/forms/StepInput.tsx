

import React, { useState, useEffect } from 'react';
import { FormStep, AddressData } from '@/types/multiStepForm';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface StepInputProps {
  step: FormStep;
  value: string | boolean | AddressData | number | null | any[] | Record<string, any>;
  onChange: (value: any) => void;
  error?: string;
  onAutoNext?: () => void;
}

interface AddressInputProps {
  value: AddressData;
  onChange: (value: AddressData) => void;
  error?: string;
}

const AddressInput: React.FC<AddressInputProps> = ({ value, onChange, error }) => {
  const handleAddressChange = (field: keyof AddressData, newValue: string) => {
    onChange({ ...value, [field]: newValue });
  };

  return (
    <div className="grid gap-2">
      <div>
        <Label htmlFor="address">Strasse</Label>
        <Input
          type="text"
          id="address"
          value={value?.address || ''}
          onChange={(e) => handleAddressChange('address', e.target.value)}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
      <div>
        <Label htmlFor="postalCode">PLZ</Label>
        <Input
          type="text"
          id="postalCode"
          value={value?.postalCode || ''}
          onChange={(e) => handleAddressChange('postalCode', e.target.value)}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
      <div>
        <Label htmlFor="city">Ort</Label>
        <Input
          type="text"
          id="city"
          value={value?.city || ''}
          onChange={(e) => handleAddressChange('city', e.target.value)}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
      </div>
    </div>
  );
};

const getDisplayText = (option: string): string => {
  const displayMap: Record<string, string> = {
    'public': 'Öffentliche Verkehrsmittel',
    'publicBike': 'Öffentliche Verkehrsmittel + Velo',
    'bike': 'Velo',
    'car': 'Auto',
    'higher-income-father': 'Beim höherverdienenden Vater',
    'higher-income-mother': 'Bei der höherverdienenden Mutter',
    'child-self-sufficient': 'Kind ist selbstständig',
    'child-different-household': 'Kind lebt in anderem Haushalt',
    'römisch-katholisch': 'Römisch-katholisch',
    'reformiert': 'Reformiert',
    'christkatolisch': 'Christkatholisch',
    'andere/keine': 'Andere/Keine',
    'ledig': 'Ledig',
    'verheiratet': 'Verheiratet',
    'verwitwet': 'Verwitwet',
    'geschieden': 'Geschieden',
    'getrennt': 'Getrennt'
  };

  return displayMap[option] || option;
};

export const StepInput: React.FC<StepInputProps> = ({ step, value, onChange, error, onAutoNext }) => {
  // Filter out complex types that basic inputs can't handle
  const getSimpleValue = () => {
    if (Array.isArray(value) || (typeof value === 'object' && value !== null && !('address' in value))) {
      return '';
    }
    return value;
  };

  const [localValue, setLocalValue] = useState(getSimpleValue());

  useEffect(() => {
    setLocalValue(getSimpleValue());
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const newValue = step.type === 'number' ? Number(e.target.value) : e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleBooleanChange = (newValue: boolean) => {
    setLocalValue(newValue);
    onChange(newValue);
    if (onAutoNext) {
      onAutoNext();
    }
  };

  const renderInput = () => {
    switch (step.type) {
      case 'text':
      case 'email':
      case 'number':
        return (
          <>
            <Input
              type={step.type}
              id={step.id}
              value={localValue as string | number}
              onChange={handleChange}
            />
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </>
        );
      case 'boolean':
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant={localValue === true ? 'default' : 'outline'}
              onClick={() => handleBooleanChange(true)}
            >
              Ja
            </Button>
            <Button
              variant={localValue === false ? 'default' : 'outline'}
              onClick={() => handleBooleanChange(false)}
            >
              Nein
            </Button>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </div>
        );
      case 'select':
        return (
          <>
            <Select onValueChange={onChange} defaultValue={value as string}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {step.options?.map((option) => (
                  <SelectItem key={option} value={option}>{getDisplayText(option)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </>
        );
      case 'address':
        return (
          <AddressInput
            value={value as AddressData}
            onChange={onChange}
            error={error}
          />
        );
      default:
        return <p>Unsupported input type</p>;
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor={step.id}>{step.title}</Label>
      {renderInput()}
    </div>
  );
};

