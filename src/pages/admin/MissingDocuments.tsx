import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';

import { 
  FileText, 
  RefreshCw,
  Plus,
  CheckCircle2,
  Eye,
  User,
  Calendar,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import heroImage from '@/assets/admin-missing-hero.jpg';
import { CreateMissingItemRequestDialog } from '@/components/admin/CreateMissingItemRequestDialog';
import { ReviewSubmittedItemsDialog } from '@/components/admin/ReviewSubmittedItemsDialog';
import { useSubmittedMissingItems, type MissingItemRequest } from '@/hooks/useMissingItemRequests';

interface MissingTaxReturn {
  id: string;
  user_id: string;
  tax_year: string;
  status: string;
  updated_at: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
  user_avatar_url: string | null;
  adressnummer: string | null;
}

type FilterStatus = 'all' | 'missing_documents' | 'missing_information' | 'documents_submitted';

const MissingDocuments = () => {
  const [items, setItems] = useState<MissingTaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const [activeTab, setActiveTab] = useState<'pending' | 'submitted'>('pending');
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MissingTaxReturn | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewingItem, setReviewingItem] = useState<{
    taxReturnId: string;
    userId: string;
    userName: string;
    taxYear: string;
    requests: MissingItemRequest[];
  } | null>(null);

  const { submittedItems, loading: submittedLoading, refetch: refetchSubmitted } = useSubmittedMissingItems();

  const fetchMissingItems = async () => {
    setLoading(true);
    try {
      const { data: taxReturns, error: taxError } = await supabase
        .from('tax_returns')
        .select('id, user_id, tax_year, status, updated_at')
        .in('status', ['missing_documents', 'missing_information', 'documents_submitted'])
        .order('updated_at', { ascending: false });

      if (taxError) throw taxError;

      if (!taxReturns || taxReturns.length === 0) {
        setItems([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(taxReturns.map(tr => tr.user_id))];

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) console.error('Error fetching profiles:', profilesError);

      const { data: formDataRecords, error: formDataError } = await supabase
        .from('form_data')
        .select('user_id, data, tax_year')
        .in('user_id', userIds)
        .eq('form_type', 'tax_form');

      if (formDataError) console.error('Error fetching form data:', formDataError);

      const combined: MissingTaxReturn[] = taxReturns.map(tr => {
        const profile = profiles?.find(p => p.id === tr.user_id);
        const formData = formDataRecords?.find(
          fd => fd.user_id === tr.user_id && fd.tax_year === tr.tax_year
        );
        const data = formData?.data as Record<string, unknown> | undefined;
        const adressnummer = (data?.adressnummer as string) || null;

        return {
          id: tr.id,
          user_id: tr.user_id,
          tax_year: tr.tax_year,
          status: tr.status || 'missing_documents',
          updated_at: tr.updated_at,
          user_first_name: profile?.first_name || null,
          user_last_name: profile?.last_name || null,
          user_email: profile?.email || null,
          user_avatar_url: profile?.avatar_url || null,
          adressnummer,
        };
      });

      setItems(combined);
    } catch (error) {
      console.error('Error fetching missing items:', error);
      toast.error('Fehler beim Laden der Daten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissingItems();
  }, []);

  const handleRefresh = () => {
    fetchMissingItems();
    refetchSubmitted();
  };

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const pendingItems = filteredItems.filter(item => 
    item.status === 'missing_documents' || item.status === 'missing_information'
  );

  const missingDocumentsCount = items.filter(i => i.status === 'missing_documents').length;
  const missingInfoCount = items.filter(i => i.status === 'missing_information').length;

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'missing_documents': return 'Unterlagen fehlen';
      case 'missing_information': return 'Angaben fehlen';
      case 'documents_submitted': return 'Eingereicht';
      default: return status;
    }
  };

  const getUserName = (item: MissingTaxReturn) =>
    item.user_first_name || item.user_last_name
      ? `${item.user_first_name || ''} ${item.user_last_name || ''}`.trim()
      : 'Unbekannt';

  const handleOpenCreateDialog = (item: MissingTaxReturn) => {
    setSelectedItem(item);
    setCreateDialogOpen(true);
  };

  const handleOpenReviewDialog = (item: typeof submittedItems[0]) => {
    setReviewingItem({
      taxReturnId: item.tax_return_id,
      userId: item.user_id,
      userName: item.user_name,
      taxYear: item.tax_year,
      requests: item.requests,
    });
    setReviewDialogOpen(true);
  };

  const stats = [
    { label: 'Gesamt', value: items.length },
    { label: 'Unterlagen', value: missingDocumentsCount },
    { label: 'Angaben', value: missingInfoCount },
    { label: 'Eingereicht', value: submittedItems.length },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6 min-h-screen">
      {/* Hero Card */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-[0_8px_30px_-12px_rgba(15,27,61,0.12)]">
        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr]">
          <div className="p-6 sm:p-8 flex flex-col justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-1.5 text-[11px] font-medium text-foreground bg-muted px-2.5 py-1 rounded-full border border-border mb-4">
                <AlertTriangle className="h-3 w-3" strokeWidth={2} />
                Anfragen
              </div>
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
                Fehlende Unterlagen
              </h1>
              <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
                Steuererklärungen mit ausstehenden Dokumenten oder Angaben.
              </p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {stats.map(s => (
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

      {/* Tabs + Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center gap-1 p-1 sm:p-1.5 rounded-full bg-foreground/[0.045]">
          {[
            { key: 'pending' as const, label: 'Offen', count: pendingItems.length },
            { key: 'submitted' as const, label: 'Eingereicht', count: submittedItems.length },
          ].map(t => {
            const active = activeTab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setActiveTab(t.key)}
                className={cn(
                  'shrink-0 px-4 sm:px-5 h-9 sm:h-10 rounded-full text-xs sm:text-sm transition-all duration-200 active:scale-[0.97]',
                  active
                    ? 'bg-white text-foreground font-semibold shadow-[0_1px_2px_rgba(15,27,61,0.06),0_4px_10px_-3px_rgba(15,27,61,0.1)]'
                    : 'text-muted-foreground/65 font-medium hover:text-foreground/85'
                )}
              >
                {t.label}
                {t.count > 0 && <span className="ml-1.5 text-[10px] opacity-70">{t.count}</span>}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 h-9 rounded-full border border-border bg-card hover:bg-muted"
        >
          <RefreshCw className="h-3.5 w-3.5" strokeWidth={1.8} />
          Aktualisieren
        </button>
      </div>

      {/* Sub-filter for pending */}
      {activeTab === 'pending' && (
        <div className="flex flex-wrap gap-1.5">
          {[
            { key: 'all' as const, label: 'Alle' },
            { key: 'missing_documents' as const, label: 'Unterlagen' },
            { key: 'missing_information' as const, label: 'Angaben' },
          ].map(f => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'px-3 h-8 rounded-full text-xs transition-all',
                  active
                    ? 'bg-foreground text-background font-medium'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <>
          {loading ? (
            <div className="bg-card border border-border rounded-2xl flex justify-center py-20">
              <p className="text-sm text-muted-foreground">Laden…</p>
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" strokeWidth={1.8} />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Alles erledigt</p>
              <p className="text-xs text-muted-foreground">Keine offenen Anfragen vorhanden.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  className="bg-card border border-border rounded-2xl p-5 hover:shadow-[0_4px_16px_-4px_rgba(15,27,61,0.08)] transition-all duration-150"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground tracking-tight">
                        {item.tax_year}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.adressnummer ? `Nr. ${item.adressnummer}` : '–'}
                      </p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-medium px-2 py-1 rounded-full",
                      item.status === 'missing_information'
                        ? "bg-amber-50 text-amber-700"
                        : "bg-blue-50 text-blue-700"
                    )}>
                      {getStatusLabel(item.status)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <Link
                        to={`/admin/user/${item.user_id}?year=${item.tax_year}`}
                        className="text-foreground font-medium hover:underline"
                      >
                        {getUserName(item)}
                      </Link>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <span className="truncate">{item.user_email || 'Keine E-Mail'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <span>{format(new Date(item.updated_at), 'dd.MM.yyyy', { locale: de })}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenCreateDialog(item)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:opacity-80 transition-opacity px-3 h-8 rounded-full bg-muted"
                  >
                    <Plus className="h-3 w-3" />
                    Anfrage erstellen
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Submitted Tab */}
      {activeTab === 'submitted' && (
        <>
          {submittedLoading ? (
            <div className="bg-card border border-border rounded-2xl flex justify-center py-20">
              <p className="text-sm text-muted-foreground">Laden…</p>
            </div>
          ) : submittedItems.length === 0 ? (
            <div className="bg-card border border-border rounded-2xl flex flex-col items-center justify-center py-20 text-center">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">Keine Einreichungen</p>
              <p className="text-xs text-muted-foreground">Keine eingereichten Unterlagen zur Prüfung.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {submittedItems.map(item => (
                <div
                  key={item.tax_return_id}
                  className="bg-card border border-border rounded-2xl p-5 hover:shadow-[0_4px_16px_-4px_rgba(15,27,61,0.08)] transition-all duration-150"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground tracking-tight">
                        {item.tax_year}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.requests.length} Einreichung{item.requests.length !== 1 ? 'en' : ''}
                      </p>
                    </div>
                    <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                      Eingereicht
                    </span>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <User className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <span className="text-foreground font-medium">{item.user_name || 'Unbekannt'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <span className="truncate">{item.user_email || 'Keine E-Mail'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                      <span>{format(new Date(item.submitted_at), 'dd.MM.yyyy', { locale: de })}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenReviewDialog(item)}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground hover:opacity-80 transition-opacity px-3 h-8 rounded-full bg-muted"
                  >
                    <Eye className="h-3 w-3" />
                    Prüfen
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Dialogs */}
      {selectedItem && (
        <CreateMissingItemRequestDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          userId={selectedItem.user_id}
          taxReturnId={selectedItem.id}
          userName={getUserName(selectedItem)}
          taxYear={selectedItem.tax_year}
          onSuccess={handleRefresh}
        />
      )}

      {reviewingItem && (
        <ReviewSubmittedItemsDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          taxReturnId={reviewingItem.taxReturnId}
          userId={reviewingItem.userId}
          userName={reviewingItem.userName}
          taxYear={reviewingItem.taxYear}
          requests={reviewingItem.requests}
          onSuccess={() => {
            handleRefresh();
            setReviewDialogOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default MissingDocuments;
