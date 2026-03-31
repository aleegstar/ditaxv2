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
      pending: { label: 'Ausstehend', className: 'bg-foreground/[0.06] text-muted-foreground' },
      under_review: { label: 'In Prüfung', className: 'bg-foreground/[0.06] text-muted-foreground' },
      approved: { label: 'Genehmigt', className: 'bg-foreground/[0.08] text-foreground' },
      rejected: { label: 'Abgelehnt', className: 'bg-destructive/10 text-destructive' },
      revision_required: { label: 'Überarbeitung nötig', className: 'bg-foreground/[0.06] text-muted-foreground' },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
        {config.label}
      </span>
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
    <div className="container mx-auto px-4 py-8 space-y-6 min-h-screen">
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
            <Button variant="outline" className="rounded-xl">
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

      {/* Bills List */}
       <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl shadow-sm overflow-hidden">
         <div className="divide-y divide-white/30">
          {bills.map((bill) => (
            <div key={bill.id} className="group flex items-center justify-between px-5 py-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted/50">
                  <FileText className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {bill.tax_filer 
                      ? `${bill.tax_filer.first_name} ${bill.tax_filer.last_name}` 
                      : `${bill.profiles?.first_name} ${bill.profiles?.last_name}`}
                    <span className="ml-2 text-muted-foreground font-normal">· {bill.tax_year}</span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate mt-0.5">
                    {bill.file_name}
                    <span className="mx-1.5">·</span>
                    {new Date(bill.upload_date).toLocaleDateString('de-DE')}
                    {bill.uploaded_by_admin_id ? ' · Admin' : ''}
                    {bill.admin_notes && (
                      <span className="mx-1.5">· {bill.admin_notes}</span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {getStatusBadge(bill.status)}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 rounded-lg"
                    onClick={() => handleDownload(bill)}
                  >
                    <Download className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                  {bill.status !== 'approved' && bill.status !== 'rejected' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg"
                      onClick={() => {
                        setSelectedBill(bill);
                        setReviewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" strokeWidth={1.5} />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {bills.length === 0 && (
            <div className="text-center py-16">
              <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-3" strokeWidth={1.5} />
              <p className="text-sm text-muted-foreground">Keine definitiven Steuerrechnungen vorhanden.</p>
            </div>
          )}
        </div>
      </div>

      {/* Review Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Steuerrechnung prüfen</DialogTitle>
            <DialogDescription>
              {selectedBill?.profiles?.first_name} {selectedBill?.profiles?.last_name} · {selectedBill?.tax_year}
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