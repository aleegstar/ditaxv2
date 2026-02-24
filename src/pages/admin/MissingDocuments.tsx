import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { AdminWelcomeHeader } from '@/components/admin/AdminWelcomeHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertCircle, 
  FileWarning, 
  HelpCircle, 
  ExternalLink,
  RefreshCw,
  Plus,
  CheckCircle2,
  ClipboardCheck,
  Eye
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  
  // Dialog states
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

  // Hook for submitted items
  const { submittedItems, loading: submittedLoading, refetch: refetchSubmitted } = useSubmittedMissingItems();

  const fetchMissingItems = async () => {
    setLoading(true);
    try {
      // Fetch tax returns with missing status (including documents_submitted)
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

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Fetch adressnummer from form_data
      const { data: formDataRecords, error: formDataError } = await supabase
        .from('form_data')
        .select('user_id, data, tax_year')
        .in('user_id', userIds)
        .eq('form_type', 'tax_form');

      if (formDataError) {
        console.error('Error fetching form data:', formDataError);
      }

      // Combine data
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

  // Only show pending items (not documents_submitted) in the pending tab
  const pendingItems = filteredItems.filter(item => 
    item.status === 'missing_documents' || item.status === 'missing_information'
  );

  const missingDocumentsCount = items.filter(i => i.status === 'missing_documents').length;
  const missingInfoCount = items.filter(i => i.status === 'missing_information').length;
  const documentsSubmittedCount = items.filter(i => i.status === 'documents_submitted').length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'missing_documents':
        return (
          <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">
            <FileWarning className="h-3 w-3 mr-1" />
            Fehlende Unterlagen
          </Badge>
        );
      case 'missing_information':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
            <HelpCircle className="h-3 w-3 mr-1" />
            Fehlende Angaben
          </Badge>
        );
      case 'documents_submitted':
        return (
          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
            <ClipboardCheck className="h-3 w-3 mr-1" />
            Eingereicht
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0).toUpperCase() || '';
    const last = lastName?.charAt(0).toUpperCase() || '';
    return first + last || '?';
  };

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

  const missingDocumentsStats = {
    total: items.length,
    missingDocs: missingDocumentsCount,
    missingInfo: missingInfoCount,
    submitted: documentsSubmittedCount,
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <AdminWelcomeHeader
        title="Fehlende Unterlagen"
        subtitle="Übersicht aller Steuererklärungen mit fehlendem Status"
        badge={{
          text: `${missingDocumentsStats.total} offen`,
          variant: missingDocumentsStats.total > 0 ? 'default' : 'secondary'
        }}
        onRefresh={handleRefresh}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight">{missingDocumentsStats.total}</div>
                <div className="text-xs text-muted-foreground">Gesamt offen</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-orange-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <FileWarning className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-orange-700">{missingDocumentsCount}</div>
                <div className="text-xs text-orange-600/80">Fehlende Unterlagen</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-red-50 flex items-center justify-center">
                <HelpCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-red-700">{missingInfoCount}</div>
                <div className="text-xs text-red-600/80">Fehlende Angaben</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-blue-200/60 shadow-[0_4px_20px_rgba(0,0,0,0.04)] rounded-2xl">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <ClipboardCheck className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <div className="text-2xl font-semibold tracking-tight text-blue-700">{submittedItems.length}</div>
                <div className="text-xs text-blue-600/80">Zur Prüfung</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pending' | 'submitted')}>
        <TabsList className="bg-muted/50 rounded-xl p-1 h-auto">
          <TabsTrigger value="pending" className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm data-[state=active]:shadow-sm">
            <AlertCircle className="h-4 w-4" />
            Offene Anfragen
            {pendingItems.length > 0 && (
              <span className="ml-1 bg-orange-100 text-orange-700 text-xs font-medium px-2 py-0.5 rounded-full">{pendingItems.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="submitted" className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm data-[state=active]:shadow-sm">
            <ClipboardCheck className="h-4 w-4" />
            Eingereicht
            {submittedItems.length > 0 && (
              <span className="ml-1 bg-primary text-white text-xs font-medium px-2 py-0.5 rounded-full">{submittedItems.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Pending Tab */}
        <TabsContent value="pending">
          {/* Filter */}
          <div className="flex items-center gap-4 mb-5">
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status filtern" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle anzeigen</SelectItem>
                <SelectItem value="missing_documents">Fehlende Unterlagen</SelectItem>
                <SelectItem value="missing_information">Fehlende Angaben</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Aktualisieren
            </Button>
          </div>

          {/* Cards Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="rounded-2xl border-border/60">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-12 w-full rounded-2xl" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-50 text-green-500" />
              <p>Keine offenen Anfragen vorhanden.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {pendingItems.map((item) => (
                <Card
                  key={item.id}
                  className="rounded-2xl border-border/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-200"
                >
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    {/* Status + Year */}
                    <div className="flex items-center gap-2 w-full justify-between">
                      {getStatusBadge(item.status)}
                      <span className="text-xs text-muted-foreground font-medium">
                        {item.tax_year} · {item.adressnummer || '–'}
                      </span>
                    </div>

                    {/* User Button */}
                    <Link
                      to={`/admin/user/${item.user_id}?year=${item.tax_year}`}
                      className="w-full"
                    >
                      <div className="w-full bg-gradient-to-r from-[rgb(50,120,255)] to-[rgb(20,80,220)] text-white rounded-2xl h-12 flex items-center justify-center font-medium text-sm hover:scale-[1.02] active:scale-95 transition-transform">
                        {item.user_first_name || item.user_last_name
                          ? `${item.user_first_name || ''} ${item.user_last_name || ''}`.trim()
                          : 'Unbekannt'}
                      </div>
                    </Link>

                    {/* Email */}
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {item.user_email || 'Keine E-Mail'}
                    </span>

                    {/* Footer: date + action */}
                    <div className="flex items-center justify-between w-full pt-1 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(item.updated_at), 'dd.MM.yyyy', { locale: de })}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 text-xs rounded-xl"
                        onClick={() => handleOpenCreateDialog(item)}
                      >
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Anfrage
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Submitted Tab */}
        <TabsContent value="submitted">
          {submittedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="rounded-2xl border-border/60">
                  <CardContent className="p-6 space-y-4">
                    <Skeleton className="h-5 w-24 rounded-full" />
                    <Skeleton className="h-12 w-full rounded-2xl" />
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : submittedItems.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine eingereichten Unterlagen zur Prüfung vorhanden.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {submittedItems.map((item) => (
                <Card
                  key={item.tax_return_id}
                  className="rounded-2xl border-border/60 shadow-[0_8px_30px_rgba(0,0,0,0.06)] hover:shadow-[0_12px_40px_rgba(0,0,0,0.1)] transition-all duration-200"
                >
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    {/* Status + Year */}
                    <div className="flex items-center gap-2 w-full justify-between">
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">
                        <ClipboardCheck className="h-3 w-3 mr-1" />
                        {item.requests.length} Einreichung(en)
                      </Badge>
                      <span className="text-xs text-muted-foreground font-medium">{item.tax_year}</span>
                    </div>

                    {/* User Button */}
                    <button
                      onClick={() => handleOpenReviewDialog(item)}
                      className="w-full bg-gradient-to-r from-[rgb(50,120,255)] to-[rgb(20,80,220)] text-white rounded-2xl h-12 flex items-center justify-center font-medium text-sm hover:scale-[1.02] active:scale-95 transition-transform"
                    >
                      {item.user_name || 'Unbekannt'}
                    </button>

                    {/* Email */}
                    <span className="text-xs text-muted-foreground truncate max-w-full">
                      {item.user_email || 'Keine E-Mail'}
                    </span>

                    {/* Footer */}
                    <div className="flex items-center justify-between w-full pt-1 border-t border-border/40">
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(item.submitted_at), 'dd.MM.yyyy', { locale: de })}
                      </span>
                      <Button
                        size="sm"
                        className="h-8 px-3 text-xs rounded-xl bg-gradient-to-r from-[rgb(50,120,255)] to-[rgb(20,80,220)] text-white hover:scale-[1.02] active:scale-95 transition-transform"
                        onClick={() => handleOpenReviewDialog(item)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1" />
                        Prüfen
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Create Request Dialog */}
      {selectedItem && (
        <CreateMissingItemRequestDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          userId={selectedItem.user_id}
          taxReturnId={selectedItem.id}
          userName={`${selectedItem.user_first_name || ''} ${selectedItem.user_last_name || ''}`.trim() || 'Benutzer'}
          taxYear={selectedItem.tax_year}
          onSuccess={handleRefresh}
        />
      )}

      {/* Review Dialog */}
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
