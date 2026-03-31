import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Upload, Eye, Check, RefreshCw, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { validateStoragePath } from '@/utils/fileValidation';
import { cn } from '@/lib/utils';

interface DocumentTemplate {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  is_active: boolean;
  template_type: string;
  created_at: string;
  uploaded_by: string;
}

export const DocumentTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [missingMap, setMissingMap] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('document_templates')
        .select('*')
        .eq('template_type', 'cover_letter')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const loaded = data || [];
      setTemplates(loaded);

      const entries = await Promise.all(
        loaded.map(async (t) => {
          if (!validateStoragePath(t.file_path)) {
            return [t.id, true] as [string, boolean];
          }
          const { data: signed, error: signErr } = await supabase.storage
            .from('document-templates')
            .createSignedUrl(t.file_path, 60);
          return [t.id, !!signErr || !signed] as [string, boolean];
        })
      );
      setMissingMap(Object.fromEntries(entries));
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: 'Fehler',
        description: 'Vorlagen konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const uploadDefaultTemplate = async () => {
    try {
      setUploading(true);
      const { data, error } = await supabase.functions.invoke('repair-cover-letter-template', { body: {} });
      if (error) throw error;
      toast({ title: 'Erfolgreich', description: 'Standard-Vorlage wurde repariert und aktiviert.' });
      await fetchTemplates();
    } catch (error) {
      console.error('Error repairing template:', error);
      toast({ title: 'Fehler', description: 'Fehler beim Reparieren der Standard-Vorlage.', variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf') && !file.type.includes('word') && !file.type.includes('document')) {
      toast({ title: 'Ungültiger Dateityp', description: 'Bitte laden Sie eine PDF- oder Word-Datei hoch.', variant: 'destructive' });
      return;
    }

    setUploading(true);
    try {
      const { sanitizeFileName, validateFilePath } = await import('@/utils/fileValidation');
      const safeName = sanitizeFileName(file.name);
      const fileName = `cover_letter_template_${Date.now()}_${safeName}`;
      
      if (!validateFilePath(fileName)) {
        toast({ title: 'Fehler', description: 'Ungültiger Dateipfad erkannt.', variant: 'destructive' });
        return;
      }

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-templates')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const { error: templateError } = await supabase
        .from('document_templates')
        .insert({
          name: safeName,
          file_path: uploadData.path,
          file_type: file.type,
          template_type: 'cover_letter',
          uploaded_by: user.id,
        })
        .select()
        .single();
      if (templateError) throw templateError;

      toast({ title: 'Erfolgreich', description: 'Vorlage wurde hochgeladen.' });
      fetchTemplates();
    } catch (error) {
      console.error('Error uploading template:', error);
      toast({ title: 'Fehler', description: 'Vorlage konnte nicht hochgeladen werden.', variant: 'destructive' });
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const setActiveTemplate = async (templateId: string) => {
    try {
      await supabase.from('document_templates').update({ is_active: false }).eq('template_type', 'cover_letter');
      const { error } = await supabase.from('document_templates').update({ is_active: true }).eq('id', templateId);
      if (error) throw error;
      toast({ title: 'Erfolgreich', description: 'Aktive Vorlage wurde aktualisiert.' });
      fetchTemplates();
    } catch (error) {
      console.error('Error setting active template:', error);
      toast({ title: 'Fehler', description: 'Aktive Vorlage konnte nicht gesetzt werden.', variant: 'destructive' });
    }
  };

  const deleteTemplate = async (template: DocumentTemplate) => {
    try {
      const { error: storageError } = await supabase.storage.from('document-templates').remove([template.file_path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from('document_templates').delete().eq('id', template.id);
      if (dbError) throw dbError;
      toast({ title: 'Erfolgreich', description: 'Vorlage wurde gelöscht.' });
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({ title: 'Fehler', description: 'Vorlage konnte nicht gelöscht werden.', variant: 'destructive' });
    }
  };

  const previewTemplate = async (template: DocumentTemplate) => {
    try {
      const { data, error } = await supabase.storage.from('document-templates').download(template.file_path);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing template:', error);
      toast({ title: 'Fehler', description: 'Vorschau konnte nicht geöffnet werden.', variant: 'destructive' });
    }
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-center py-16">
        <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground tracking-tight">Dokument-Vorlagen</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">
            {templates.length} Begleitschreiben-Vorlagen
          </p>
        </div>
        <button
          onClick={fetchTemplates}
          className="h-8 w-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Upload Section */}
      <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm p-5 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="template-upload" className="text-[13px] font-medium text-foreground">
            Neue Vorlage hochladen
          </Label>
          <Input
            id="template-upload"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={handleFileUpload}
            disabled={uploading}
            className="h-9 text-sm"
          />
          {uploading && <p className="text-[12px] text-muted-foreground">Wird hochgeladen...</p>}
        </div>

        <button
          onClick={uploadDefaultTemplate}
          disabled={uploading}
          className="h-8 px-3 rounded-lg border border-border/60 text-[12px] font-medium text-foreground hover:bg-muted/50 transition-colors flex items-center gap-1.5 disabled:opacity-50"
        >
          <Upload className="h-3.5 w-3.5" />
          Standard-Vorlage verwenden
        </button>
      </div>

      {/* Templates List */}
      <div>
        <h2 className="text-[13px] font-medium text-muted-foreground mb-3">Verfügbare Vorlagen</h2>
        
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-border/60 rounded-xl">
            <FileText className="w-8 h-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-foreground mb-1">Keine Vorlagen</p>
            <p className="text-[13px] text-muted-foreground">Laden Sie eine Vorlage hoch, um zu beginnen.</p>
          </div>
        ) : (
          <div className="border border-border/60 rounded-xl bg-background divide-y divide-border/40">
            {templates.map((template) => (
              <div
                key={template.id}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-muted/30 transition-colors"
              >
                {/* Status indicator */}
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0",
                  template.is_active ? "bg-foreground/[0.08]" : "bg-muted/40"
                )}>
                  {template.is_active ? (
                    <Check className="h-3.5 w-3.5 text-foreground" />
                  ) : (
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-medium text-foreground truncate">{template.name}</span>
                    {template.is_active && (
                      <span className="text-[10px] font-medium text-foreground bg-foreground/[0.06] px-1.5 py-0.5 rounded">
                        Aktiv
                      </span>
                    )}
                  </div>
                  <p className={cn(
                    "text-[11px] mt-0.5",
                    missingMap[template.id] ? "text-destructive" : "text-muted-foreground"
                  )}>
                    {missingMap[template.id] ? 'Datei fehlt im Storage' : 'Datei vorhanden'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => previewTemplate(template)}
                    disabled={!!missingMap[template.id]}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-30"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>

                  {missingMap[template.id] && template.file_path === 'templates/begleitschreiben-template.docx' && (
                    <button
                      onClick={uploadDefaultTemplate}
                      disabled={uploading}
                      className="h-7 px-2 rounded-md text-[11px] font-medium text-foreground border border-border/60 hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      Reparieren
                    </button>
                  )}

                  {!template.is_active && (
                    <button
                      onClick={() => setActiveTemplate(template.id)}
                      className="h-7 px-2 rounded-md text-[11px] font-medium text-foreground border border-border/60 hover:bg-muted/50 transition-colors"
                    >
                      Aktivieren
                    </button>
                  )}

                  <button
                    onClick={() => deleteTemplate(template)}
                    className="h-7 w-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Placeholders */}
      <div className="border border-border/60 rounded-xl bg-muted/20 p-5">
        <h3 className="text-[13px] font-medium text-foreground mb-3">Verfügbare Platzhalter</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
          {[
            ['{{name}}', 'Vollständiger Name'],
            ['{{firstName}}', 'Vorname'],
            ['{{lastName}}', 'Nachname'],
            ['{{address}}', 'Adresse'],
            ['{{email}}', 'E-Mail'],
            ['{{date}}', 'Aktuelles Datum'],
            ['{{taxYear}}', 'Steuerjahr'],
            ['{{salutation}}', 'Automatische Anrede'],
          ].map(([code, label]) => (
            <div key={code} className="flex items-center gap-2 text-[12px]">
              <code className="text-[11px] font-mono text-foreground bg-foreground/[0.04] px-1.5 py-0.5 rounded">{code}</code>
              <span className="text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
