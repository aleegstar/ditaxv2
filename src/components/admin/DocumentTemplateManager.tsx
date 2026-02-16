import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, Upload, Eye, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AdminWelcomeHeader } from './AdminWelcomeHeader';
import { validateStoragePath } from '@/utils/fileValidation';

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

      // Verify that referenced files exist in storage
      const entries = await Promise.all(
        loaded.map(async (t) => {
          if (!validateStoragePath(t.file_path)) {
            return [t.id, true] as [string, boolean];
          }
          const { data: signed, error: signErr } = await supabase.storage
            .from('document-templates')
            .createSignedUrl(t.file_path, 60);
          return [t.id, !!signErr || !signed] as [string, boolean]; // true => missing
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
      
      const { data, error } = await supabase.functions.invoke('repair-cover-letter-template', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: 'Erfolgreich',
        description: 'Standard-Vorlage wurde repariert und aktiviert.',
      });

      await fetchTemplates();
    } catch (error) {
      console.error('Error repairing template:', error);
      toast({
        title: 'Fehler',
        description: 'Fehler beim Reparieren der Standard-Vorlage.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.includes('pdf') && !file.type.includes('word') && !file.type.includes('document')) {
      toast({
        title: 'Ungültiger Dateityp',
        description: 'Bitte laden Sie eine PDF- oder Word-Datei hoch.',
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);

    try {
      // SECURITY: Sanitize file name to prevent path traversal attacks
      const { sanitizeFileName, validateFilePath } = await import('@/utils/fileValidation');
      const safeName = sanitizeFileName(file.name);
      const fileName = `cover_letter_template_${Date.now()}_${safeName}`;
      
      // SECURITY: Validate complete file path
      if (!validateFilePath(fileName)) {
        toast({
          title: 'Fehler',
          description: 'Ungültiger Dateipfad erkannt.',
          variant: 'destructive',
        });
        return;
      }

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('document-templates')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Save template metadata to database (use sanitized file name)
      const { data: templateData, error: templateError } = await supabase
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

      toast({
        title: 'Erfolgreich',
        description: 'Vorlage wurde hochgeladen.',
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error uploading template:', error);
      toast({
        title: 'Fehler',
        description: 'Vorlage konnte nicht hochgeladen werden.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      // Reset file input
      event.target.value = '';
    }
  };

  const setActiveTemplate = async (templateId: string) => {
    try {
      // First, deactivate all templates
      await supabase
        .from('document_templates')
        .update({ is_active: false })
        .eq('template_type', 'cover_letter');

      // Then activate the selected template
      const { error } = await supabase
        .from('document_templates')
        .update({ is_active: true })
        .eq('id', templateId);

      if (error) throw error;

      toast({
        title: 'Erfolgreich',
        description: 'Aktive Vorlage wurde aktualisiert.',
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error setting active template:', error);
      toast({
        title: 'Fehler',
        description: 'Aktive Vorlage konnte nicht gesetzt werden.',
        variant: 'destructive',
      });
    }
  };

  const deleteTemplate = async (template: DocumentTemplate) => {
    try {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('document-templates')
        .remove([template.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('document_templates')
        .delete()
        .eq('id', template.id);

      if (dbError) throw dbError;

      toast({
        title: 'Erfolgreich',
        description: 'Vorlage wurde gelöscht.',
      });

      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Fehler',
        description: 'Vorlage konnte nicht gelöscht werden.',
        variant: 'destructive',
      });
    }
  };

  const previewTemplate = async (template: DocumentTemplate) => {
    try {
      const { data, error } = await supabase.storage
        .from('document-templates')
        .download(template.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error previewing template:', error);
      toast({
        title: 'Fehler',
        description: 'Vorschau konnte nicht geöffnet werden.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div>Lade Vorlagen...</div>;
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 bg-white min-h-screen">
      <AdminWelcomeHeader
        title="Dokument-Vorlagen"
        subtitle="Verwalten Sie Begleitschreiben-Vorlagen für die PDF-Generierung"
        badge={{
          text: `${templates.length} Vorlagen`,
          variant: 'secondary'
        }}
        onRefresh={fetchTemplates}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Begleitschreiben-Vorlagen</CardTitle>
          <CardDescription>
            Laden Sie PDF- oder Word-Vorlagen hoch. DOCX-Vorlagen werden als DOCX ausgegeben, PDF-Vorlagen als PDF. Verwenden Sie Platzhalter wie {`{{name}}, {{address}}, {{email}}, {{date}}`} für dynamische Inhalte.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-upload" className="text-sm font-medium">
                  Neue Vorlage hochladen
                </Label>
                <Input
                  id="template-upload"
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mt-1"
                />
                {uploading && <p className="text-sm text-muted-foreground mt-1">Wird hochgeladen...</p>}
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={uploadDefaultTemplate}
                  disabled={uploading}
                  variant="outline"
                  className="flex-1"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Standard-Vorlage verwenden
                </Button>
              </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-3">Verfügbare Vorlagen</h3>
              
              {templates.length === 0 ? (
                <p className="text-muted-foreground">Keine Vorlagen vorhanden.</p>
              ) : (
                <div className="space-y-2">
                  {templates.map((template) => (
                    <div
                      key={template.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        {template.is_active && (
                          <Check className="h-4 w-4 text-green-600" />
                        )}
                        <div>
                          <p className="font-medium">{template.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {template.is_active ? 'Aktive Vorlage' : 'Inaktiv'}
                          </p>
                          <p className={missingMap[template.id] ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>
                            {missingMap[template.id] ? 'Datei fehlt im Storage' : 'Datei vorhanden'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => previewTemplate(template)}
                          disabled={!!missingMap[template.id]}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>

                        {missingMap[template.id] && template.file_path === 'templates/begleitschreiben-template.docx' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={uploadDefaultTemplate}
                            disabled={uploading}
                          >
                            Reparieren
                          </Button>
                        )}
                        
                        {!template.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTemplate(template.id)}
                          >
                            Aktivieren
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteTemplate(template)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-medium mb-2">Verfügbare Platzhalter:</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><code>{'{{name}}'}</code> - Vollständiger Name</div>
                <div><code>{'{{firstName}}'}</code> - Vorname</div>
                <div><code>{'{{lastName}}'}</code> - Nachname</div>
                <div><code>{'{{address}}'}</code> - Adresse</div>
                <div><code>{'{{email}}'}</code> - E-Mail</div>
                <div><code>{'{{date}}'}</code> - Aktuelles Datum</div>
                <div><code>{'{{taxYear}}'}</code> - Steuerjahr</div>
                <div><code>{'{{salutation}}'}</code> - Automatische Anrede</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};