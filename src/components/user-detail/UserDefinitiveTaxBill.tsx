import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, FileText, Upload, Download, Clock, Eye, CheckCircle, XCircle, AlertCircle, AlertTriangle, Receipt, Calendar, CloudUpload } from 'lucide-react';

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
  tax_filer_id?: string | null;
}

interface UserDefinitiveTaxBillProps {
  userId: string;
  isAdmin?: boolean;
  selectedTaxFilerId?: string | null;
  selectedYear?: string;
}

export function UserDefinitiveTaxBill({ userId, isAdmin = false, selectedTaxFilerId, selectedYear }: UserDefinitiveTaxBillProps) {
  const [bills, setBills] = useState<DefinitiveTaxBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedTaxYear, setSelectedTaxYear] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 6 }, (_, i) => String(currentYear - i));

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

  const getStatusConfig = (status: string) => {
    const statusConfig = {
      pending: { label: 'Ausstehend', bgColor: 'bg-amber-100', textColor: 'text-amber-700', borderColor: 'border-amber-200', icon: Clock },
      under_review: { label: 'In Prüfung', bgColor: 'bg-blue-100', textColor: 'text-blue-700', borderColor: 'border-blue-200', icon: Eye },
      approved: { label: 'Genehmigt', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700', borderColor: 'border-emerald-200', icon: CheckCircle },
      rejected: { label: 'Abgelehnt', bgColor: 'bg-red-100', textColor: 'text-red-700', borderColor: 'border-red-200', icon: XCircle },
      revision_required: { label: 'Überarbeitung', bgColor: 'bg-orange-100', textColor: 'text-orange-700', borderColor: 'border-orange-200', icon: AlertCircle },
    };

    return statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
  };

  const canUserUpload = (taxYear: string) => {
    const existingBill = bills.find(bill => bill.tax_year === taxYear);
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

    if (!isAdmin && !canUserUpload(selectedTaxYear)) {
      toast({
        title: "Fehler",
        description: "Für dieses Steuerjahr wurde bereits eine definitive Rechnung vom Administrator hochgeladen.",
        variant: "destructive",
      });
      return;
    }

    setUploadLoading(true);

    try {
      const existingBill = bills.find(bill => bill.tax_year === selectedTaxYear);
      const filePath = `${userId}/${selectedTaxYear}/${selectedFile.name}`;
      
      // If file exists, delete old one first
      if (existingBill) {
        await supabase.storage
          .from('definitive-tax-bills')
          .remove([existingBill.file_path]);
      }
      
      const { error: uploadError } = await supabase.storage
        .from('definitive-tax-bills')
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      if (existingBill) {
        const updateData: any = {
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          upload_date: new Date().toISOString(),
        };
        
        if (isAdmin) {
          updateData.uploaded_by_admin_id = currentUser?.id;
          updateData.status = 'approved';
        } else {
          updateData.status = 'pending';
          updateData.admin_reviewed_by = null;
          updateData.admin_review_date = null;
          updateData.admin_notes = null;
        }

        const { error: updateError } = await supabase
          .from('definitive_tax_bills')
          .update(updateData)
          .eq('id', existingBill.id);

        if (updateError) throw updateError;
      } else {
        const insertData: any = {
          user_id: userId,
          tax_year: selectedTaxYear,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
        };

        if (isAdmin) {
          insertData.uploaded_by_admin_id = currentUser?.id;
          insertData.status = 'approved';
        } else {
          insertData.uploaded_by_user_id = currentUser?.id;
        }

        const { error: insertError } = await supabase
          .from('definitive_tax_bills')
          .insert(insertData);

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

  // Filter bills by selectedTaxFilerId and selectedYear
  const filteredBills = useMemo(() => {
    let filtered = bills;
    
    // Filter by tax_filer_id if provided (for multi-person support)
    if (selectedTaxFilerId) {
      filtered = filtered.filter(bill => {
        // If the bill has a tax_filer_id, filter by it
        if (bill.tax_filer_id) {
          return bill.tax_filer_id === selectedTaxFilerId;
        }
        // If no tax_filer_id on bill, show it (backwards compatibility)
        return true;
      });
    }
    
    // Filter by year if provided
    if (selectedYear) {
      filtered = filtered.filter(bill => String(bill.tax_year) === String(selectedYear));
    }
    
    return filtered;
  }, [bills, selectedTaxFilerId, selectedYear]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === userId;
  const canUpload = isAdmin || isOwnProfile;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center border border-emerald-200/50">
            <Receipt className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Definitive Steuerrechnungen</h3>
            <p className="text-sm text-slate-500">
              {isAdmin ? 'Steuerrechnungen vom Steueramt hochladen' : 'Ihre definitiven Steuerrechnungen vom Steueramt'}
            </p>
          </div>
        </div>
        
        {canUpload && (
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="rounded-full px-5 h-10 bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white font-medium flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Hochladen
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Steuerrechnung hochladen</DialogTitle>
                <DialogDescription>
                  {isAdmin 
                    ? 'Laden Sie die definitive Steuerrechnung für diesen Benutzer hoch.'
                    : 'Laden Sie Ihre definitive Steuerrechnung vom Steueramt hoch.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="tax-year">Steuerjahr</Label>
                  <Select value={selectedTaxYear} onValueChange={setSelectedTaxYear}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue placeholder="Jahr wählen" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(year => (
                        <SelectItem key={year} value={year}>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-slate-400" />
                            {year}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Datei (PDF)</Label>
                  <div 
                    className={`
                      relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all
                      ${selectedFile 
                        ? 'border-emerald-300 bg-emerald-50' 
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'}
                    `}
                    onClick={() => document.getElementById('file-upload')?.click()}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                    {selectedFile ? (
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-slate-900 text-sm">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">
                            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <CloudUpload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-600 font-medium">Klicken zum Hochladen</p>
                        <p className="text-xs text-slate-400 mt-1">PDF-Dateien bis 10MB</p>
                      </>
                    )}
                  </div>
                </div>

                {selectedTaxYear && !isAdmin && !canUserUpload(selectedTaxYear) && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                    <div className="flex items-center gap-2 text-amber-800">
                      <AlertTriangle className="h-4 w-4" />
                      <span className="text-sm font-medium">Upload nicht möglich</span>
                    </div>
                    <p className="text-sm text-amber-700 mt-1">
                      Für dieses Steuerjahr wurde bereits eine Rechnung vom Administrator hochgeladen.
                    </p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setUploadDialogOpen(false)}
                    className="rounded-full"
                  >
                    Abbrechen
                  </Button>
                  <Button 
                    onClick={handleUpload} 
                    disabled={uploadLoading || !selectedFile || !selectedTaxYear || (!isAdmin && selectedTaxYear && !canUserUpload(selectedTaxYear))}
                    className="rounded-full bg-[#1d64ff] hover:bg-[#1d64ff]/90"
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

      {/* Bills List */}
      <div className="space-y-3">
        {filteredBills.map((bill) => {
          const statusConfig = getStatusConfig(bill.status);
          const StatusIcon = statusConfig.icon;
          
          return (
            <div 
              key={bill.id} 
              className="bg-white rounded-xl border border-slate-200 p-4 hover:border-slate-300 hover:shadow-sm transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center border border-slate-200/50">
                    <FileText className="h-6 w-6 text-slate-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-slate-900">Steuerjahr {bill.tax_year}</h4>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.textColor} border ${statusConfig.borderColor}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusConfig.label}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                      {bill.file_name}
                      <span className="mx-1.5">•</span>
                      {new Date(bill.upload_date).toLocaleDateString('de-DE')}
                      {bill.uploaded_by_admin_id && (
                        <span className="ml-1 text-emerald-600 font-medium">(Admin)</span>
                      )}
                    </p>
                    {bill.admin_notes && (
                      <p className="text-sm text-slate-600 mt-2 bg-slate-50 rounded-lg px-3 py-2">
                        <span className="font-medium">Notiz:</span> {bill.admin_notes}
                      </p>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(bill)}
                  className="rounded-full"
                >
                  <Download className="h-4 w-4 mr-1.5" />
                  Download
                </Button>
              </div>
            </div>
          );
        })}

        {filteredBills.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-600 font-medium">Keine definitiven Steuerrechnungen{selectedYear ? ` für ${selectedYear}` : ''}</p>
            <p className="text-slate-400 text-sm mt-1 text-center max-w-xs">
              {isAdmin 
                ? 'Laden Sie die definitive Steuerrechnung für diesen Benutzer hoch.'
                : 'Laden Sie Ihre definitive Steuerrechnung vom Steueramt hoch, sobald Sie diese erhalten.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}