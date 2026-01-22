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
import { Plus, Trash2, FileWarning, HelpCircle, Loader2, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { useMissingItemRequests } from '@/hooks/useMissingItemRequests';
import { supabase } from '@/integrations/supabase/client';
import { SecurityService } from '@/services/SecurityService';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFilePath, setUploadedFilePath] = useState<string | null>(null);
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

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Ungültiger Dateityp",
          description: "Bitte wählen Sie eine PDF-Datei aus.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
      setUploadedFilePath(null);
    }
  };

  const handleUploadFile = async () => {
    if (!selectedFile || !taxYear) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte wählen Sie eine Datei aus.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const isAdmin = await SecurityService.verifyAdminAccess('completed_tax_return_upload');
      if (!isAdmin) {
        throw new Error('Keine Admin-Berechtigung');
      }

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) {
        throw new Error(`Auth-Fehler: ${userError?.message || 'Benutzer nicht authentifiziert'}`);
      }

      const fileName = `${userId}_${taxYear}_${Date.now()}.pdf`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('completed-tax-returns')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) {
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
      }

      // Insert record into completed_tax_returns table
      const { error: dbError } = await supabase
        .from('completed_tax_returns')
        .insert({
          user_id: userId,
          tax_year: taxYear,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: 'application/pdf',
          status: 'available',
          uploaded_by_admin_id: userData.user?.id
        });

      if (dbError) {
        await supabase.storage.from('completed-tax-returns').remove([filePath]);
        throw new Error(`Datenbank-Fehler: ${dbError.message}`);
      }

      setUploadedFilePath(filePath);
      toast({
        title: "Upload erfolgreich",
        description: "Die Steuererklärung wurde hochgeladen."
      });
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast({
        title: "Upload-Fehler",
        description: error.message || "Die Datei konnte nicht hochgeladen werden.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
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
    setSelectedFile(null);
    setUploadedFilePath(null);
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      resetForm();
    }
    onOpenChange(open);
  };

  const isValid = items.some(item => item.title.trim()) && uploadedFilePath;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
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
          {/* Step 1: Upload Tax Return PDF */}
          <div className="space-y-3">
            <Label className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">1</span>
              Steuererklärung hochladen
            </Label>
            <div className="border rounded-lg p-4 space-y-3 bg-muted/30">
              {uploadedFilePath ? (
                <div className="flex items-center gap-3 text-green-600">
                  <CheckCircle2 className="h-5 w-5" />
                  <div>
                    <p className="font-medium">Steuererklärung hochgeladen</p>
                    <p className="text-sm text-muted-foreground">{selectedFile?.name}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <Input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileSelect}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      onClick={handleUploadFile}
                      disabled={!selectedFile || isUploading}
                      size="sm"
                    >
                      {isUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {selectedFile && !uploadedFilePath && (
                    <p className="text-sm text-muted-foreground">
                      Ausgewählt: {selectedFile.name} - Klicken Sie auf Upload um fortzufahren
                    </p>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Step 2: Request Type */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">2</span>
              Art der Anfrage
            </Label>
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

          {/* Step 3: Items */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">3</span>
              Anforderungen
            </Label>
            
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
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isSubmitting}>
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
