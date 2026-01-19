import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { AdminWelcomeHeader } from '@/components/admin/AdminWelcomeHeader';
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
  RefreshCw
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

  const missingDocumentsStats = {
    total: items.length,
    missingDocs: missingDocumentsCount,
    missingInfo: missingInfoCount,
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <AdminWelcomeHeader
        title="Fehlende Unterlagen"
        subtitle="Übersicht aller Steuererklärungen mit fehlendem Status"
        badge={{
          text: `${missingDocumentsStats.total} offen`,
          variant: missingDocumentsStats.total > 0 ? 'default' : 'secondary'
        }}
        onRefresh={fetchMissingItems}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 mb-6">
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{missingDocumentsStats.total}</div>
            <div className="text-sm text-muted-foreground">Gesamt offen</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-700">{missingDocumentsCount}</div>
            <div className="text-sm text-orange-600">Fehlende Unterlagen</div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-700">{missingInfoCount}</div>
            <div className="text-sm text-red-600">Fehlende Angaben</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
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

        <Button variant="outline" size="sm" onClick={fetchMissingItems}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Steuererklärungen mit fehlenden Daten
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-3 w-[150px]" />
                  </div>
                  <Skeleton className="h-8 w-[100px]" />
                </div>
              ))}
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine Steuererklärungen mit fehlendem Status gefunden.</p>
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
                        <Avatar className="h-9 w-9">
                          {item.user_avatar_url ? (
                            <AvatarImage src={item.user_avatar_url} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getUserInitials(item.user_first_name, item.user_last_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {item.user_first_name || item.user_last_name
                              ? `${item.user_first_name || ''} ${item.user_last_name || ''}`.trim()
                              : 'Unbekannt'}
                          </div>
                          <div className="text-sm text-muted-foreground">
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
                    <TableCell>
                      {format(new Date(item.updated_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                        title="Benutzer anzeigen"
                      >
                        <Link to={`/admin/user/${item.user_id}?year=${item.tax_year}`}>
                          <ExternalLink className="h-4 w-4" />
                        </Link>
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
