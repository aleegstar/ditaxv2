import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, Check, FileText, Inbox } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { getAvailableTaxYears } from '@/config/availableTaxYears';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PendingDoc {
  id: string;
  file_name: string;
  file_type: string;
  upload_date: string;
}

interface TaxFilerRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
}

/**
 * Review screen for documents collected via the offline-upload inbox.
 * Per pending doc the user picks a tax filer + year (and optionally a
 * checklist item later in /documents), or deletes the doc entirely.
 *
 * Assignment flips `pending_assignment=false` and writes the new
 * `tax_filer_id` / `tax_year`. The document then appears in the normal
 * `/documents` listing.
 */
const DocumentsReview: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useAuth();
  const [docs, setDocs] = useState<PendingDoc[]>([]);
  const [filers, setFilers] = useState<TaxFilerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Record<string, { filerId?: string; year?: string }>>({});

  const availableYears = useMemo(() => getAvailableTaxYears(), []);

  const load = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Run sequentially so one failure does not blank the other list.
      const { data: pending, error: pendingErr } = await supabase
        .from('uploaded_documents')
        .select('id, file_name, file_type, upload_date')
        .eq('user_id', userId)
        .eq('pending_assignment', true)
        .order('upload_date', { ascending: false });
      if (pendingErr) {
        console.error('[DocumentsReview] pending query failed', pendingErr);
        toast.error(`Pending: ${pendingErr.message}`);
      }
      setDocs((pending as PendingDoc[]) ?? []);

      const { data: filerRows, error: filerErr } = await supabase
        .from('tax_filers')
        .select('id, first_name, last_name')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });
      if (filerErr) {
        console.error('[DocumentsReview] filers query failed', filerErr);
        toast.error(`Personen: ${filerErr.message}`);
      }
      setFilers((filerRows as TaxFilerRow[]) ?? []);

      console.info('[DocumentsReview] loaded', {
        userId,
        docs: pending?.length ?? 0,
        filers: filerRows?.length ?? 0,
      });
    } catch (err) {
      console.error('[DocumentsReview] load failed', err);
      toast.error('Fehler beim Laden der unzugeordneten Dokumente');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    if (typeof window === 'undefined') return;
    const onOnline = () => void load();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    const unsub = OfflineQueueService.subscribe(() => void load());
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const assign = async (docId: string) => {
    const sel = selection[docId];
    if (!sel?.filerId || !sel?.year) {
      toast.error('Bitte Person und Jahr auswählen');
      return;
    }
    setBusyId(docId);
    try {
      const { error } = await supabase
        .from('uploaded_documents')
        .update({
          tax_filer_id: sel.filerId,
          tax_year: sel.year,
          pending_assignment: false,
        })
        .eq('id', docId)
        .eq('user_id', userId!);
      if (error) throw error;
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Dokument zugeordnet');
    } catch (err) {
      console.error('[DocumentsReview] assign failed', err);
      toast.error('Zuordnung fehlgeschlagen');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (docId: string) => {
    setBusyId(docId);
    try {
      // Delete storage object first; ignore if missing.
      const { data: row } = await supabase
        .from('uploaded_documents')
        .select('file_path')
        .eq('id', docId)
        .eq('user_id', userId!)
        .maybeSingle();
      if (row?.file_path) {
        await supabase.storage.from('documents').remove([row.file_path]);
      }
      const { error } = await supabase
        .from('uploaded_documents')
        .delete()
        .eq('id', docId)
        .eq('user_id', userId!);
      if (error) throw error;
      setDocs((prev) => prev.filter((d) => d.id !== docId));
      toast.success('Dokument gelöscht');
    } catch (err) {
      console.error('[DocumentsReview] delete failed', err);
      toast.error('Löschen fehlgeschlagen');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <SubpageHeader title="Offline-Uploads zuordnen" onBack={() => navigate('/documents')} />
      </motion.div>

      <div className="flex-1 max-w-2xl w-full mx-auto px-4 md:px-6 py-6 space-y-4 pb-24">
        {loading ? (
          <div className="text-center text-muted-foreground py-12 text-sm">Lade…</div>
        ) : docs.length === 0 ? (
          <div className="flex flex-col items-center text-center py-16 gap-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <Inbox className="h-6 w-6 text-muted-foreground" strokeWidth={1.75} />
            </div>
            <p className="text-[15px] font-medium text-foreground">Alles zugeordnet</p>
            <p className="text-[13px] text-muted-foreground max-w-xs">
              Es gibt aktuell keine Dokumente, die auf eine Zuordnung warten.
            </p>
            <Button className="mt-2 rounded-2xl" onClick={() => navigate('/documents')}>
              Zu meinen Dokumenten
            </Button>
          </div>
        ) : (
          <>
            <p className="text-[13px] text-muted-foreground">
              Diese Dokumente wurden offline hochgeladen. Wähle pro Eintrag
              Person und Jahr – oder lösche sie.
            </p>
            <ul className="space-y-3">
              {docs.map((d) => {
                const sel = selection[d.id] ?? {};
                return (
                  <li
                    key={d.id}
                    className="rounded-2xl bg-card border border-border p-4 space-y-3"
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-foreground truncate">
                          {d.file_name}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {new Date(d.upload_date).toLocaleString('de-CH')}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <Select
                        value={sel.filerId ?? ''}
                        onValueChange={(v) =>
                          setSelection((p) => ({ ...p, [d.id]: { ...p[d.id], filerId: v } }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Person" />
                        </SelectTrigger>
                        <SelectContent>
                          {filers.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {[f.first_name, f.last_name].filter(Boolean).join(' ') || 'Person'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={sel.year ?? ''}
                        onValueChange={(v) =>
                          setSelection((p) => ({ ...p, [d.id]: { ...p[d.id], year: v } }))
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue placeholder="Jahr" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableYears.map((y) => (
                            <SelectItem key={y} value={String(y)}>
                              {y}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        className="flex-1 h-11 rounded-xl"
                        disabled={busyId === d.id}
                        onClick={() => assign(d.id)}
                      >
                        <Check className="h-4 w-4 mr-1.5" />
                        Zuordnen
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-xl text-destructive hover:text-destructive"
                        disabled={busyId === d.id}
                        onClick={() => remove(d.id)}
                        aria-label="Dokument löschen"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
};

export default DocumentsReview;
