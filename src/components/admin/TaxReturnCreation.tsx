import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/modern-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { Calendar, User, DollarSign, FileText, CheckCircle, Upload, PenTool } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AdminWelcomeHeader } from './AdminWelcomeHeader';

interface PaidTaxReturn {
  id: string;
  user_id: string;
  tax_year: string;
  payment_status: string;
  payment_date: string;
  status: string;
  workflow_step: string;
  user_name: string;
  user_email: string;
  created_at: string;
  tax_filer_id: string | null;
  tax_filer_name: string;
}

const TaxReturnCreation: React.FC = () => {
  const [paidTaxReturns, setPaidTaxReturns] = useState<PaidTaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTaxReturn, setSelectedTaxReturn] = useState<PaidTaxReturn | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPaidTaxReturns();
  }, []);

  const fetchPaidTaxReturns = async () => {
    try {
      setLoading(true);
      console.log('🔍 Fetching paid tax returns...');
      
      const { data: taxReturns, error: taxReturnsError, count } = await supabase
        .from('tax_returns')
        .select('*', { count: 'exact' })
        .eq('payment_status', 'paid')
        .in('status', ['pending', 'processing'])
        .order('payment_date', { ascending: false });

      console.log('📊 Raw tax returns data:', { count, data: taxReturns });
      console.log(`📈 Query returned ${count || 0} paid tax returns with status pending/processing`);
      
      if (taxReturnsError) {
        console.error('❌ Error fetching paid tax returns:', taxReturnsError);
        toast({
          title: "Fehler",
          description: "Bezahlte Steuererklärungen konnten nicht geladen werden.",
          variant: "destructive"
        });
        return;
      }

      if (!taxReturns || taxReturns.length === 0) {
        console.log('⚠️ No paid tax returns found matching criteria');
        setPaidTaxReturns([]);
        return;
      }

      console.log('👥 Fetching user profiles for tax returns...');
      console.log(`🔄 Processing ${taxReturns.length} tax returns:`, taxReturns.map(tr => ({
        id: tr.id,
        user_id: tr.user_id,
        tax_year: tr.tax_year,
        status: tr.status
      })));

      const taxReturnsWithUserInfo = await Promise.all(
        taxReturns.map(async (taxReturn) => {
          console.log(`🔍 Fetching profile for user ID: ${taxReturn.user_id}`);
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('first_name, last_name, email')
            .eq('id', taxReturn.user_id)
            .single();

          if (profileError) {
            console.error(`❌ Error fetching profile for user ${taxReturn.user_id}:`, profileError);
          }

          // Better name handling with email fallback
          let displayName = 'Unbekannt';
          if (profile) {
            const fullName = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
            if (fullName) {
              displayName = fullName;
            } else if (profile.email) {
              displayName = profile.email;
            }
          }

          // Fetch tax filer name if tax_filer_id exists
          let taxFilerName = 'Hauptperson';
          if (taxReturn.tax_filer_id) {
            const { data: taxFilerData, error: taxFilerError } = await supabase
              .from('tax_filers')
              .select('first_name, last_name, is_primary, relationship')
              .eq('id', taxReturn.tax_filer_id)
              .single();

            if (taxFilerError) {
              console.error(`❌ Error fetching tax filer ${taxReturn.tax_filer_id}:`, taxFilerError);
            } else if (taxFilerData) {
              taxFilerName = `${taxFilerData.first_name} ${taxFilerData.last_name}`.trim();
              if (!taxFilerData.is_primary && taxFilerData.relationship) {
                taxFilerName += ` (${taxFilerData.relationship})`;
              }
            }
          }

          console.log(`👤 User ${taxReturn.user_id}: name="${displayName}", email="${profile?.email || 'Keine E-Mail'}", tax_year="${taxReturn.tax_year}", tax_filer="${taxFilerName}"`);

          return {
            ...taxReturn,
            user_name: displayName,
            user_email: profile?.email || 'Keine E-Mail',
            tax_filer_id: taxReturn.tax_filer_id,
            tax_filer_name: taxFilerName
          };
        })
      );

      console.log('✅ Final tax returns with user info:', { 
        count: taxReturnsWithUserInfo.length,
        returns: taxReturnsWithUserInfo.map(tr => ({ 
          user_email: tr.user_email, 
          tax_year: tr.tax_year, 
          status: tr.status,
          tax_filer_name: tr.tax_filer_name
        }))
      });
      console.log('📋 Complete tax returns summary:', taxReturnsWithUserInfo.map(tr => ({
        user: tr.user_name,
        email: tr.user_email,
        year: tr.tax_year,
        status: tr.status,
        taxFiler: tr.tax_filer_name
      })));

      setPaidTaxReturns(taxReturnsWithUserInfo);
    } catch (error) {
      console.error('💥 Error in fetchPaidTaxReturns:', error);
      toast({
        title: "Fehler",
        description: "Ein Fehler ist beim Laden der Daten aufgetreten.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartCreation = async (taxReturnId: string) => {
    try {
      const { error } = await supabase
        .from('tax_returns')
        .update({ 
          status: 'processing',
          workflow_step: 'creation_in_progress'
        })
        .eq('id', taxReturnId);

      if (error) {
        console.error('Error updating tax return status:', error);
        toast({
          title: "Fehler",
          description: "Status konnte nicht aktualisiert werden.",
          variant: "destructive"
        });
        return;
      }

      toast({
        title: "Erfolgreich",
        description: "Steuererklärung wurde zur Bearbeitung freigegeben.",
      });

      fetchPaidTaxReturns();
    } catch (error) {
      console.error('Error starting tax return creation:', error);
      toast({
        title: "Fehler",
        description: "Ein Fehler ist aufgetreten.",
        variant: "destructive"
      });
    }
  };

  const handleUploadClick = (taxReturn: PaidTaxReturn) => {
    setSelectedTaxReturn(taxReturn);
    setUploadDialogOpen(true);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        toast({
          title: "Ungültiger Dateityp",
          description: "Bitte wählen Sie eine PDF-Datei aus.",
          variant: "destructive"
        });
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadComplete = async () => {
    if (!selectedFile || !selectedTaxReturn) {
      toast({
        title: "Fehlende Informationen",
        description: "Bitte wählen Sie eine Datei aus.",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        throw new Error(`Auth-Fehler: ${userError.message}`);
      }

      // SECURITY: Sanitize file name to prevent path traversal attacks
      const { sanitizeFileName, validateFilePath } = await import('@/utils/fileValidation');
      const safeName = sanitizeFileName(selectedFile.name);
      const fileName = `${selectedTaxReturn.user_id}_${selectedTaxReturn.tax_year}_${Date.now()}.pdf`;
      const filePath = `${selectedTaxReturn.user_id}/${fileName}`;
      
      // SECURITY: Validate complete file path
      if (!validateFilePath(filePath)) {
        toast({
          title: "Fehler",
          description: "Ungültiger Dateipfad erkannt.",
          variant: "destructive"
        });
        return;
      }

      console.log('Admin uploading completed tax return:', {
        userId: selectedTaxReturn.user_id,
        fileName,
        filePath,
        fileSize: selectedFile.size,
        fileType: selectedFile.type
      });

      // Upload file to storage
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('completed-tax-returns')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false,
          contentType: 'application/pdf'
        });

      if (uploadError) {
        console.error('Upload error details:', uploadError);
        throw new Error(`Upload fehlgeschlagen: ${uploadError.message}`);
      }

      console.log('Upload successful:', uploadData);

      // Insert record into completed_tax_returns table (use sanitized file name)
      const { error: dbError } = await supabase
        .from('completed_tax_returns')
        .insert({
          user_id: selectedTaxReturn.user_id,
          tax_year: selectedTaxReturn.tax_year,
          file_name: safeName,
          file_path: filePath,
          file_type: 'application/pdf',
          status: 'available',
          uploaded_by_admin_id: userData.user?.id
        });

      if (dbError) {
        // Clean up uploaded file if database insert fails
        console.error('Database error, cleaning up uploaded file:', dbError);
        await supabase.storage.from('completed-tax-returns').remove([filePath]);
        throw new Error(`Datenbank-Fehler: ${dbError.message}`);
      }

      // Update tax return status to success
      const { error: statusError } = await supabase
        .from('tax_returns')
        .update({ 
          status: 'success',
          workflow_step: 'completed'
        })
        .eq('id', selectedTaxReturn.id);

      if (statusError) {
        console.error('Error updating tax return status to completed:', statusError);
        // Don't throw error here as the upload was successful
      }

      toast({
        title: "Erfolgreich hochgeladen",
        description: `Steuererklärung für ${selectedTaxReturn.tax_year} wurde erfolgreich abgeschlossen.`
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      setSelectedTaxReturn(null);
      fetchPaidTaxReturns();
    } catch (error: any) {
      console.error('Error uploading completed tax return:', error);
      toast({
        title: "Upload-Fehler",
        description: error.message || "Die Steuererklärung konnte nicht hochgeladen werden.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'outline';
      case 'processing':
        return 'default';
      case 'completed':
        return 'default';
      default:
        return 'outline';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Bereit zur Erstellung';
      case 'processing':
        return 'In Bearbeitung';
      case 'completed':
        return 'Fertiggestellt';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-black">Lädt bezahlte Steuererklärungen...</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6 bg-white min-h-screen">
      <AdminWelcomeHeader
        title="Steuererklärung bearbeiten"
        subtitle={`Bezahlte Steuererklärungen bearbeiten und abschließen (${paidTaxReturns.length})`}
        badge={{
          text: `${paidTaxReturns.length} Aufträge`,
          variant: 'secondary'
        }}
        onRefresh={fetchPaidTaxReturns}
      />

      {paidTaxReturns.length === 0 ? (
        <Card className="w-full transition-all duration-300 cursor-pointer hover:scale-[1.02] group border-2 border-white shadow-lg shadow-black/10" style={{
          backgroundColor: 'rgba(255, 255, 255, 0.43)',
          borderRadius: '20px'
        }}>
          <CardContent className="flex flex-col items-center justify-center py-12" style={{
            borderRadius: '20px'
          }}>
            <FileText className="h-12 w-12 text-gray-500 mb-4" />
            <h3 className="text-lg font-semibold text-black mb-2">
              Keine bezahlten Steuererklärungen vorhanden
            </h3>
            <p className="text-gray-600 text-center">
              Es gibt derzeit keine bezahlten Steuererklärungen, die zur Bearbeitung bereit sind.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {paidTaxReturns.map((taxReturn) => (
            <Card 
              key={taxReturn.id} 
              className="w-full transition-all duration-300 cursor-pointer hover:scale-[1.02] group border-2 border-white shadow-lg shadow-black/10"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.43)',
                borderRadius: '20px'
              }}
            >
              <CardHeader className="pb-3" style={{ borderRadius: '20px 20px 0 0' }}>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-black text-lg">
                    Steuerjahr {taxReturn.tax_year}
                  </CardTitle>
                  <Badge 
                    variant="secondary"
                    style={{
                      background: 'rgba(34, 197, 94, 0.2)',
                      borderRadius: '12px',
                      borderColor: 'rgba(34, 197, 94, 0.3)',
                      color: '#000000'
                    }}
                    className="border border-white/20 backdrop-blur-sm"
                  >
                    {getStatusText(taxReturn.status)}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 relative overflow-hidden" style={{
                borderRadius: '0 0 20px 20px'
              }}>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="h-4 w-4" />
                    <div>
                      <p className="font-medium">{taxReturn.tax_filer_name}</p>
                      <p className="text-sm text-gray-600">{taxReturn.user_email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="h-4 w-4" />
                    <div>
                      <span className="text-sm">Bezahlt am: </span>
                      <span className="text-sm">
                        {new Date(taxReturn.payment_date).toLocaleDateString('de-DE')}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="h-4 w-4 text-green-400" />
                    <span className="text-sm">Bezahlung bestätigt</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 pt-4">
                  <Link to={`/admin/user/${taxReturn.user_id}?year=${taxReturn.tax_year}${taxReturn.tax_filer_id ? `&filer=${taxReturn.tax_filer_id}` : ''}`} className="w-full">
                    <Button 
                      className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]"
                      style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
                    >
                      Benutzer ansehen
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fertige Steuererklärung hochladen</DialogTitle>
            <DialogDescription>
              Laden Sie die fertige Steuererklärung für {selectedTaxReturn?.user_name} ({selectedTaxReturn?.tax_year}) hoch.
              Nach dem Upload wird die Steuererklärung als abgeschlossen markiert.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right text-gray-900">
                PDF-Datei
              </Label>
              <Input
                id="file"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                className="col-span-3"
              />
            </div>
            {selectedFile && (
              <div className="text-sm text-gray-600">
                Ausgewählte Datei: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUploadComplete} disabled={uploading || !selectedFile}>
              {uploading ? 'Wird hochgeladen...' : 'Hochladen & Abschließen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaxReturnCreation;
