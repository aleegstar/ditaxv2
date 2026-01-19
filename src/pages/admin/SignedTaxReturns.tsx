import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import { AdminWelcomeHeader } from '@/components/admin/AdminWelcomeHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  FileText, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Send,
  Eye,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

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
      // Fetch tax return signatures with related data
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

      if (sigError) {
        console.error('Error fetching signatures:', sigError);
        throw sigError;
      }

      if (!signatures || signatures.length === 0) {
        setSignedReturns([]);
        setLoading(false);
        return;
      }

      // Get unique completed_tax_return_ids
      const completedReturnIds = [...new Set(signatures.map(s => s.completed_tax_return_id))];
      
      // Fetch completed tax returns
      const { data: completedReturns, error: ctrError } = await supabase
        .from('completed_tax_returns')
        .select('id, status, signed_pdf_path')
        .in('id', completedReturnIds);

      if (ctrError) {
        console.error('Error fetching completed returns:', ctrError);
      }

      // Get unique user_ids
      const userIds = [...new Set(signatures.map(s => s.user_id))];

      // Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
      }

      // Fetch adressnummer from form_data for each user
      const { data: formDataRecords, error: formDataError } = await supabase
        .from('form_data')
        .select('user_id, data, tax_year')
        .in('user_id', userIds)
        .eq('form_type', 'tax_form');

      if (formDataError) {
        console.error('Error fetching form data:', formDataError);
      }

      // Combine data
      const combined: SignedTaxReturn[] = signatures.map(sig => {
        const ctr = completedReturns?.find(c => c.id === sig.completed_tax_return_id);
        const profile = profiles?.find(p => p.id === sig.user_id);
        
        // Find adressnummer for this user and tax year
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

      toast({
        title: 'Erfolgreich',
        description: 'Steuererklärung wurde als übermittelt markiert.',
      });

      // Refresh data
      await fetchSignedReturns();
    } catch (error) {
      console.error('Error marking as submitted:', error);
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
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

      toast({
        title: 'Erfolgreich',
        description: 'Steuererklärung wurde als abgeschlossen markiert.',
      });

      await fetchSignedReturns();
    } catch (error) {
      console.error('Error marking as completed:', error);
      toast({
        title: 'Fehler',
        description: 'Status konnte nicht aktualisiert werden.',
        variant: 'destructive',
      });
    } finally {
      setUpdatingId(null);
    }
  };

  const openPdf = async (signedPdfPath: string | null) => {
    if (!signedPdfPath) {
      toast({
        title: 'Fehler',
        description: 'Kein unterschriebenes PDF vorhanden.',
        variant: 'destructive',
      });
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
      toast({
        title: 'Fehler',
        description: 'PDF konnte nicht geöffnet werden.',
        variant: 'destructive',
      });
    }
  };

  const getStatusBadge = (taxReturnStatus: string | null) => {
    switch (taxReturnStatus) {
      case 'submitted':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-200">
            <Send className="h-3 w-3 mr-1" />
            Übermittelt
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Abgeschlossen
          </Badge>
        );
      default:
        return (
          <Badge className="bg-amber-100 text-amber-700 border-amber-200">
            <Clock className="h-3 w-3 mr-1" />
            Bereit
          </Badge>
        );
    }
  };

  const getInitials = (firstName: string | null, lastName: string | null, email: string | null) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (email) return email[0].toUpperCase();
    return '?';
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
    <div className="container mx-auto px-4 py-8">
      <AdminWelcomeHeader
        title="Zur Übermittlung"
        subtitle="Unterschriebene Steuererklärungen bereit zur Übermittlung an das Steueramt"
        badge={{
          text: `${stats.ready} bereit`,
          variant: stats.ready > 0 ? 'default' : 'secondary'
        }}
        onRefresh={fetchSignedReturns}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-6">
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Gesamt unterschrieben</div>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 border-amber-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-amber-700">{stats.ready}</div>
            <div className="text-sm text-amber-600">Bereit zur Übermittlung</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-700">{stats.submitted}</div>
            <div className="text-sm text-blue-600">Übermittelt</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-700">{stats.completed}</div>
            <div className="text-sm text-green-600">Abgeschlossen</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as FilterStatus)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Status filtern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle anzeigen</SelectItem>
            <SelectItem value="ready">Bereit zur Übermittlung</SelectItem>
            <SelectItem value="submitted">Übermittelt</SelectItem>
            <SelectItem value="completed">Abgeschlossen</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" onClick={fetchSignedReturns}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Aktualisieren
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Unterschriebene Steuererklärungen
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
          ) : filteredReturns.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Keine unterschriebenen Steuererklärungen gefunden.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Adressnr.</TableHead>
                  <TableHead>Steuerjahr</TableHead>
                  <TableHead>Unterschrieben am</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReturns.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          {item.user_avatar_url ? (
                            <AvatarImage src={item.user_avatar_url} />
                          ) : null}
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {getInitials(item.user_first_name, item.user_last_name, item.user_email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">
                            {item.signer_name || `${item.user_first_name || ''} ${item.user_last_name || ''}`.trim() || 'Unbekannt'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {item.signer_email || item.user_email}
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
                    <TableCell>
                      {format(new Date(item.signed_at), 'dd.MM.yyyy HH:mm', { locale: de })}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(item.tax_return_status)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {item.signed_pdf_path && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openPdf(item.signed_pdf_path)}
                            title="PDF anzeigen"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                          title="Benutzer anzeigen"
                        >
                          <Link to={`/admin/user/${item.user_id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>

                        {(!item.tax_return_status || item.tax_return_status === 'available') && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => markAsSubmitted(item.id, item.completed_tax_return_id)}
                            disabled={updatingId === item.id}
                          >
                            <Send className="h-4 w-4 mr-1" />
                            Übermittelt
                          </Button>
                        )}

                        {item.tax_return_status === 'submitted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => markAsCompleted(item.id, item.completed_tax_return_id)}
                            disabled={updatingId === item.id}
                            className="border-green-300 text-green-700 hover:bg-green-50"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Abschliessen
                          </Button>
                        )}
                      </div>
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

export default SignedTaxReturns;
