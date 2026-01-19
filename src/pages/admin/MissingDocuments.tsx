import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  AlertCircle, 
  FileWarning, 
  HelpCircle, 
  ExternalLink,
  RefreshCw,
  Filter
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

type FilterStatus = 'all' | 'missing_documents' | 'missing_information';

const MissingDocuments = () => {
  const [items, setItems] = useState<MissingTaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterStatus>('all');
  const navigate = useNavigate();

  const fetchMissingItems = async () => {
    setLoading(true);
    try {
      // Fetch tax returns with missing status
      const { data: taxReturns, error: taxError } = await supabase
        .from('tax_returns')
        .select('id, user_id, tax_year, status, updated_at')
        .in('status', ['missing_documents', 'missing_information'])
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

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const missingDocumentsCount = items.filter(i => i.status === 'missing_documents').length;
  const missingInfoCount = items.filter(i => i.status === 'missing_information').length;

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
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getUserInitials = (firstName: string | null, lastName: string | null) => {
    const first = firstName?.charAt(0).toUpperCase() || '';
    const last = lastName?.charAt(0).toUpperCase() || '';
    return first + last || '?';
  };

  const handleViewDetails = (userId: string, taxYear: string) => {
    navigate(`/admin/user/${userId}?year=${taxYear}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-orange-500" />
            Fehlende Unterlagen & Angaben
          </h1>
          <p className="text-muted-foreground">
            Übersicht aller Steuererklärungen mit fehlendem Status
          </p>
        </div>
        <Button variant="outline" onClick={fetchMissingItems} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Aktualisieren
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{items.length}</div>
            <p className="text-xs text-muted-foreground">
              Steuererklärungen mit Aktion erforderlich
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fehlende Unterlagen</CardTitle>
            <FileWarning className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{missingDocumentsCount}</div>
            <p className="text-xs text-muted-foreground">
              Dokumente müssen nachgereicht werden
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fehlende Angaben</CardTitle>
            <HelpCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{missingInfoCount}</div>
            <p className="text-xs text-muted-foreground">
              Informationen müssen ergänzt werden
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Benutzer mit fehlenden Daten</CardTitle>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filter} onValueChange={(v) => setFilter(v as FilterStatus)}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle ({items.length})</SelectItem>
                  <SelectItem value="missing_documents">
                    Fehlende Unterlagen ({missingDocumentsCount})
                  </SelectItem>
                  <SelectItem value="missing_information">
                    Fehlende Angaben ({missingInfoCount})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Keine Einträge gefunden</h3>
              <p className="text-muted-foreground">
                Es gibt derzeit keine Steuererklärungen mit fehlendem Status.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Adressnr.</TableHead>
                  <TableHead>Steuerjahr</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Zuletzt aktualisiert</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={item.user_avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getUserInitials(item.user_first_name, item.user_last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {item.user_first_name || item.user_last_name
                              ? `${item.user_first_name || ''} ${item.user_last_name || ''}`.trim()
                              : 'Unbekannt'}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.user_email || 'Keine E-Mail'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {item.adressnummer ? (
                        <span className="text-xs font-semibold text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {item.adressnummer}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{item.tax_year}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {format(new Date(item.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(item.user_id, item.tax_year)}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MissingDocuments;
