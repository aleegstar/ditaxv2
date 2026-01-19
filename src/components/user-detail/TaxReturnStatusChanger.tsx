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
  { value: 'pending', label: 'Ausstehend', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'processing', label: 'In Bearbeitung', color: 'bg-blue-100 text-blue-800' },
  { value: 'missing_documents', label: 'Fehlende Unterlagen', color: 'bg-orange-100 text-orange-800' },
  { value: 'missing_information', label: 'Fehlende Angaben', color: 'bg-red-100 text-red-800' },
  { value: 'success', label: 'Abgeschlossen', color: 'bg-green-100 text-green-800' },
  { value: 'completed', label: 'Erledigt', color: 'bg-green-100 text-green-800' },
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
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Status:</span>
      <Select
        value={currentStatus || 'pending'}
        onValueChange={handleStatusChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="w-[200px]">
          {isUpdating ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Aktualisiere...</span>
            </div>
          ) : (
            <SelectValue>
              {currentOption ? (
                <Badge className={currentOption.color} variant="secondary">
                  {currentOption.label}
                </Badge>
              ) : (
                <span className="text-muted-foreground">Status wählen</span>
              )}
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {STATUS_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <Badge className={option.color} variant="secondary">
                {option.label}
              </Badge>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
