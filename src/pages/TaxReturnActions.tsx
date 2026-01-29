import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Eye, AlertTriangle, Upload, Loader2, ArrowLeft, CheckCircle, PenTool } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from '@/contexts/I18nContext';
import { ModernUploadDialog, ModernUploadDialogContent, ModernUploadDialogHeader, ModernUploadDialogTitle } from "@/components/ui/modern-upload-dialog";
import { SignatureDialog } from "@/components/signature/SignatureDialog";
import { CreateTicketDialog } from "@/components/tickets/CreateTicketDialog";

interface UserProfile {
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth?: string;
}

export default function TaxReturnActions() {
  const { completedTaxReturnId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { t } = useI18n();

  const [loading, setLoading] = React.useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = React.useState(false);
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = React.useState(false);
  const [signatureDialogOpen, setSignatureDialogOpen] = React.useState(false);
  const [ticketDialogOpen, setTicketDialogOpen] = React.useState(false);

  const [completedTaxReturn, setCompletedTaxReturn] = React.useState<any>(null);
  const [definitiveTaxBill, setDefinitiveTaxBill] = React.useState<any>(null);
  const [taxYear, setTaxYear] = React.useState<string>('');
  const [userId, setUserId] = React.useState<string>('');
  const [supportTickets, setSupportTickets] = React.useState<any[]>([]);
  const [userProfile, setUserProfile] = React.useState<UserProfile | null>(null);
  const [signatureData, setSignatureData] = React.useState<any>(null);

  React.useEffect(() => {
    loadData();
  }, [completedTaxReturnId]);

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

      // Get user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('first_name, last_name, email, date_of_birth')
        .eq('id', user.id)
        .single();

      if (!profileError && profile) {
        setUserProfile(profile as UserProfile);
      }

      // Get completed tax return by ID
      const { data: completed, error: completedError } = await supabase
        .from('completed_tax_returns')
        .select('*')
        .eq('id', completedTaxReturnId)
        .eq('user_id', user.id)
        .single();

      if (completedError) throw completedError;
      setCompletedTaxReturn(completed);
      setTaxYear(completed.tax_year);

      // Check if already signed - fetch signature data
      const { data: signature, error: signatureError } = await supabase
        .from('tax_return_signatures')
        .select('*')
        .eq('completed_tax_return_id', completedTaxReturnId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (!signatureError && signature) {
        setSignatureData(signature);
      }

      // Get definitive tax bill
      const { data: bill, error: billError } = await supabase
        .from('definitive_tax_bills')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', completed.tax_year)
        .maybeSingle();

      if (billError) throw billError;
      setDefinitiveTaxBill(bill);

      // Get support tickets for this tax year
      const { data: tickets, error: ticketsError } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .eq('completed_tax_return_id', completed.id)
        .order('created_at', { ascending: false });

      if (!ticketsError && tickets) {
        setSupportTickets(tickets);
      }

    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        variant: "destructive",
        title: t.taxReturnActions.error,
        description: error?.message || t.taxReturnActions.dataLoadError
      });
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTicket = () => {
    setTicketDialogOpen(true);
  };

  const handleTicketCreated = () => {
    loadData();
  };

  const handleDownload = async () => {
    if (!completedTaxReturn) return;

    try {
      // Use signed_pdf_path if available, otherwise fall back to file_path
      const filePath = completedTaxReturn.signed_pdf_path || completedTaxReturn.file_path;
      const folderPath = filePath.split('/').slice(0, -1).join('/') || '';
      const searchFileName = filePath.split('/').pop() || '';

      const { data: fileList, error: listError } = await supabase.storage
        .from('completed-tax-returns')
        .list(folderPath, { search: searchFileName });

      if (listError) throw listError;

      if (!fileList || fileList.length === 0) {
        toast({
          variant: "destructive",
          title: t.taxReturnActions.fileNotFound,
          description: t.taxReturnActions.fileNotFoundDescription
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('completed-tax-returns')
        .download(filePath);

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
        title: t.taxReturnActions.downloadSuccess,
        description: t.taxReturnActions.downloadSuccessDescription.replace('{fileName}', completedTaxReturn.file_name)
      });
    } catch (error: any) {
      console.error('Download error:', error);
      toast({
        variant: "destructive",
        title: t.taxReturnActions.downloadFailed,
        description: error?.message || t.taxReturnActions.downloadFailedDescription
      });
    }
  };

  const handleView = async () => {
    if (!completedTaxReturn) return;

    try {
      // Use signed_pdf_path if available, otherwise fall back to file_path
      const filePath = completedTaxReturn.signed_pdf_path || completedTaxReturn.file_path;
      const folderPath = filePath.split('/').slice(0, -1).join('/') || '';
      const searchFileName = filePath.split('/').pop() || '';

      const { data: fileList, error: listError } = await supabase.storage
        .from('completed-tax-returns')
        .list(folderPath, { search: searchFileName });

      if (listError) throw listError;

      if (!fileList || fileList.length === 0) {
        toast({
          variant: "destructive",
          title: t.taxReturnActions.fileNotFound,
          description: t.taxReturnActions.fileNotFoundDescription
        });
        return;
      }

      const { data, error } = await supabase.storage
        .from('completed-tax-returns')
        .createSignedUrl(filePath, 3600);

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
      toast({
        title: t.taxReturnActions.fileOpened,
        description: t.taxReturnActions.fileOpenedDescription.replace('{fileName}', completedTaxReturn.file_name)
      });
    } catch (error: any) {
      console.error('View error:', error);
      toast({
        variant: "destructive",
        title: t.taxReturnActions.viewFailed,
        description: error?.message || t.taxReturnActions.viewFailedDescription
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
        title: t.taxReturnActions.downloadSuccess,
        description: t.taxReturnActions.downloadSuccessDescription.replace('{fileName}', definitiveTaxBill.file_name)
      });
    } catch (error: any) {
      console.error('Tax bill download error:', error);
      toast({
        variant: "destructive",
        title: t.taxReturnActions.downloadFailed,
        description: error?.message || t.taxReturnActions.downloadFailedDescription
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
        title: t.taxReturnActions.billOpened,
        description: t.taxReturnActions.billOpenedDescription.replace('{fileName}', definitiveTaxBill.file_name)
      });
    } catch (error: any) {
      console.error('Tax bill view error:', error);
      toast({
        variant: "destructive",
        title: t.taxReturnActions.viewFailed,
        description: error?.message || t.taxReturnActions.viewFailedDescription
      });
    }
  };

  const handleTaxBillUpload = async () => {
    if (!selectedFile) {
      toast({
        title: t.taxReturnActions.error,
        description: t.taxReturnActions.selectFileFirst,
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
        title: t.taxReturnActions.uploadSuccess,
        description: t.taxReturnActions.uploadSuccessDescription,
      });

      setUploadDialogOpen(false);
      setSelectedFile(null);
      loadData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({
        title: t.taxReturnActions.uploadFailed,
        description: error?.message || t.taxReturnActions.uploadFailedDescription,
        variant: "destructive",
      });
    } finally {
      setUploadLoading(false);
    }
  };

  const handleSignatureComplete = () => {
    loadData();
  };

  const isSigned = signatureData?.status === 'signed' || completedTaxReturn?.signature_status === 'signed';
  const needsSignature = completedTaxReturn && !isSigned;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!completedTaxReturn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-foreground">{t.taxReturnActions.notFound}</h1>
          <Button 
            onClick={() => navigate('/')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full"
          >
            {t.taxReturnActions.backToOverview}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl">
          <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <button 
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-border/80 hover:bg-muted transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-semibold text-foreground flex-1 text-center pr-10">
              {t.taxReturnActions.title} {taxYear}
            </h1>
          </div>
        </div>
        
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 md:pb-6 space-y-6 relative z-10">
          {/* Signature Card - Show prominently if needs signature */}
          {needsSignature && (
            <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 shadow-lg transition-transform duration-500 hover:scale-[1.005]">
              <div className="relative z-10 flex flex-col h-full p-6">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 border border-white/30 cursor-default">
                    <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse"></div>
                    <span className="text-xs font-medium tracking-wide text-white uppercase">
                      {t.taxReturnActions.actionRequired}
                    </span>
                  </div>
                </div>
                <div className="max-w-2xl mb-4">
                  <h2 className="font-medium tracking-tight text-white text-2xl mb-2 leading-tight">
                    {t.taxReturnActions.signatureRequired}
                  </h2>
                  <p className="text-white/80 text-sm">
                    {t.taxReturnActions.signatureDescription}
                  </p>
                </div>
                <div className="mt-auto">
                  <button 
                    onClick={() => setSignatureDialogOpen(true)}
                    className="group relative overflow-hidden bg-white text-primary rounded-full font-semibold text-sm sm:text-base hover:bg-white/90 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                    style={{ boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)' }}
                  >
                    <PenTool className="w-5 h-5" />
                    <span>{t.taxReturnActions.signNow}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Signed Status Card */}
          {isSigned && (
            <div className="relative w-full overflow-hidden rounded-[2rem] bg-emerald-50 border border-emerald-200 shadow-sm">
              <div className="relative z-10 flex items-center gap-4 p-6">
                <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-medium text-emerald-900">{t.taxReturnActions.electronicallySigned}</h3>
                  <p className="text-sm text-emerald-700">
                    {signatureData?.signed_at 
                      ? t.taxReturnActions.signedAt.replace('{date}', new Date(signatureData.signed_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
                      : t.taxReturnActions.signedDescription
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Abgeschlossene Steuererklärung - nur anzeigen wenn signiert */}
          {isSigned && (
          <div className="relative w-full overflow-hidden rounded-[2rem] bg-background border border-border shadow-sm transition-transform duration-500 hover:scale-[1.005]">
            <div className="relative z-10 flex flex-col h-full p-6">
              <div className="mb-4">
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 border border-emerald-200 cursor-default">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                  <span className="text-xs font-medium tracking-wide text-emerald-700 uppercase">
                    {t.taxReturnActions.completed}
                  </span>
                </div>
              </div>
              <div className="max-w-2xl mb-6">
                <h2 className="font-medium tracking-tight text-foreground text-2xl mb-0 leading-tight">
                  {t.taxReturnActions.taxYear} {taxYear}
                </h2>
              </div>
              <div className="mt-auto flex flex-col gap-3">
                <button 
                  onClick={handleView}
                  className="group relative overflow-hidden bg-muted text-foreground rounded-full font-semibold text-sm sm:text-base border border-border hover:bg-muted/80 hover:border-border/80 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                >
                  <Eye className="w-5 h-5" />
                  <span>{t.taxReturnActions.view}</span>
                </button>
                <button 
                  onClick={handleDownload}
                  className="group relative overflow-hidden bg-muted text-foreground rounded-full font-semibold text-sm sm:text-base border border-border hover:bg-muted/80 hover:border-border/80 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                >
                  <Download className="w-5 h-5" />
                  <span>{t.taxReturnActions.download}</span>
                </button>
              </div>
            </div>
          </div>
          )}

          {/* Definitive Steuerrechnung - nur anzeigen wenn signiert */}
          {isSigned && (
          <div className="relative w-full overflow-hidden rounded-[2rem] bg-background border border-border shadow-sm transition-transform duration-500 hover:scale-[1.005]">
            <div className="relative z-10 flex flex-col h-full p-6">
              <div className="mb-4">
                {definitiveTaxBill ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-1.5 border border-emerald-200 cursor-default">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500"></div>
                    <span className="text-xs font-medium tracking-wide text-emerald-700 uppercase">
                      {t.taxReturnActions.available}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-1.5 border border-amber-200 cursor-default">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-500"></div>
                    <span className="text-xs font-medium tracking-wide text-amber-700 uppercase">
                      {t.taxReturnActions.pending}
                    </span>
                  </div>
                )}
              </div>
              <div className="max-w-2xl mb-6">
                <h2 className="font-medium tracking-tight text-foreground text-2xl mb-0 leading-tight">
                  {t.taxReturnActions.definitiveTaxBill}
                </h2>
              </div>
              
              {definitiveTaxBill ? (
                <div className="mt-auto flex flex-col gap-3">
                  <button 
                    onClick={handleTaxBillView}
                    className="group relative overflow-hidden bg-muted text-foreground rounded-full font-semibold text-sm sm:text-base border border-border hover:bg-muted/80 hover:border-border/80 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  >
                    <Eye className="w-5 h-5" />
                    <span>{t.taxReturnActions.viewBill}</span>
                  </button>
                  <button 
                    onClick={handleTaxBillDownload}
                    className="group relative overflow-hidden bg-muted text-foreground rounded-full font-semibold text-sm sm:text-base border border-border hover:bg-muted/80 hover:border-border/80 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  >
                    <Download className="w-5 h-5" />
                    <span>{t.taxReturnActions.downloadBill}</span>
                  </button>
                </div>
              ) : (
                <div className="mt-auto flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t.taxReturnActions.noBillYet}
                  </p>
                  <button 
                    onClick={() => setUploadDialogOpen(true)}
                    className="group relative overflow-hidden bg-muted text-foreground rounded-full font-semibold text-sm sm:text-base border border-border hover:bg-muted/80 hover:border-border/80 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  >
                    <Upload className="w-5 h-5" />
                    <span>{t.taxReturnActions.uploadBill}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          )}

          {/* Problem melden - nur vor Unterschrift */}
          {!isSigned && (
          <div className="relative w-full overflow-hidden rounded-[2rem] bg-background border border-border shadow-sm transition-transform duration-500 hover:scale-[1.005]">
            <div className="relative z-10 flex flex-col h-full p-6">
              <div className="mb-4">
                {supportTickets.length > 0 ? (
                  <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 border border-primary/20 cursor-default">
                    <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                    <span className="text-xs font-medium tracking-wide text-primary uppercase">
                      {supportTickets.length} {supportTickets.length === 1 ? t.taxReturnActions.ticket : t.taxReturnActions.tickets}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-1.5 border border-border cursor-default">
                    <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground"></div>
                    <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      {t.taxReturnActions.support}
                    </span>
                  </div>
                )}
              </div>
              <div className="max-w-2xl mb-6">
                <h2 className="font-medium tracking-tight text-foreground text-2xl mb-0 leading-tight">
                  {t.taxReturnActions.needHelp}
                </h2>
              </div>
              
              {supportTickets.length > 0 ? (
                <div className="mt-auto flex flex-col gap-3">
                  <div className="space-y-2 mb-3">
                    {supportTickets.map((ticket) => (
                      <div 
                        key={ticket.id}
                        className="p-3 bg-muted rounded-xl border border-border"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium text-sm text-foreground">{ticket.title}</p>
                            <p className="text-xs text-muted-foreground">
                              Status: {
                                ticket.status === 'open' ? t.taxReturnActions.statusOpen :
                                ticket.status === 'in_progress' ? t.taxReturnActions.statusInProgress :
                                ticket.status === 'resolved' ? t.taxReturnActions.statusResolved :
                                t.taxReturnActions.statusClosed
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button 
                    onClick={() => navigate(`/tickets?year=${taxYear}`)}
                    className="group relative overflow-hidden bg-muted text-foreground rounded-full font-semibold text-sm sm:text-base border border-border hover:bg-muted/80 hover:border-border/80 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  >
                    <Eye className="w-5 h-5" />
                    <span>{t.taxReturnActions.viewTickets}</span>
                  </button>
                  <button 
                    onClick={handleCreateTicket}
                    className="group relative overflow-hidden bg-muted text-foreground rounded-full font-semibold text-sm sm:text-base border border-border hover:bg-muted/80 hover:border-border/80 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    <span>{t.taxReturnActions.newTicket}</span>
                  </button>
                </div>
              ) : (
                <div className="mt-auto flex flex-col gap-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t.taxReturnActions.contactUs}
                  </p>
                  <button 
                    onClick={handleCreateTicket}
                    className="group relative overflow-hidden bg-muted text-foreground rounded-full font-semibold text-sm sm:text-base border border-border hover:bg-muted/80 hover:border-border/80 transition-all duration-300 w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  >
                    <AlertTriangle className="w-5 h-5" />
                    <span>{t.taxReturnActions.reportProblem}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <ModernUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <ModernUploadDialogContent className="sm:max-w-md bg-background border border-border">
          <ModernUploadDialogHeader>
            <ModernUploadDialogTitle className="text-foreground">{t.taxReturnActions.uploadTaxBill}</ModernUploadDialogTitle>
          </ModernUploadDialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="tax-bill-upload" className="text-muted-foreground">{t.taxReturnActions.selectFile}</Label>
              <Input
                id="tax-bill-upload"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="mt-2 bg-muted border-border text-foreground file:text-foreground file:bg-muted file:border-0 file:rounded-md"
              />
            </div>
            <div className="flex gap-3 flex-col sm:flex-row">
              <Button 
                variant="outline" 
                onClick={() => setUploadDialogOpen(false)} 
                className="w-full bg-muted hover:bg-muted/80 border border-border text-foreground font-medium h-12 rounded-full"
              >
                {t.taxReturnActions.cancel}
              </Button>
              <Button 
                onClick={handleTaxBillUpload} 
                disabled={!selectedFile || uploadLoading} 
                className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground border-0"
                style={{
                  boxShadow: '0 0 20px rgba(29, 100, 255, 0.4)'
                }}
              >
                {uploadLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t.taxReturnActions.upload}
              </Button>
            </div>
          </div>
        </ModernUploadDialogContent>
      </ModernUploadDialog>

      {/* Signature Dialog */}
      {userProfile && completedTaxReturn && (
        <SignatureDialog
          open={signatureDialogOpen}
          onOpenChange={setSignatureDialogOpen}
          completedTaxReturn={completedTaxReturn}
          userProfile={userProfile}
          onSignatureComplete={handleSignatureComplete}
        />
      )}

      {/* Ticket Dialog */}
      {completedTaxReturn && (
        <CreateTicketDialog
          isOpen={ticketDialogOpen}
          onClose={() => setTicketDialogOpen(false)}
          completedTaxReturnId={completedTaxReturn.id}
          taxYear={taxYear}
        />
      )}
    </>
  );
}
