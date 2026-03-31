import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { FileQuestion, CheckCircle, XCircle, RefreshCw } from 'lucide-react';

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

const filterOptions = [
  { value: 'unresolved', label: 'Offen' },
  { value: 'resolved', label: 'Gelöst' },
  { value: 'ignored', label: 'Ignoriert' },
  { value: 'all', label: 'Alle' },
];

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

  const statusLabel = (status: string) => {
    switch (status) {
      case 'unresolved': return (
        <span className="text-[10px] font-medium text-foreground bg-foreground/[0.07] px-1.5 py-0.5 rounded">Offen</span>
      );
      case 'resolved': return (
        <span className="text-[10px] font-medium text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">Gelöst</span>
      );
      case 'ignored': return (
        <span className="text-[10px] font-medium text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">Ignoriert</span>
      );
      default: return (
        <span className="text-[10px] font-medium text-muted-foreground bg-muted/40 px-1.5 py-0.5 rounded">{status}</span>
      );
    }
  };

  const stats = {
    total: uploads.length,
    open: uploads.filter(u => u.status === 'unresolved').length,
    resolved: uploads.filter(u => u.status === 'resolved').length,
    ignored: uploads.filter(u => u.status === 'ignored').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-semibold text-foreground tracking-tight">Nicht erkannte Uploads</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Dokumente die von der OCR-Erkennung nicht zugeordnet werden konnten</p>
        </div>
        <button
          onClick={fetchUploads}
          className="h-8 w-8 flex items-center justify-center rounded-lg border border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Gesamt', value: stats.total },
          { label: 'Offen', value: stats.open },
          { label: 'Gelöst', value: stats.resolved },
          { label: 'Ignoriert', value: stats.ignored },
        ].map((stat) => (
          <div key={stat.label} className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl px-4 py-3 shadow-sm">
            <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            <p className="text-[22px] font-semibold text-foreground tracking-tight mt-0.5">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex items-center gap-1 bg-muted/40 rounded-lg p-0.5 w-fit">
        {filterOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setFilter(opt.value)}
            className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-all ${
              filter === opt.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-[13px] text-muted-foreground">Laden...</div>
      ) : uploads.length === 0 ? (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm py-16 text-center">
          <FileQuestion className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
          <p className="text-[13px] text-muted-foreground">Keine Einträge vorhanden.</p>
        </div>
      ) : (
        <div className="border border-border/60 rounded-xl bg-background divide-y divide-border/40">
          {uploads.map((upload) => (
            <div key={upload.id} className="p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[13px] font-medium text-foreground truncate">{upload.file_name}</span>
                    {statusLabel(upload.status)}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground mb-1.5">
                    <span>{new Date(upload.created_at).toLocaleDateString('de-CH')}</span>
                    {upload.best_match_type && (
                      <>
                        <span className="text-border">·</span>
                        <span>Match: {upload.best_match_type} ({upload.best_match_score}%)</span>
                      </>
                    )}
                    {upload.matched_keywords.length > 0 && (
                      <>
                        <span className="text-border">·</span>
                        <span>{upload.matched_keywords.length} Keywords</span>
                      </>
                    )}
                  </div>
                  {upload.detected_text_sample && (
                    <p className="text-[11px] text-muted-foreground bg-muted/30 rounded-md px-2.5 py-1.5 line-clamp-2 font-mono leading-relaxed">
                      {upload.detected_text_sample}
                    </p>
                  )}
                </div>
                {upload.status === 'unresolved' && (
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => updateStatus(upload.id, 'resolved')}
                      className="h-7 px-2.5 flex items-center gap-1 text-[11px] font-medium rounded-md border border-border/60 text-foreground hover:bg-muted/30 transition-colors"
                    >
                      <CheckCircle className="h-3 w-3" />
                      Gelöst
                    </button>
                    <button
                      onClick={() => updateStatus(upload.id, 'ignored')}
                      className="h-7 px-2.5 flex items-center gap-1 text-[11px] font-medium rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/20 transition-colors"
                    >
                      <XCircle className="h-3 w-3" />
                      Ignorieren
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
