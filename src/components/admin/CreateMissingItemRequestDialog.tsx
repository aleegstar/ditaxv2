import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import { Plus, Trash2, FileText, HelpCircle, Loader2, X } from 'lucide-react';
import { useMissingItemRequests } from '@/hooks/useMissingItemRequests';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface MissingItemInput {
  title: string;
  description: string;
}

interface CreateMissingItemRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  taxReturnId?: string;
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
  const { toast } = useToast();

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

    if (!taxReturnId) {
      toast({
        title: "Fehler",
        description: "Keine Steuererklärung für dieses Jahr gefunden.",
        variant: "destructive"
      });
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
        })),
        taxYear
      );

      if (success) {
        // Update tax return status to missing_documents
        await supabase
          .from('tax_returns')
          .update({
            status: 'missing_documents',
            updated_at: new Date().toISOString()
          })
          .eq('id', taxReturnId);

        onOpenChange(false);
        resetForm();
        onSuccess?.();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setItems([{ title: '', description: '' }]);
    setRequestType('document');
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const isValid = items.some(item => item.title.trim()) && taxReturnId;
  const validItemCount = items.filter(i => i.title.trim()).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto p-0 gap-0 rounded-2xl border-0 shadow-xl [&>button]:hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">
                Fehlende Unterlagen/Angaben anfordern
              </h2>
              {userName && taxYear && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {userName} • {taxYear}
                </p>
              )}
            </div>
          </div>
          <button
            onClick={() => handleClose(false)}
            className="w-9 h-9 rounded-full bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 pb-4 space-y-5">
          {/* Step 1: Request Type */}
          <div className="space-y-2.5">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-semibold">1</span>
              Art der Anfrage
            </Label>
            <Select value={requestType} onValueChange={(v) => setRequestType(v as 'document' | 'information')}>
              <SelectTrigger className="h-11 rounded-xl border-primary/30 bg-primary/5 focus:ring-primary/20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="document" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span>Fehlende Unterlagen</span>
                  </div>
                </SelectItem>
                <SelectItem value="information" className="rounded-lg">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-amber-500" />
                    <span>Fehlende Angaben</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Step 2: Items */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2 text-sm font-medium">
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] flex items-center justify-center font-semibold">2</span>
              Anforderungen
            </Label>
            
            {items.map((item, index) => (
              <div key={index} className="relative border border-border/60 rounded-xl p-4 space-y-3 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">
                    {index + 1}. Anforderung
                  </span>
                  {items.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor={`title-${index}`} className="text-xs font-medium">
                    Titel <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id={`title-${index}`}
                    placeholder={requestType === 'document' ? 'z.B. Lohnausweis 2024' : 'z.B. Anzahl Arbeitstage im Homeoffice'}
                    value={item.title}
                    onChange={(e) => updateItem(index, 'title', e.target.value)}
                    className="h-10 rounded-lg border-border/60 bg-background focus-visible:ring-primary/20"
                  />
                </div>
                
                <div className="space-y-1.5">
                  <Label htmlFor={`desc-${index}`} className="text-xs font-medium text-muted-foreground">
                    Beschreibung (optional)
                  </Label>
                  <Textarea
                    id={`desc-${index}`}
                    placeholder={requestType === 'document' ? 'z.B. Bitte laden Sie Ihren Lohnausweis als PDF hoch' : 'z.B. Bitte geben Sie die genaue Anzahl der Homeoffice-Tage an'}
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    rows={2}
                    className="rounded-lg border-border/60 bg-background resize-none focus-visible:ring-primary/20"
                  />
                </div>
              </div>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={addItem}
              className="w-full h-10 rounded-xl border-dashed border-border/80 hover:border-primary/40 hover:bg-primary/5 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4 mr-2" />
              Weitere Anforderung hinzufügen
            </Button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-3 p-6 pt-4 border-t border-border/40">
          <Button 
            variant="outline" 
            onClick={() => handleClose(false)} 
            disabled={isSubmitting}
            className="h-10 px-6 rounded-xl border-border/60"
          >
            Abbrechen
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!isValid || isSubmitting}
            className="h-10 px-6 rounded-xl bg-primary hover:bg-primary/90"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Wird gesendet...
              </>
            ) : (
              <>{validItemCount} Anfrage(n) senden</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
