import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, FileWarning, HelpCircle, Loader2 } from 'lucide-react';
import { useMissingItemRequests } from '@/hooks/useMissingItemRequests';

interface MissingItemInput {
  title: string;
  description: string;
}

interface CreateMissingItemRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  taxReturnId: string;
  userName?: string;
  taxYear?: string;
  onSuccess?: () => void;
}

export const CreateMissingItemRequestDialog: React.FC<CreateMissingItemRequestDialogProps> = ({
  open,
  onOpenChange,
  userId,
  taxReturnId,
  userName,
  taxYear,
  onSuccess,
}) => {
  const [requestType, setRequestType] = useState<'document' | 'information'>('document');
  const [items, setItems] = useState<MissingItemInput[]>([{ title: '', description: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createRequests } = useMissingItemRequests();

  const addItem = () => {
    setItems([...items, { title: '', description: '' }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof MissingItemInput, value: string) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const handleSubmit = async () => {
    // Validate
    const validItems = items.filter(item => item.title.trim());
    if (validItems.length === 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await createRequests(
        validItems.map(item => ({
          user_id: userId,
          tax_return_id: taxReturnId,
          request_type: requestType,
          title: item.title.trim(),
          description: item.description.trim() || undefined,
        }))
      );

      if (success) {
        onOpenChange(false);
        setItems([{ title: '', description: '' }]);
        setRequestType('document');
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = items.some(item => item.title.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {requestType === 'document' ? (
              <FileWarning className="h-5 w-5 text-orange-500" />
            ) : (
              <HelpCircle className="h-5 w-5 text-red-500" />
            )}
            Fehlende Unterlagen/Angaben anfordern
          </DialogTitle>
          <DialogDescription>
            {userName && taxYear && (
              <span className="font-medium">
                Für {userName} • Steuerjahr {taxYear}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Request Type */}
          <div className="space-y-2">
            <Label>Art der Anfrage</Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as 'document' | 'information')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="document">
                  <div className="flex items-center gap-2">
                    <FileWarning className="h-4 w-4 text-orange-500" />
                    Fehlende Unterlagen
                  </div>
                </SelectItem>
                <SelectItem value="information">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-red-500" />
                    Fehlende Angaben
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Items */}
          <div className="space-y-4">
            <Label>Anforderungen</Label>
            
            {items.map((item, index) => (
              <div key={index} className="relative border rounded-lg p-4 space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">
                    {index + 1}. Anforderung
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`title-${index}`}>
                    Titel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`title-${index}`}
                    placeholder={requestType === 'document' ? 'z.B. Lohnausweis 2024' : 'z.B. Anzahl Arbeitstage im Homeoffice'}
                    value={item.title}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor={`desc-${index}`}>Beschreibung (optional)</Label>
                  <Textarea
                    id={`desc-${index}`}
                    placeholder={requestType === 'document' ? 'z.B. Bitte laden Sie Ihren Lohnausweis als PDF hoch' : 'z.B. Bitte geben Sie die genaue Anzahl der Homeoffice-Tage an'}
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Weitere Anforderung hinzufügen
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Abbrechen
          </Button>
          <Button onClick={handleSubmit} disabled={!isValid || isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>
                {items.filter(i => i.title.trim()).length} Anfrage(n) senden
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
