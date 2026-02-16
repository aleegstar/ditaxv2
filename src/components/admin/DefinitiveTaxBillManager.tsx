import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Upload, Eye, CheckCircle, XCircle, Clock, AlertCircle, Download } from 'lucide-react';
import { useAdminValidation } from '@/hooks/use-admin-validation';
import { AdminWelcomeHeader } from './AdminWelcomeHeader';
import { validateStoragePath } from '@/utils/fileValidation';

interface DefinitiveTaxBill {
  id: string;
  user_id: string;
  tax_year: string;
  file_name: string;
  file_path: string;
  file_type: string;
  uploaded_by_user_id: string | null;
  uploaded_by_admin_id: string | null;
  upload_date: string;
  status: string;
  admin_reviewed_by: string | null;
  admin_review_date: string | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  tax_filer_id: string | null;
  profiles?: {
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  tax_filer?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export function DefinitiveTaxBillManager() {
  const { isAdmin } = useAdminValidation();
  const [bills, setBills] = useState<DefinitiveTaxBill[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBill, setSelectedBill] = useState<DefinitiveTaxBill | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedTaxYear, setSelectedTaxYear] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchBills();
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchBills = async () => {
    try {
      // First get the bills
      const { data: billsData, error: billsError } = await supabase
        .from('definitive_tax_bills')
        .select('*')
        .order('created_at', { ascending: false });

      if (billsError) throw billsError;

      // Then get profile and tax_filer data for each bill
      const billsWithData = await Promise.all(
        (billsData || []).map(async (bill) => {
          // Get profile data
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', bill.user_id)
            .single();

          // Get tax filer data if tax_filer_id exists
          let taxFilerData = null;
          if (bill.tax_filer_id) {
            const { data: filerData, error: filerError } = await supabase
              .from('tax_filers')
              .select('first_name, last_name')
              .eq('id', bill.tax_filer_id)
              .single();
            taxFilerData = filerError ? null : filerData;
          }

          return {
            ...bill,
            profiles: profileError ? null : profileData,
            tax_filer: taxFilerData
          };
        })
      );

      setBills(billsWithData);
    } catch (error) {
      console.error('Error fetching definitive tax bills:', error);
      toast({
        title: "Fehler",
        description: "Definitive Steuerrechnungen konnten nicht geladen werden.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .order('first_name', { ascending: true });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: 'Ausstehend', variant: 'secondary' as const, icon: Clock },
      under_review: { label: 'In Prüfung', variant: 'default' as const, icon: Eye },
      approved: { label: 'Genehmigt', variant: 'default' as const, icon: CheckCircle },
      rejected: { label: 'Abgelehnt', variant: 'destructive' as const, icon: XCircle },
      revision_required: { label: 'Überarbeitung nötig', variant: 'secondary' as const, icon: AlertCircle },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const handleReview = async () => {
    if (!selectedBill || !reviewStatus) return;

    try {
      const { error } = await supabase
        .from('definitive_tax_bills')
        .update({
          status: reviewStatus,
          admin_reviewed_by: (await supabase.auth.getUser()).data.user?.id,
          admin_review_date: new Date().toISOString(),
          admin_notes: reviewNotes || null,
        })
        .eq('id', selectedBill.id);

      if (error) throw error;

      toast({
        title: "Erfolg",
        description: "Definitive Steuerrechnung wurde bewertet.",
      });

      setReviewDialogOpen(false);
      setSelectedBill(null);
      setReviewStatus('');
      setReviewNotes('');
      fetchBills();
    } catch (error) {
      console.error('Error reviewing bill:', error);
      toast({
        title: "Fehler",
        description: "Bewertung konnte nicht gespeichert werden.",
        variant: "destructive",
      });
    }
  };

  const handleAdminUpload = async () => {
    if (!selectedFile || !selectedUserId || !selectedTaxYear) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Datei, einen Benutzer und ein Steuerjahr aus.",
        variant: "destructive",
      });
      return;
    }

    setUploadLoading(true);

    try {
      // Check if bill already exists for this user/year
      const { data: existingBill } = await supabase
        .from('definitive_tax_bills')
        .select('id')
        .eq('user_id', selectedUserId)
        .eq('tax_year', selectedTaxYear)
        .single();

      if (existingBill) {
        toast({
          title: "Fehler",
          description: "Für diesen Benutzer und dieses Jahr existiert bereits eine definitive Steuerrechnung.",
          variant: "destructive",
        });
        return;
      }

      // SECURITY: Sanitize file name to prevent path traversal attacks
      const { sanitizeFileName, validateFilePath } = await import('@/utils/fileValidation');
      const safeName = sanitizeFileName(selectedFile.name);
      const filePath = `${selectedUserId}/${selectedTaxYear}/${safeName}`;
      
      // SECURITY: Validate complete file path
      if (!validateFilePath(filePath)) {
        toast({
          title: "Fehler",
          description: "Ungültiger Dateipfad erkannt.",
          variant: "destructive",
        });
        return;
      }
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('definitive-tax-bills')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // Create database record (use sanitized file name)
      const { error: dbError } = await supabase
        .from('definitive_tax_bills')
        .insert({
          user_id: selectedUserId,
          tax_year: selectedTaxYear,
          file_name: safeName,
          file_path: filePath,
          file_type: selectedFile.type,
          uploaded_by_admin_id: (await supabase.auth.getUser()).data.user?.id,
          status: 'approved', // Admin uploads are automatically approved
        });

      if (dbError) throw dbError;

      toast({
        title: "Erfolg",
        description: "Definitive Steuerrechnung wurde erfolgreich hochgeladen.",
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedUserId('');
      setSelectedTaxYear('');
      fetchBills();
    } catch (error) {
      console.error('Error uploading bill:', error);
      toast({
        title: "Fehler",
        description: "Upload fehlgeschlagen. Bitte versuchen Sie es erneut.",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleDownload = async (bill: DefinitiveTaxBill) => {
    if (!validateStoragePath(bill.file_path)) {
      toast({ title: 'Fehler', description: 'Ungültiger Dateipfad.', variant: 'destructive' });
      return;
    }
    try {
      const { data, error } = await supabase.storage
        .from('definitive-tax-bills')
        .download(bill.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = bill.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Fehler",
        description: "Datei konnte nicht heruntergeladen werden.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Zugriff verweigert. Administratorrechte erforderlich.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 bg-white min-h-screen">
      <AdminWelcomeHeader
        title="Definitive Steuerrechnungen"
        subtitle="Verwalten Sie definitive Steuerrechnungen für alle Benutzer"
        badge={{
          text: `${bills.length} Rechnungen`,
          variant: 'secondary'
        }}
        onRefresh={fetchBills}
      />
      <div className="flex justify-end">
        <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              className="bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-5 lg:px-[20px] py-3 lg:py-[10px] h-12 lg:h-14 text-sm lg:text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 lg:gap-[10px]"
              style={{
                boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px'
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Hochladen
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Definitive Steuerrechnung hochladen</DialogTitle>
              <DialogDescription>
                Laden Sie eine definitive Steuerrechnung für einen Benutzer hoch.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="user-select">Benutzer</Label>
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Benutzer auswählen" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.first_name} {user.last_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="tax-year">Steuerjahr</Label>
                <Input
                  id="tax-year"
                  value={selectedTaxYear}
                  onChange={(e) => setSelectedTaxYear(e.target.value)}
                  placeholder="z.B. 2023"
                />
              </div>
              <div>
                <Label htmlFor="file-upload">Datei (PDF)</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                  Abbrechen
                </Button>
                <Button onClick={handleAdminUpload} disabled={uploadLoading}>
                  {uploadLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Hochladen
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {bills.map((bill) => (
          <Card key={bill.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    {bill.tax_filer 
                      ? `${bill.tax_filer.first_name} ${bill.tax_filer.last_name}` 
                      : `${bill.profiles?.first_name} ${bill.profiles?.last_name}`} - {bill.tax_year}
                  </CardTitle>
                  <CardDescription>
                    {bill.profiles?.email} 
                    {bill.tax_filer && ` • Tax Filer: ${bill.tax_filer.first_name} ${bill.tax_filer.last_name}`}
                    {' • Hochgeladen am '}{new Date(bill.upload_date).toLocaleDateString('de-DE')}
                    {bill.uploaded_by_admin_id ? ' (von Admin)' : ' (von Benutzer)'}
                  </CardDescription>
                </div>
                {getStatusBadge(bill.status)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{bill.file_name}</p>
                  {bill.admin_notes && (
                    <p className="text-sm text-muted-foreground">
                      Notizen: {bill.admin_notes}
                    </p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(bill)}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                  {bill.status !== 'approved' && bill.status !== 'rejected' && (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedBill(bill);
                        setReviewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Prüfen
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {bills.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Keine definitiven Steuerrechnungen vorhanden.</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Definitive Steuerrechnung prüfen</DialogTitle>
            <DialogDescription>
              Bewerten Sie die definitive Steuerrechnung für {selectedBill?.profiles?.first_name} {selectedBill?.profiles?.last_name} ({selectedBill?.tax_year})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="review-status">Status</Label>
              <Select value={reviewStatus} onValueChange={setReviewStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status auswählen" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="under_review">In Prüfung</SelectItem>
                  <SelectItem value="approved">Genehmigt</SelectItem>
                  <SelectItem value="rejected">Abgelehnt</SelectItem>
                  <SelectItem value="revision_required">Überarbeitung erforderlich</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="review-notes">Notizen (optional)</Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder="Zusätzliche Notizen zur Bewertung..."
                rows={3}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={handleReview} disabled={!reviewStatus}>
                Bewertung speichern
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}