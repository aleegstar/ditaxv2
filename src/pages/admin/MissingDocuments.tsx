import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  RefreshCw,
  Plus,
  CheckCircle2,
  Eye,
  User,
  Calendar
} from 'lucide-react';
import { cn } from '@/lib/utils';
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
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Fehlende Unterlagen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Steuererklärungen mit ausstehenden Dokumenten oder Angaben
          </p>
        </div>
        <button
          onClick={handleRefresh}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Aktualisieren
        </button>
      </div>

      {/* Stats row */}
      <div className="flex gap-6">
        {stats.map(s => (
          <div key={s.label}>
            <div className="text-xl font-semibold tracking-tight text-foreground">{s.value}</div>
            <div className="text-[11px] text-muted-foreground">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          {[
            { key: 'pending' as const, label: 'Offen', count: pendingItems.length },
            { key: 'submitted' as const, label: 'Eingereicht', count: submittedItems.length },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                activeTab === t.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {t.label}
              {t.count > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === 'pending' && (
          <div className="flex gap-1">
            {[
              { key: 'all' as const, label: 'Alle' },
              { key: 'missing_documents' as const, label: 'Unterlagen' },
              { key: 'missing_information' as const, label: 'Angaben' },
            ].map(f => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={cn(
                  "px-2.5 py-1 rounded-md text-xs transition-all",
                  filter === f.key
                    ? "bg-foreground/[0.06] text-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Pending Tab */}
      {activeTab === 'pending' && (
        <>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                 <div key={i} className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-5 shadow-sm">
                  <Skeleton className="h-4 w-32 mb-3" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Alles erledigt</p>
              <p className="text-xs text-muted-foreground">Keine offenen Anfragen vorhanden.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {pendingItems.map(item => (
                <div
                  key={item.id}
                  className="border border-border/60 rounded-xl p-5 bg-card hover:border-border hover:shadow-sm transition-all duration-150"
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
                      "text-[10px] font-medium px-2 py-0.5 rounded-full",
                      item.status === 'missing_information'
                        ? "bg-foreground/[0.08] text-foreground"
                        : "bg-muted text-muted-foreground"
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
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-border/60 rounded-xl p-5">
                  <Skeleton className="h-4 w-32 mb-3" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          ) : submittedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">Keine Einreichungen</p>
              <p className="text-xs text-muted-foreground">Keine eingereichten Unterlagen zur Prüfung.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {submittedItems.map(item => (
                <div
                  key={item.tax_return_id}
                  className="border border-border/60 rounded-xl p-5 bg-card hover:border-border hover:shadow-sm transition-all duration-150"
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
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
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
                    className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
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
