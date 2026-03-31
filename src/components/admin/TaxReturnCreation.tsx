import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/modern-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from '@/hooks/use-toast';
import { Calendar, User, CheckCircle, FileText, Zap, Search, X, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

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
  express_service: boolean;
}

const TaxReturnCreation: React.FC = () => {
  const [paidTaxReturns, setPaidTaxReturns] = useState<PaidTaxReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedTaxReturn, setSelectedTaxReturn] = useState<PaidTaxReturn | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing'>('all');
  const [expressFilter, setExpressFilter] = useState(false);
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

      // Sort: express service first, then by payment date descending
      taxReturnsWithUserInfo.sort((a, b) => {
        if (a.express_service && !b.express_service) return -1;
        if (!a.express_service && b.express_service) return 1;
        return new Date(b.payment_date || 0).getTime() - new Date(a.payment_date || 0).getTime();
      });

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
        <div className="text-foreground">Lädt bezahlte Steuererklärungen...</div>
      </div>
    );
  }

  const filteredTaxReturns = paidTaxReturns.filter((tr) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = !query || 
      tr.user_name.toLowerCase().includes(query) || 
      tr.user_email.toLowerCase().includes(query) || 
      tr.tax_year.includes(query) ||
      tr.tax_filer_name.toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'all' || tr.status === statusFilter;
    const matchesExpress = !expressFilter || tr.express_service;
    return matchesSearch && matchesStatus && matchesExpress;
  });

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || expressFilter;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Steuererklärungen
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {paidTaxReturns.length} bezahlte Aufträge zur Bearbeitung
          </p>
        </div>
        <button
          onClick={fetchPaidTaxReturns}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Aktualisieren
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder="Suchen..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 rounded-lg bg-background border-border/60 text-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div className="flex gap-1 bg-muted/40 rounded-lg p-0.5">
          {[
            { key: 'all' as const, label: 'Alle' },
            { key: 'pending' as const, label: 'Bereit' },
            { key: 'processing' as const, label: 'In Bearbeitung' },
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setStatusFilter(f.key)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium transition-all",
                statusFilter === f.key
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setExpressFilter(!expressFilter)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all border",
            expressFilter
              ? "border-foreground/20 bg-foreground/[0.06] text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Zap className="h-3 w-3" />
          Express
        </button>
      </div>

      {hasActiveFilters && (
        <p className="text-xs text-muted-foreground">
          {filteredTaxReturns.length} von {paidTaxReturns.length} Ergebnissen
          <button onClick={() => { setSearchQuery(''); setStatusFilter('all'); setExpressFilter(false); }} className="text-foreground hover:underline ml-2">
            Zurücksetzen
          </button>
        </p>
      )}

      {/* Content */}
      {paidTaxReturns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Keine Aufträge</p>
          <p className="text-xs text-muted-foreground">
            Es gibt derzeit keine bezahlten Steuererklärungen zur Bearbeitung.
          </p>
        </div>
      ) : filteredTaxReturns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Search className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-medium text-foreground mb-1">Keine Ergebnisse</p>
          <p className="text-xs text-muted-foreground">
            Versuche einen anderen Suchbegriff oder setze die Filter zurück.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredTaxReturns.map((taxReturn) => (
            <Link
              key={taxReturn.id}
              to={`/admin/user/${taxReturn.user_id}?year=${taxReturn.tax_year}${taxReturn.tax_filer_id ? `&filer=${taxReturn.tax_filer_id}` : ''}`}
              className="group block"
            >
              <div className="bg-white/60 backdrop-blur-xl border border-white/40 rounded-2xl p-5 shadow-sm hover:bg-white/80 transition-all duration-150">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-base font-semibold text-foreground tracking-tight">
                      {taxReturn.tax_year}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {taxReturn.tax_filer_name}
                    </p>
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium px-2 py-0.5 rounded-full",
                    taxReturn.status === 'processing'
                      ? "bg-foreground/[0.06] text-foreground"
                      : "bg-muted text-muted-foreground"
                  )}>
                    {getStatusText(taxReturn.status)}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <User className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span className="truncate">{taxReturn.user_email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground/50" />
                    <span>Bezahlt am {new Date(taxReturn.payment_date).toLocaleDateString('de-CH')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-500/70" />
                    <span>Zahlung bestätigt</span>
                  </div>
                  {taxReturn.express_service && (
                    <div className="flex items-center gap-2 text-xs text-foreground/70">
                      <Zap className="h-3.5 w-3.5 text-amber-500" />
                      <span className="font-medium">Express</span>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Steuererklärung hochladen</DialogTitle>
            <DialogDescription>
              Fertige Steuererklärung für {selectedTaxReturn?.user_name} ({selectedTaxReturn?.tax_year}) hochladen.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="file" className="text-right text-sm">
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
              <p className="text-xs text-muted-foreground">
                {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          <DialogFooter>
            <button
              onClick={() => setUploadDialogOpen(false)}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={handleUploadComplete}
              disabled={uploading || !selectedFile}
              className="px-4 py-2 text-sm font-medium bg-foreground text-background rounded-lg hover:opacity-90 disabled:opacity-50 transition-all"
            >
              {uploading ? 'Lädt...' : 'Hochladen'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaxReturnCreation;
