import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { validateStoragePath } from '@/utils/fileValidation';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  Send,
  Eye,
  RefreshCw,
  User,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface SignedTaxReturn {
  id: string;
  tax_year: string;
  signed_at: string;
  signer_name: string;
  signer_email: string;
  signature_status: string;
  user_id: string;
  completed_tax_return_id: string;
  tax_return_status: string | null;
  signed_pdf_path: string | null;
  user_email: string | null;
  user_first_name: string | null;
  user_last_name: string | null;
  user_avatar_url: string | null;
  adressnummer: string | null;
}

type FilterStatus = 'all' | 'ready' | 'submitted' | 'completed';

const SignedTaxReturns: React.FC = () => {
  const [signedReturns, setSignedReturns] = useState<SignedTaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSignedReturns();
  }, []);

  const fetchSignedReturns = async () => {
    setLoading(true);
    try {
      const { data: signatures, error: sigError } = await supabase
        .from('tax_return_signatures')
        .select(`
          id,
          tax_year,
          signed_at,
          signer_name,
          signer_email,
          status,
          user_id,
          completed_tax_return_id
        `)
        .eq('status', 'signed')
        .order('signed_at', { ascending: false });

      if (sigError) throw sigError;

      if (!signatures || signatures.length === 0) {
        setSignedReturns([]);
        setLoading(false);
        return;
      }

      const completedReturnIds = [...new Set(signatures.map(s => s.completed_tax_return_id))];
      
      const { data: completedReturns, error: ctrError } = await supabase
        .from('completed_tax_returns')
        .select('id, status, signed_pdf_path')
        .in('id', completedReturnIds);

      if (ctrError) console.error('Error fetching completed returns:', ctrError);

      const userIds = [...new Set(signatures.map(s => s.user_id))];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .in('id', userIds);

      if (profilesError) console.error('Error fetching profiles:', profilesError);

      const { data: formDataRecords, error: formDataError } = await supabase
        .from('form_data')
        .select('user_id, data, tax_year')
        .in('user_id', userIds)
        .eq('form_type', 'tax_form');

      if (formDataError) console.error('Error fetching form data:', formDataError);

      const combined: SignedTaxReturn[] = signatures.map(sig => {
        const ctr = completedReturns?.find(c => c.id === sig.completed_tax_return_id);
        const profile = profiles?.find(p => p.id === sig.user_id);
        const formData = formDataRecords?.find(
          fd => fd.user_id === sig.user_id && fd.tax_year === sig.tax_year
        );
        const data = formData?.data as Record<string, unknown> | undefined;
        const adressnummer = (data?.adressnummer as string) || null;

        return {
          id: sig.id,
          tax_year: sig.tax_year,
          signed_at: sig.signed_at,
          signer_name: sig.signer_name,
          signer_email: sig.signer_email,
          signature_status: sig.status,
          user_id: sig.user_id,
          completed_tax_return_id: sig.completed_tax_return_id,
          tax_return_status: ctr?.status || null,
          signed_pdf_path: ctr?.signed_pdf_path || null,
          user_email: profile?.email || null,
          user_first_name: profile?.first_name || null,
          user_last_name: profile?.last_name || null,
          user_avatar_url: profile?.avatar_url || null,
          adressnummer,
        };
      });

      setSignedReturns(combined);
    } catch (error) {
      console.error('Error loading signed returns:', error);
      toast({
        title: 'Fehler',
        description: 'Unterschriebene Steuererklärungen konnten nicht geladen werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const markAsSubmitted = async (signatureId: string, completedTaxReturnId: string) => {
    setUpdatingId(signatureId);
    try {
      const { error } = await supabase
        .from('completed_tax_returns')
        .update({ status: 'submitted' })
        .eq('id', completedTaxReturnId);

      if (error) throw error;

      toast({ title: 'Erfolgreich', description: 'Als übermittelt markiert.' });
      await fetchSignedReturns();
    } catch (error) {
      console.error('Error marking as submitted:', error);
      toast({ title: 'Fehler', description: 'Status konnte nicht aktualisiert werden.', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const markAsCompleted = async (signatureId: string, completedTaxReturnId: string) => {
    setUpdatingId(signatureId);
    try {
      const { error } = await supabase
        .from('completed_tax_returns')
        .update({ status: 'completed' })
        .eq('id', completedTaxReturnId);

      if (error) throw error;

      toast({ title: 'Erfolgreich', description: 'Als abgeschlossen markiert.' });
      await fetchSignedReturns();
    } catch (error) {
      console.error('Error marking as completed:', error);
      toast({ title: 'Fehler', description: 'Status konnte nicht aktualisiert werden.', variant: 'destructive' });
    } finally {
      setUpdatingId(null);
    }
  };

  const openPdf = async (signedPdfPath: string | null) => {
    if (!signedPdfPath) {
      toast({ title: 'Fehler', description: 'Kein unterschriebenes PDF vorhanden.', variant: 'destructive' });
      return;
    }
    if (!validateStoragePath(signedPdfPath)) {
      toast({ title: 'Fehler', description: 'Ungültiger Dateipfad.', variant: 'destructive' });
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('completed-tax-returns')
        .createSignedUrl(signedPdfPath, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error('Error opening PDF:', error);
      toast({ title: 'Fehler', description: 'PDF konnte nicht geöffnet werden.', variant: 'destructive' });
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case 'submitted': return 'Übermittelt';
      case 'completed': return 'Abgeschlossen';
      default: return 'Bereit';
    }
  };

  const filteredReturns = signedReturns.filter(item => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'ready') return !item.tax_return_status || item.tax_return_status === 'available';
    if (filterStatus === 'submitted') return item.tax_return_status === 'submitted';
    if (filterStatus === 'completed') return item.tax_return_status === 'completed';
    return true;
  });

  const stats = {
    total: signedReturns.length,
    ready: signedReturns.filter(r => !r.tax_return_status || r.tax_return_status === 'available').length,
    submitted: signedReturns.filter(r => r.tax_return_status === 'submitted').length,
    completed: signedReturns.filter(r => r.tax_return_status === 'completed').length,
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Zur Übermittlung
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Unterschriebene Steuererklärungen zur Übermittlung an das Steueramt
          </p>
        </div>
        <button
          onClick={fetchSignedReturns}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Aktualisieren
        </button>
      </div>

      {/* Stats */}
      <div className="flex gap-6">
        {[
          { label: 'Gesamt', value: stats.total },
          { label: 'Bereit', value: stats.ready },
          { label: 'Übermittelt', value: stats.submitted },
          { label: 'Abgeschlossen', value: stats.completed },
        ].map(s => (
          <div key={s.label}>
            <div className="text-xl font-semibold tracking-tight text-foreground">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5 w-fit">
        {[
          { key: 'all' as const, label: 'Alle' },
          { key: 'ready' as const, label: 'Bereit' },
          { key: 'submitted' as const, label: 'Übermittelt' },
          { key: 'completed' as const, label: 'Abgeschlossen' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilterStatus(f.key)}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
              filterStatus === f.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-5 shadow-sm">
              <Skeleton className="h-4 w-40 mb-3" />
              <Skeleton className="h-3 w-56" />
            </div>
          ))}
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Keine Ergebnisse</p>
          <p className="text-xs text-muted-foreground">Keine unterschriebenen Steuererklärungen gefunden.</p>
        </div>
      ) : (
        <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/30">
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Benutzer</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Nr.</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Jahr</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Unterschrieben</th>
                <th className="text-left py-3 px-5 text-xs font-medium text-muted-foreground">Status</th>
                <th className="text-right py-3 px-5 text-xs font-medium text-muted-foreground">Aktionen</th>
              </tr>
            </thead>
            <tbody>
              {filteredReturns.map((item) => (
                <tr key={item.id} className="border-b border-white/20 last:border-0 hover:bg-white/40 transition-colors">
                  <td className="py-3 px-5">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {item.signer_name || `${item.user_first_name || ''} ${item.user_last_name || ''}`.trim() || 'Unbekannt'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.signer_email || item.user_email}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-5">
                    <span className="text-xs text-muted-foreground">
                      {item.adressnummer || '–'}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <span className="text-xs font-medium text-foreground">{item.tax_year}</span>
                  </td>
                  <td className="py-3 px-5">
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(item.signed_at), 'dd.MM.yyyy', { locale: de })}
                    </span>
                  </td>
                  <td className="py-3 px-5">
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      item.tax_return_status === 'completed'
                        ? "bg-foreground/[0.06] text-foreground"
                        : item.tax_return_status === 'submitted'
                        ? "bg-foreground/[0.06] text-foreground"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {getStatusLabel(item.tax_return_status)}
                    </span>
                  </td>
                  <td className="py-3 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.signed_pdf_path && (
                        <button
                          onClick={() => openPdf(item.signed_pdf_path)}
                          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                          title="PDF anzeigen"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                      
                      <Link
                        to={`/admin/user/${item.user_id}`}
                        className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        title="Benutzer anzeigen"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      {(!item.tax_return_status || item.tax_return_status === 'available') && (
                        <button
                          onClick={() => markAsSubmitted(item.id, item.completed_tax_return_id)}
                          disabled={updatingId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-foreground text-background hover:opacity-90 disabled:opacity-50 transition-all"
                        >
                          <Send className="h-3 w-3" />
                          Übermittelt
                        </button>
                      )}

                      {item.tax_return_status === 'submitted' && (
                        <button
                          onClick={() => markAsCompleted(item.id, item.completed_tax_return_id)}
                          disabled={updatingId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border border-border text-foreground hover:bg-muted/50 disabled:opacity-50 transition-all"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          Abschliessen
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SignedTaxReturns;
