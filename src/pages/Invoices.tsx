import React, { useEffect, useState } from 'react';
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Receipt, ExternalLink, CreditCard, Download } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface InvoiceItem {
  id: string;
  amount: number | null;
  currency: string | null;
  created: number;
  status: string;
  paymentMethod: string | null;
  receiptUrl: string | null;
  invoicePdf: string | null;
  metadata: Record<string, string> | null;
}

const Invoices: React.FC = () => {
  const navigate = useNavigate();
  const { isValid, isLoading: authLoading } = useAuth();
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isValid) return;

    const fetchInvoices = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke('get-invoices');
        if (fnError) throw fnError;
        setInvoices(data?.invoices || []);
      } catch (err: any) {
        console.error('Error fetching invoices:', err);
        setError('Rechnungen konnten nicht geladen werden.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvoices();
  }, [authLoading, isValid]);

  const formatAmount = (amount: number | null, currency: string | null) => {
    if (amount == null) return '–';
    const value = (amount / 100).toFixed(2);
    const cur = (currency || 'chf').toUpperCase();
    return `${cur} ${value}`;
  };

  const getPaymentMethodLabel = (method: string | null) => {
    if (!method) return 'Unbekannt';
    const labels: Record<string, string> = {
      card: 'Kreditkarte',
      twint: 'TWINT',
      klarna: 'Klarna',
      link: 'Link',
    };
    return labels[method] || method;
  };

  const getTaxYear = (metadata: Record<string, string> | null) => {
    return metadata?.taxYear || metadata?.tax_year || null;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <SubpageHeader
        title="Rechnungen"
        onBack={() => navigate(-1)}
      />

      <main className="flex-grow pt-4 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto space-y-4">

          {loading && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          {!loading && !error && invoices.length === 0 && (
            <div className="text-center py-20 space-y-3">
              <Receipt className="w-10 h-10 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground text-sm">Noch keine Rechnungen vorhanden.</p>
            </div>
          )}

          {invoices.map((inv) => {
            const taxYear = getTaxYear(inv.metadata);
            return (
              <div
                key={inv.id}
                className="bg-card rounded-2xl border border-border p-4 sm:p-5 space-y-3"
              >
                {/* Top row: date + amount */}
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {format(new Date(inv.created * 1000), 'dd. MMMM yyyy', { locale: de })}
                    </p>
                    {taxYear && (
                      <p className="text-xs text-muted-foreground">Steuerjahr {taxYear}</p>
                    )}
                  </div>
                  <span className="text-base font-semibold text-foreground tabular-nums whitespace-nowrap">
                    {formatAmount(inv.amount, inv.currency)}
                  </span>
                </div>

                {/* Details row */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{getPaymentMethodLabel(inv.paymentMethod)}</span>
                  </div>

                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Bezahlt
                  </span>
                </div>

                {/* Actions */}
                {inv.receiptUrl && (
                  <a
                    href={inv.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors pt-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Beleg anzeigen
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Invoices;
