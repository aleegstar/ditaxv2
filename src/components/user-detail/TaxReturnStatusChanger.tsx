import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface TaxReturnStatusChangerProps {
  userId: string;
  taxYear: string;
  currentStatus: string | null;
  onStatusChanged: () => void;
}

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Ausstehend', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
  { value: 'processing', label: 'In Bearbeitung', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-blue-200' },
  { value: 'missing_documents', label: 'Fehlende Unterlagen', bgColor: 'bg-orange-50', textColor: 'text-orange-700', borderColor: 'border-orange-200' },
  { value: 'missing_information', label: 'Fehlende Angaben', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' },
  { value: 'documents_submitted', label: 'Unterlagen eingereicht', bgColor: 'bg-purple-50', textColor: 'text-purple-700', borderColor: 'border-purple-200' },
  { value: 'success', label: 'Abgeschlossen', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
  { value: 'completed', label: 'Erledigt', bgColor: 'bg-emerald-50', textColor: 'text-emerald-700', borderColor: 'border-emerald-200' },
  { value: 'paid', label: 'Bezahlt', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' },
];

export const TaxReturnStatusChanger = ({
  userId,
  taxYear,
  currentStatus,
  onStatusChanged,
}: TaxReturnStatusChangerProps) => {
  const [isUpdating, setIsUpdating] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;

    setIsUpdating(true);
    try {
      // First check if a tax_return exists for this user and year
      const { data: existingReturn, error: fetchError } = await supabase
        .from('tax_returns')
        .select('id')
        .eq('user_id', userId)
        .eq('tax_year', taxYear)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingReturn) {
        // Update existing
        const { error: updateError } = await supabase
          .from('tax_returns')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('user_id', userId)
          .eq('tax_year', taxYear);

        if (updateError) throw updateError;
      } else {
        // Create new tax_return entry
        const { error: insertError } = await supabase
          .from('tax_returns')
          .insert({
            user_id: userId,
            tax_year: taxYear,
            status: newStatus,
            express_service: false,
          });

        if (insertError) throw insertError;
      }

      const statusLabel = STATUS_OPTIONS.find(s => s.value === newStatus)?.label || newStatus;
      toast.success(`Status auf "${statusLabel}" geändert`);
      onStatusChanged();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Fehler beim Aktualisieren des Status');
    } finally {
      setIsUpdating(false);
    }
  };

  const currentOption = STATUS_OPTIONS.find(s => s.value === currentStatus);

  return (
    <div className="flex items-center gap-3">
      <Select
        value={currentStatus || 'pending'}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger 
          className={`w-auto min-w-[180px] h-9 rounded-full border px-4 text-xs font-medium transition-all ${
            currentOption 
              ? `${currentOption.bgColor} ${currentOption.textColor} ${currentOption.borderColor}` 
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
        >
          {isUpdating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Aktualisiere...</span>
            </div>
          ) : (
            <SelectValue>
              {currentOption ? (
                <span className="font-medium">{currentOption.label}</span>
              ) : (
                <span className="text-muted-foreground">Status wählen</span>
              )}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent className="rounded-xl border-slate-200 shadow-lg">
          {STATUS_OPTIONS.map((option) => (
            <SelectItem 
              key={option.value} 
              value={option.value}
              className="rounded-lg my-0.5 cursor-pointer"
            >
              <div className={`flex items-center gap-2 px-2 py-1 rounded-full ${option.bgColor} ${option.textColor}`}>
                <div className={`w-2 h-2 rounded-full ${option.textColor.replace('text-', 'bg-')}`} />
                <span className="font-medium text-sm">{option.label}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
