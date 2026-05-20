import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { validateStoragePath } from '@/utils/fileValidation';
import { Button } from '@/components/ui/button';
import heroImage from '@/assets/admin-signed-hero.jpg';

import {
  FileText,
  ExternalLink,
  CheckCircle2,
  Send,
  Eye,
  RefreshCw,
  Sparkles,
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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 min-h-screen">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_8px_30px_-12px_rgba(15,27,61,0.12)]">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground bg-muted px-2.5 py-1 rounded-full border border-border mb-4">
                <Sparkles className="h-3 w-3" strokeWidth={2} />
                Übermittlung
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Zur Übermittlung
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
                Unterschriebene Steuererklärungen zur Übermittlung an das Steueramt.
              </p>
            </div>

            {/* Stats inline */}
            <div className="grid grid-cols-4 gap-4">
              {[
                { label: 'Gesamt', value: stats.total },
                { label: 'Bereit', value: stats.ready },
                { label: 'Übermittelt', value: stats.submitted },
                { label: 'Abgeschlossen', value: stats.completed },
              ].map(s => (
                <div key={s.label}>
                  <div className="text-2xl font-semibold tracking-tight text-foreground tabular-nums">{s.value}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="relative h-44 md:h-auto">
            <img
              src={heroImage}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-card via-card/40 to-transparent md:bg-gradient-to-r md:from-card md:via-card/20 md:to-transparent" />
          </div>
        </div>
      </div>

      {/* Filter + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 sm:p-1.5 rounded-full bg-foreground/[0.045]">
          {[
            { key: 'all' as const, label: 'Alle' },
            { key: 'ready' as const, label: 'Bereit' },
            { key: 'submitted' as const, label: 'Übermittelt' },
            { key: 'completed' as const, label: 'Abgeschlossen' },
          ].map(f => {
            const active = filterStatus === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={cn(
                  'shrink-0 px-4 sm:px-5 h-9 sm:h-10 rounded-full text-xs sm:text-sm transition-all duration-200 active:scale-[0.97]',
                  active
                    ? 'bg-white text-foreground font-semibold shadow-[0_1px_2px_rgba(15,27,61,0.06),0_4px_10px_-3px_rgba(15,27,61,0.1)]'
                    : 'text-muted-foreground/65 font-medium hover:text-foreground/85'
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <button
          onClick={fetchSignedReturns}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 h-9 rounded-full border border-border bg-card hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
          Aktualisieren
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-card border border-border rounded-2xl flex justify-center py-20">
          <p className="text-sm text-muted-foreground">Laden…</p>
        </div>
      ) : filteredReturns.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
            <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">Keine Ergebnisse</p>
          <p className="text-xs text-muted-foreground">Keine unterschriebenen Steuererklärungen gefunden.</p>
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-3 px-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Benutzer</th>
                  <th className="text-left py-3 px-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Nr.</th>
                  <th className="text-left py-3 px-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Jahr</th>
                  <th className="text-left py-3 px-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Unterschrieben</th>
                  <th className="text-left py-3 px-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {filteredReturns.map((item) => (
                  <tr key={item.id} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-4 px-5">
                      <div className="text-sm font-medium text-foreground">
                        {item.signer_name || `${item.user_first_name || ''} ${item.user_last_name || ''}`.trim() || 'Unbekannt'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {item.signer_email || item.user_email}
                      </div>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {item.adressnummer || '–'}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-sm font-medium text-foreground tabular-nums">{item.tax_year}</span>
                    </td>
                    <td className="py-4 px-5">
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {format(new Date(item.signed_at), 'dd.MM.yyyy', { locale: de })}
                      </span>
                    </td>
                    <td className="py-4 px-5">
                      <span className={cn(
                        'inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full border',
                        item.tax_return_status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : item.tax_return_status === 'submitted'
                          ? 'bg-blue-50 text-blue-700 border-blue-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      )}>
                        {getStatusLabel(item.tax_return_status)}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {item.signed_pdf_path && (
                          <button
                            onClick={() => openPdf(item.signed_pdf_path)}
                            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="PDF anzeigen"
                          >
                            <Eye className="h-3.5 w-3.5" strokeWidth={1.8} />
                          </button>
                        )}

                        <Link
                          to={`/admin/user/${item.user_id}`}
                          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                          title="Benutzer anzeigen"
                        >
                          <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.8} />
                        </Link>

                        {(!item.tax_return_status || item.tax_return_status === 'available') && (
                          <Button
                            onClick={() => markAsSubmitted(item.id, item.completed_tax_return_id)}
                            disabled={updatingId === item.id}
                            size="sm"
                            className="h-8 px-3 text-xs"
                          >
                            <Send className="h-3 w-3 mr-1.5" strokeWidth={2} />
                            Übermittelt
                          </Button>
                        )}

                        {item.tax_return_status === 'submitted' && (
                          <Button
                            onClick={() => markAsCompleted(item.id, item.completed_tax_return_id)}
                            disabled={updatingId === item.id}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs"
                          >
                            <CheckCircle2 className="h-3 w-3 mr-1.5" strokeWidth={2} />
                            Abschliessen
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SignedTaxReturns;
