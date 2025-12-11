import React from 'react';
import { Button } from '@/components/ui/button';
import { Minus, Plus } from 'lucide-react';

interface RepeaterCountInputProps {
  label: string;
  value: number;
  min: number;
  onChange: (count: number) => void;
}

export const RepeaterCountInput: React.FC<RepeaterCountInputProps> = ({
  label,
  value,
  min,
  onChange
}) => {
  const handleDecrease = () => {
    if (value > min) {
      onChange(value - 1);
    }
  };

  const handleIncrease = () => {
    onChange(value + 1);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDecrease}
          disabled={value <= min}
          className="w-8 h-8 p-0"
        >
          <Minus className="w-4 h-4" />
        </Button>
        
        <div className="bg-gray-50 border border-gray-200 rounded-md px-4 py-2 min-w-[60px] text-center">
          <span className="font-medium">{value}</span>
        </div>
        
        <Button
          variant="outline"
          size="sm"
          onClick={handleIncrease}
          className="w-8 h-8 p-0"
        >
          <Plus className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};