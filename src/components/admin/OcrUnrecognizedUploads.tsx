import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AdminWelcomeHeader } from './AdminWelcomeHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileQuestion, CheckCircle, XCircle, Eye } from 'lucide-react';

interface UnrecognizedUpload {
  id: string;
  user_id: string;
  document_id: string | null;
  file_name: string;
  detected_text_sample: string | null;
  matched_keywords: string[];
  best_match_type: string | null;
  best_match_score: number;
  status: string;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

export function OcrUnrecognizedUploads() {
  const [uploads, setUploads] = useState<UnrecognizedUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('unresolved');

  useEffect(() => {
    fetchUploads();
  }, [filter]);

  const fetchUploads = async () => {
    setLoading(true);
    let query = supabase
      .from('ocr_unrecognized_uploads')
      .select('*')
      .order('created_at', { ascending: false });

    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query.limit(100);

    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
    } else {
      setUploads(data || []);
    }
    setLoading(false);
  };

  const updateStatus = async (id: string, status: 'resolved' | 'ignored') => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from('ocr_unrecognized_uploads')
      .update({
        status,
        resolved_by: user?.id,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) {
      toast({ variant: 'destructive', title: 'Fehler', description: error.message });
      return;
    }
    toast({ title: 'Aktualisiert', description: `Status auf "${status}" gesetzt.` });
    await fetchUploads();
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case 'unresolved': return <Badge variant="destructive" className="text-xs">Offen</Badge>;
      case 'resolved': return <Badge className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">Gelöst</Badge>;
      case 'ignored': return <Badge variant="secondary" className="text-xs">Ignoriert</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminWelcomeHeader
        title="Nicht erkannte Uploads"
        subtitle="Dokumente die von der OCR-Erkennung nicht zugeordnet werden konnten"
        badge={{ text: `${uploads.length} Einträge`, variant: 'secondary' }}
        onRefresh={fetchUploads}
      />

      <div className="flex gap-3 mt-6 mb-6">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="unresolved">Offen</SelectItem>
            <SelectItem value="resolved">Gelöst</SelectItem>
            <SelectItem value="ignored">Ignoriert</SelectItem>
            <SelectItem value="all">Alle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Laden...</div>
      ) : uploads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground">Keine nicht erkannten Uploads vorhanden.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {uploads.map(upload => (
            <Card key={upload.id}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground truncate">{upload.file_name}</h3>
                      {statusBadge(upload.status)}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <span>{new Date(upload.created_at).toLocaleDateString('de-CH')}</span>
                      {upload.best_match_type && (
                        <>
                          <span>•</span>
                          <span>Bester Match: {upload.best_match_type} ({upload.best_match_score}%)</span>
                        </>
                      )}
                      {upload.matched_keywords.length > 0 && (
                        <>
                          <span>•</span>
                          <span>{upload.matched_keywords.length} Keywords erkannt</span>
                        </>
                      )}
                    </div>
                    {upload.detected_text_sample && (
                      <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 line-clamp-2 font-mono">
                        {upload.detected_text_sample}
                      </p>
                    )}
                  </div>
                  {upload.status === 'unresolved' && (
                    <div className="flex items-center gap-2 shrink-0">
                      <Button size="sm" variant="outline" onClick={() => updateStatus(upload.id, 'resolved')}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Gelöst
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateStatus(upload.id, 'ignored')}>
                        <XCircle className="h-4 w-4 mr-1" />
                        Ignorieren
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
