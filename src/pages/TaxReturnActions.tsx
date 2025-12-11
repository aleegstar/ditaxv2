import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Eye, AlertTriangle, Upload, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from '@/contexts/I18nContext';
import { ModernUploadDialog, ModernUploadDialogContent, ModernUploadDialogHeader, ModernUploadDialogTitle } from "@/components/ui/modern-upload-dialog";
import { SubpageHeader } from '@/components/ui/subpage-header';

export default function TaxReturnActions() {
  const { taxReturnId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [loading, setLoading] = React.useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = React.useState(false);

  const [completedTaxReturn, setCompletedTaxReturn] = React.useState<any>(null);
  const [definitiveTaxBill, setDefinitiveTaxBill] = React.useState<any>(null);
  const [taxYear, setTaxYear] = React.useState<string>('');
  const [userId, setUserId] = React.useState<string>('');
  const [supportTickets, setSupportTickets] = React.useState<any[]>([]);

  React.useEffect(() => {
    loadData();
  }, [taxReturnId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUserId(user.id);

      // Get tax return
      const { data: taxReturn, error: taxReturnError } = await supabase
        .from('tax_returns')
        .select('*')
        .eq('id', taxReturnId)
        .eq('user_id', user.id)
        .single();

      if (taxReturnError) throw taxReturnError;
      setTaxYear(taxReturn.tax_year);

      // Get completed tax return
      const { data: completed, error: completedError } = await supabase
        .from('completed_tax_returns')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', taxReturn.tax_year)
        .maybeSingle();

      if (completedError) throw completedError;
      setCompletedTaxReturn(completed);

      // Get definitive tax bill
      const { data: bill, error: billError } = await supabase
        .from('definitive_tax_bills')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', taxReturn.tax_year)
        .maybeSingle();

      if (billError) throw billError;
      setDefinitiveTaxBill(bill);

      // Get support tickets for this tax year
      if (completed) {
        const { data: tickets, error: ticketsError } = await supabase
          .from('support_tickets')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed_tax_return_id', completed.id)
          .order('created_at', { ascending: false });

        if (!ticketsError && tickets) {
          setSupportTickets(tickets);
        }
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: "Fehler",
        description: error?.message || "Daten konnten nicht geladen werden."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = () => {
    navigate(`/create-ticket/${completedTaxReturn?.id}/${taxYear}`);
  };

  const handleDownload = async () => {
    if (!completedTaxReturn) return;

    try {
      const folderPath = completedTaxReturn.file_path.split('/').slice(0, -1).join('/') || '';
      const searchFileName = completedTaxReturn.file_path.split('/').pop() || '';

      const { data: fileList, error: listError } = await supabase.storage
        .from('completed-tax-returns')
        .list(folderPath, { search: searchFileName });

      if (listError) throw listError;

      if (!fileList || fileList.length === 0) {
        toast({
          variant: "destructive",
          title: "Datei nicht gefunden",
          description: "Die Datei wurde im Speicher nicht gefunden."
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('completed-tax-returns')
        .download(completedTaxReturn.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = completedTaxReturn.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download erfolgreich",
        description: `${completedTaxReturn.file_name} wurde heruntergeladen.`
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: "Download fehlgeschlagen",
        description: error?.message || "Fehler beim Herunterladen."
      });
    }
  };

  const handleView = async () => {
    if (!completedTaxReturn) return;

    try {
      const folderPath = completedTaxReturn.file_path.split('/').slice(0, -1).join('/') || '';
      const searchFileName = completedTaxReturn.file_path.split('/').pop() || '';

      const { data: fileList, error: listError } = await supabase.storage
        .from('completed-tax-returns')
        .list(folderPath, { search: searchFileName });

      if (listError) throw listError;

      if (!fileList || fileList.length === 0) {
        toast({
          variant: "destructive",
          title: "Datei nicht gefunden",
          description: "Die Datei wurde im Speicher nicht gefunden."
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('completed-tax-returns')
        .createSignedUrl(completedTaxReturn.file_path, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
      toast({
        title: "Datei geöffnet",
        description: `${completedTaxReturn.file_name} wurde in einem neuen Tab geöffnet.`
      });
    } catch (error: any) {
      console.error('View error:', error);
      toast({
        variant: "destructive",
        title: "Anzeige fehlgeschlagen",
        description: error?.message || "Fehler beim Öffnen der Datei."
      });
    }
  };

  const handleTaxBillDownload = async () => {
    if (!definitiveTaxBill) return;

    try {
      const { data, error } = await supabase.storage
        .from('definitive-tax-bills')
        .download(definitiveTaxBill.file_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = definitiveTaxBill.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download erfolgreich",
        description: `${definitiveTaxBill.file_name} wurde heruntergeladen.`
      });
    } catch (error: any) {
      console.error('Tax bill download error:', error);
      toast({
        variant: "destructive",
        title: "Download fehlgeschlagen",
        description: error?.message || "Fehler beim Herunterladen der Steuerrechnung."
      });
    }
  };

  const handleTaxBillView = async () => {
    if (!definitiveTaxBill) return;

    try {
      const { data, error } = await supabase.storage
        .from('definitive-tax-bills')
        .createSignedUrl(definitiveTaxBill.file_path, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
      toast({
        title: "Steuerrechnung geöffnet",
        description: `${definitiveTaxBill.file_name} wurde in einem neuen Tab geöffnet.`
      });
    } catch (error: any) {
      console.error('Tax bill view error:', error);
      toast({
        variant: "destructive",
        title: "Anzeige fehlgeschlagen",
        description: error?.message || "Fehler beim Öffnen der Steuerrechnung."
      });
    }
  };

  const handleTaxBillUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "Fehler",
        description: "Bitte wähle eine Datei aus.",
        variant: "destructive",
      });
      return;
    }

    setUploadLoading(true);

    try {
      const filePath = `${userId}/${taxYear}/${selectedFile.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from('definitive-tax-bills')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      const { error: insertError } = await supabase
        .from('definitive_tax_bills')
        .insert({
          user_id: userId,
          tax_year: taxYear,
          file_name: selectedFile.name,
          file_path: filePath,
          file_type: selectedFile.type,
          uploaded_by_user_id: userId,
        });

      if (insertError) throw insertError;

      toast({
        title: "Erfolg",
        description: "Steuerrechnung wurde erfolgreich hochgeladen.",
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      loadData(); // Reload to show uploaded bill
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: "Fehler",
        description: error?.message || "Upload fehlgeschlagen.",
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!completedTaxReturn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-muted to-background p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Keine Steuererklärung gefunden</h1>
          <Button onClick={() => navigate('/')}>Zurück zur Übersicht</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-white">
        {/* Header */}
        <SubpageHeader 
          title={`Steuererklärung ${taxYear}`}
          onBack={() => navigate('/')}
        />
        
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-6 space-y-6">
            {/* Abgeschlossene Steuererklärung */}
            <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-white text-slate-600 shadow-[0_32px_64px_-12px_rgba(16,24,40,0.06)] border border-slate-100 transition-transform duration-500 hover:scale-[1.005]">
              <div className="relative z-10 flex flex-col h-full p-6">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 border border-emerald-100/50 cursor-default">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-medium tracking-wide text-emerald-700 uppercase">
                      Abgeschlossen
                    </span>
                  </div>
                </div>
                <div className="max-w-2xl mb-6">
                  <h2 className="font-medium tracking-tight text-slate-900 text-2xl mb-0 leading-tight">
                    Steuerjahr {taxYear}
                  </h2>
                </div>
                <div className="mt-auto flex flex-col gap-3">
                  <button 
                    onClick={handleView}
                    className="group relative overflow-hidden bg-slate-50 text-slate-900 rounded-full font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  >
                    <Eye className="w-5 h-5" />
                    <span>Ansehen</span>
                  </button>
                  <button 
                    onClick={handleDownload}
                    className="group relative overflow-hidden bg-slate-50 text-slate-900 rounded-full font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  >
                    <Download className="w-5 h-5" />
                    <span>Herunterladen</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Definitive Steuerrechnung */}
            <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-white text-slate-600 shadow-[0_32px_64px_-12px_rgba(16,24,40,0.06)] border border-slate-100 transition-transform duration-500 hover:scale-[1.005]">
              <div className="relative z-10 flex flex-col h-full p-6">
                <div className="mb-4">
                  {definitiveTaxBill ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 border border-emerald-100/50 cursor-default">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                      <span className="text-xs font-medium tracking-wide text-emerald-700 uppercase">
                        Vorhanden
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-1.5 border border-amber-100/50 cursor-default">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                      <span className="text-xs font-medium tracking-wide text-amber-700 uppercase">
                        Ausstehend
                      </span>
                    </div>
                  )}
                </div>
                <div className="max-w-2xl mb-6">
                  <h2 className="font-medium tracking-tight text-slate-900 text-2xl mb-0 leading-tight">
                    Definitive Steuerrechnung
                  </h2>
                </div>
                
                {definitiveTaxBill ? (
                  <div className="mt-auto flex flex-col gap-3">
                    <button 
                      onClick={handleTaxBillView}
                      className="group relative overflow-hidden bg-slate-50 text-slate-900 rounded-full font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                    >
                      <Eye className="w-5 h-5" />
                      <span>Rechnung ansehen</span>
                    </button>
                    <button 
                      onClick={handleTaxBillDownload}
                      className="group relative overflow-hidden bg-slate-50 text-slate-900 rounded-full font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                    >
                      <Download className="w-5 h-5" />
                      <span>Rechnung herunterladen</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col gap-3">
                    <p className="text-sm text-slate-500 mb-2">
                      Noch keine Steuerrechnung vorhanden. Lade sie hier hoch, sobald du sie erhalten hast.
                    </p>
                    <button 
                      onClick={() => setUploadDialogOpen(true)}
                      className="group relative overflow-hidden bg-slate-50 text-slate-900 rounded-full font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                    >
                      <Upload className="w-5 h-5" />
                      <span>Steuerrechnung hochladen</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Problem melden */}
            <div className="relative w-full overflow-hidden rounded-[2.5rem] bg-white text-slate-600 shadow-[0_32px_64px_-12px_rgba(16,24,40,0.06)] border border-slate-100 transition-transform duration-500 hover:scale-[1.005]">
              <div className="relative z-10 flex flex-col h-full p-6">
                <div className="mb-4">
                  {supportTickets.length > 0 ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-4 py-1.5 border border-blue-100/50 cursor-default">
                      <div className="h-1.5 w-1.5 rounded-full bg-blue-500"></div>
                      <span className="text-xs font-medium tracking-wide text-blue-700 uppercase">
                        {supportTickets.length} {supportTickets.length === 1 ? 'Ticket' : 'Tickets'}
                      </span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-4 py-1.5 border border-slate-200/50 cursor-default">
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-400"></div>
                      <span className="text-xs font-medium tracking-wide text-slate-600 uppercase">
                        Support
                      </span>
                    </div>
                  )}
                </div>
                <div className="max-w-2xl mb-6">
                  <h2 className="font-medium tracking-tight text-slate-900 text-2xl mb-0 leading-tight">
                    Hilfe benötigt?
                  </h2>
                </div>
                
                {supportTickets.length > 0 ? (
                  <div className="mt-auto flex flex-col gap-3">
                    <div className="space-y-2 mb-3">
                      {supportTickets.map((ticket) => (
                        <div 
                          key={ticket.id}
                          className="p-3 bg-slate-50 rounded-xl border border-slate-200"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm text-slate-900">{ticket.title}</p>
                              <p className="text-xs text-slate-500">
                                Status: {
                                  ticket.status === 'open' ? 'Offen' :
                                  ticket.status === 'in_progress' ? 'In Bearbeitung' :
                                  ticket.status === 'resolved' ? 'Erledigt' :
                                  'Geschlossen'
                                }
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button 
                      onClick={() => navigate(`/tickets?year=${taxYear}`)}
                      className="group relative overflow-hidden bg-slate-50 text-slate-900 rounded-full font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                    >
                      <Eye className="w-5 h-5" />
                      <span>Tickets anzeigen</span>
                    </button>
                    <button 
                      onClick={handleCreateTicket}
                      className="group relative overflow-hidden bg-slate-50 text-slate-900 rounded-full font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span>Neues Ticket</span>
                    </button>
                  </div>
                ) : (
                  <div className="mt-auto flex flex-col gap-3">
                    <p className="text-sm text-slate-500 mb-2">
                      Falls du Fragen hast oder ein Problem feststellst, kannst du uns hier kontaktieren.
                    </p>
                    <button 
                      onClick={handleCreateTicket}
                      className="group relative overflow-hidden bg-slate-50 text-slate-900 rounded-full font-semibold text-sm sm:text-base border border-slate-200 shadow-sm hover:bg-slate-100 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                    >
                      <AlertTriangle className="w-5 h-5" />
                      <span>Problem melden</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Upload Dialog */}
      <ModernUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <ModernUploadDialogContent className="sm:max-w-md">
          <ModernUploadDialogHeader>
            <ModernUploadDialogTitle>Steuerrechnung hochladen</ModernUploadDialogTitle>
          </ModernUploadDialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="tax-bill-upload" style={{ color: 'rgb(26, 32, 44)' }}>PDF-Datei oder Bild auswählen</Label>
              <Input
                id="tax-bill-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-2"
              />
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setUploadDialogOpen(false)} 
                className="w-full bg-white hover:bg-gray-50 border border-[rgb(230,230,230)] font-medium h-12 rounded-full"
                style={{ color: 'rgb(26, 32, 44)' }}
              >
                Abbrechen
              </Button>
              <Button 
                onClick={handleTaxBillUpload} 
                disabled={!selectedFile || uploadLoading} 
                className="w-full h-12 rounded-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white border-0"
                style={{
                  boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px'
                }}
              >
                {uploadLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Hochladen
              </Button>
            </div>
          </div>
        </ModernUploadDialogContent>
      </ModernUploadDialog>
    </>
  );
}
