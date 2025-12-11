import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Upload, Download, Clock, Eye, CheckCircle, XCircle, AlertCircle, AlertTriangle } from 'lucide-react';

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
}

interface UserDefinitiveTaxBillProps {
  userId: string;
}

export function UserDefinitiveTaxBill({ userId }: UserDefinitiveTaxBillProps) {
  const [bills, setBills] = useState<DefinitiveTaxBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTaxYear, setSelectedTaxYear] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    getCurrentUser();
    fetchBills();
  }, [userId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const fetchBills = async () => {
    try {
      const { data, error } = await supabase
        .from('definitive_tax_bills')
        .select('*')
        .eq('user_id', userId)
        .order('tax_year', { ascending: false });

      if (error) throw error;
      setBills(data || []);
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

  const canUserUpload = (taxYear: string) => {
    const existingBill = bills.find(bill => bill.tax_year === taxYear);
    // User kann nicht hochladen wenn Admin bereits hochgeladen hat
    return !existingBill || !existingBill.uploaded_by_admin_id;
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedTaxYear) {
      toast({
        title: "Fehler",
        description: "Bitte wählen Sie eine Datei und ein Steuerjahr aus.",
        variant: "destructive",
      });
      return;
    }

    if (!canUserUpload(selectedTaxYear)) {
      toast({
        title: "Fehler",
        description: "Für dieses Steuerjahr wurde bereits eine definitive Rechnung vom Administrator hochgeladen.",
        variant: "destructive",
      });
      return;
    }

    setUploadLoading(true);

    try {
      // Check if bill already exists for this year
      const existingBill = bills.find(bill => bill.tax_year === selectedTaxYear);

      const filePath = `${userId}/${selectedTaxYear}/${selectedFile.name}`;
      
      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('definitive-tax-bills')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      if (existingBill) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('definitive_tax_bills')
          .update({
            file_name: selectedFile.name,
            file_path: filePath,
            file_type: selectedFile.type,
            status: 'pending',
            admin_reviewed_by: null,
            admin_review_date: null,
            admin_notes: null,
            upload_date: new Date().toISOString(),
          })
          .eq('id', existingBill.id);

        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('definitive_tax_bills')
          .insert({
            user_id: userId,
            tax_year: selectedTaxYear,
            file_name: selectedFile.name,
            file_path: filePath,
            file_type: selectedFile.type,
            uploaded_by_user_id: currentUser?.id,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Erfolg",
        description: "Definitive Steuerrechnung wurde erfolgreich hochgeladen.",
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
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

  // Check if user is viewing their own profile
  const isOwnProfile = currentUser?.id === userId;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-semibold">Definitive Steuerrechnungen</h3>
          <p className="text-muted-foreground">
            Ihre definitiven Steuerrechnungen vom Steueramt
          </p>
        </div>
        {isOwnProfile && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Rechnung hochladen
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Definitive Steuerrechnung hochladen</DialogTitle>
                <DialogDescription>
                  Laden Sie Ihre definitive Steuerrechnung vom Steueramt hoch.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
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
                {selectedTaxYear && !canUserUpload(selectedTaxYear) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Upload nicht möglich</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">
                      Für dieses Steuerjahr wurde bereits eine definitive Rechnung vom Administrator hochgeladen.
                    </p>
                  </div>
                )}
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploadLoading || (selectedTaxYear && !canUserUpload(selectedTaxYear))}
                  >
                    {uploadLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Hochladen
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className="grid gap-4">
        {bills.map((bill) => (
          <Card key={bill.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Steuerjahr {bill.tax_year}
                  </CardTitle>
                  <CardDescription>
                    Hochgeladen am {new Date(bill.upload_date).toLocaleDateString('de-DE')}
                    {bill.uploaded_by_admin_id ? ' (von Administrator)' : ' (von Ihnen)'}
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
                    <div className="bg-muted p-2 rounded text-sm">
                      <p className="font-medium">Administratornotizen:</p>
                      <p>{bill.admin_notes}</p>
                    </div>
                  )}
                  {bill.status === 'rejected' || bill.status === 'revision_required' ? (
                    <div className="bg-red-50 border border-red-200 rounded p-2 text-sm">
                      <p className="text-red-800">
                        {bill.status === 'rejected' 
                          ? 'Diese Rechnung wurde abgelehnt.' 
                          : 'Diese Rechnung benötigt eine Überarbeitung.'}
                      </p>
                      {bill.admin_notes && (
                        <p className="text-red-700 mt-1">Grund: {bill.admin_notes}</p>
                      )}
                    </div>
                  ) : null}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(bill)}
                >
                  <Download className="h-4 w-4 mr-1" />
                  Download
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}

        {bills.length === 0 && (
          <Card>
            <CardContent className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Noch keine definitiven Steuerrechnungen vorhanden.
              </p>
              {isOwnProfile && (
                <p className="text-sm text-muted-foreground mt-2">
                  Laden Sie Ihre definitive Steuerrechnung vom Steueramt hoch, sobald Sie diese erhalten.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}