import React from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Download, Eye, AlertTriangle, Upload, Loader2, ArrowLeft, CheckCircle, PenTool, Check, ExternalLink, ChevronDown } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { sanitizeFileName, validateFilePath } from '@/utils/fileValidation';
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from '@/contexts/I18nContext';
import { cn } from '@/lib/utils';
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
  const [taxReturn, setTaxReturn] = React.useState<any>(null);
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

      // Get tax return (for workflow_step, express_service)
      const { data: tr } = await supabase
        .from('tax_returns')
        .select('*')
        .eq('user_id', user.id)
        .eq('tax_year', completed.tax_year)
        .maybeSingle();
      if (tr) setTaxReturn(tr);

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
      // SECURITY: Sanitize file name to prevent path traversal attacks
      const safeFileName = sanitizeFileName(selectedFile.name);
      const filePath = `${userId}/${taxYear}/${safeFileName}`;
      
      // SECURITY: Validate complete file path
      if (!validateFilePath(filePath)) {
        toast({
          variant: "destructive",
          title: t.taxReturnActions.error,
          description: "Ungültiger Dateipfad erkannt.",
        });
        return;
      }
      
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

  // Timeline steps logic (must be before early returns)
  const timelineSteps = React.useMemo(() => {
    const steps: Array<{ id: string; label: string; description: string; completed: boolean; current?: boolean }> = [
      { id: 'submitted', label: 'Daten eingereicht', description: 'Deine Steuerdaten wurden erfolgreich übermittelt.', completed: true },
      { id: 'documents', label: 'Unterlagen erhalten', description: 'Alle erforderlichen Dokumente sind bei uns eingegangen.', completed: true },
      { id: 'payment', label: 'Zahlung bestätigt', description: 'Deine Zahlung wurde erfolgreich verarbeitet.', completed: true },
      { id: 'processing', label: 'Steuererklärung wird erstellt', description: 'Deine Steuererklärung wird von unserem Team erstellt. Dies dauert zwischen 40–90 Tage.', completed: !!isSigned, current: !isSigned },
    ];

    if (isSigned) {
      steps.push({ id: 'signed', label: 'Unterschrieben', description: 'Deine Steuererklärung wurde elektronisch unterschrieben.', completed: true });
    }

    return steps;
  }, [isSigned]);

  const expressService = taxReturn?.express_service ?? false;
  const firstName = userProfile?.first_name || '';

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
      <div className="min-h-screen bg-white text-slate-800 antialiased">
        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-12 space-y-8">

          {/* Header */}
          <header className="flex items-center justify-between px-1 mb-8 relative">
            <button
              onClick={() => navigate('/')}
              className="w-10 h-10 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-white hover:shadow-sm transition-all duration-300"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="absolute left-1/2 -translate-x-1/2 text-lg font-semibold text-slate-900 tracking-tight">
              {t.taxReturnActions.title} {taxYear}
            </h1>
            <div className="w-10" />
          </header>

          {/* Signature CTA (unsigned) */}
          {needsSignature && (
            <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 shadow-lg p-6">
              <div className="relative z-10">
                <div className="mb-4">
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-1.5 border border-white/30">
                    <div className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                    <span className="text-xs font-medium tracking-wide text-white uppercase">
                      {t.taxReturnActions.actionRequired}
                    </span>
                  </div>
                </div>
                <h2 className="font-medium tracking-tight text-white text-2xl mb-2 leading-tight">
                  {t.taxReturnActions.signatureRequired}
                </h2>
                <p className="text-white/80 text-sm mb-4">{t.taxReturnActions.signatureDescription}</p>
                <button
                  onClick={() => setSignatureDialogOpen(true)}
                  className="group bg-white text-primary rounded-full font-semibold text-sm sm:text-base hover:bg-white/90 transition-all w-full flex items-center justify-center gap-2.5 px-4 py-3"
                  style={{ boxShadow: '0 0 20px rgba(255, 255, 255, 0.3)' }}
                >
                  <PenTool className="w-5 h-5" />
                  <span>{t.taxReturnActions.signNow}</span>
                </button>
              </div>
            </div>
          )}

          {/* Signed Status Banner */}
          {isSigned && (
            <div className="liquid-card rounded-[2rem] p-6 relative overflow-hidden group"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01), 0 12px 32px -4px rgba(0, 0, 0, 0.04)',
              }}
            >
              {/* Subtle green glow */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center gap-5 relative z-10">
                <div className="flex-shrink-0">
                  <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 ring-4 ring-emerald-50">
                    <Check className="w-7 h-7" />
                  </div>
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-semibold text-slate-900 tracking-tight">{t.taxReturnActions.electronicallySigned}</h2>
                  <p className="mt-0.5 text-sm text-slate-500 font-medium tracking-tight">
                    {signatureData?.signed_at
                      ? t.taxReturnActions.signedAt.replace('{date}', new Date(signatureData.signed_at).toLocaleDateString('de-CH', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))
                      : t.taxReturnActions.signedDescription
                    }
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Main Tax Year Card with Pill Buttons */}
          {isSigned && (
            <div className="rounded-[2rem] p-8 space-y-8"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01), 0 12px 32px -4px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-3">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100/80 text-slate-600 text-[11px] font-semibold tracking-wide uppercase border border-slate-200/50">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Abgeschlossen
                  </div>
                  <h2 className="text-3xl font-semibold text-slate-900 tracking-tighter">{t.taxReturnActions.taxYear} {taxYear}</h2>
                </div>
              </div>

              {/* Pill Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Blue "View" Button */}
                <button
                  onClick={handleView}
                  className="group relative h-[4.25rem] w-full rounded-full bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-between pl-6 pr-2 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-[1.01] transition-all duration-300"
                >
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5" />
                    <span className="text-[15px] font-semibold tracking-tight">{t.taxReturnActions.view}</span>
                  </div>
                  <div className="h-[3.25rem] w-[3.25rem] rounded-full bg-white/20 flex items-center justify-center group-hover:bg-white/25 transition-colors backdrop-blur-sm">
                    <ExternalLink className="w-5 h-5 text-white" />
                  </div>
                </button>

                {/* White "Download" Button */}
                <button
                  onClick={handleDownload}
                  className="group relative h-[4.25rem] w-full rounded-full bg-white text-slate-900 flex items-center justify-between pl-6 pr-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-300 border border-slate-100"
                >
                  <div className="flex items-center gap-3">
                    <Download className="w-5 h-5 text-blue-500" />
                    <span className="text-[15px] font-semibold tracking-tight">{t.taxReturnActions.download}</span>
                  </div>
                  <div className="h-[3.25rem] w-[3.25rem] rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                    <ExternalLink className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Definitive Tax Bill Card */}
          {isSigned && (
            <div className="rounded-[2rem] p-8 space-y-6"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01), 0 12px 32px -4px rgba(0, 0, 0, 0.04)',
              }}
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wide uppercase border"
                  style={{
                    background: definitiveTaxBill ? 'rgba(236, 253, 245, 0.8)' : 'rgba(255, 251, 235, 0.8)',
                    color: definitiveTaxBill ? '#047857' : '#b45309',
                    borderColor: definitiveTaxBill ? 'rgba(167, 243, 208, 1)' : 'rgba(253, 230, 138, 1)',
                  }}
                >
                  <span className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    definitiveTaxBill ? "bg-emerald-500" : "bg-amber-500 animate-pulse"
                  )} />
                  {definitiveTaxBill ? t.taxReturnActions.available : t.taxReturnActions.pending}
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-semibold text-slate-900 tracking-tight">{t.taxReturnActions.definitiveTaxBill}</h2>
                  {!definitiveTaxBill && (
                    <p className="text-base text-slate-500 font-normal leading-relaxed">
                      {t.taxReturnActions.noBillYet}
                    </p>
                  )}
                </div>
              </div>

              {definitiveTaxBill ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button
                    onClick={handleTaxBillView}
                    className="group relative h-[4.25rem] w-full rounded-full bg-white text-slate-900 flex items-center justify-between pl-6 pr-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-300 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <Eye className="w-5 h-5 text-blue-500" />
                      <span className="text-[15px] font-semibold tracking-tight">{t.taxReturnActions.viewBill}</span>
                    </div>
                    <div className="h-[3.25rem] w-[3.25rem] rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <ExternalLink className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                  <button
                    onClick={handleTaxBillDownload}
                    className="group relative h-[4.25rem] w-full rounded-full bg-white text-slate-900 flex items-center justify-between pl-6 pr-2 shadow-[0_4px_16px_rgba(0,0,0,0.06)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] hover:scale-[1.01] transition-all duration-300 border border-slate-100"
                  >
                    <div className="flex items-center gap-3">
                      <Download className="w-5 h-5 text-blue-500" />
                      <span className="text-[15px] font-semibold tracking-tight">{t.taxReturnActions.downloadBill}</span>
                    </div>
                    <div className="h-[3.25rem] w-[3.25rem] rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-slate-100 transition-colors">
                      <ExternalLink className="w-5 h-5 text-slate-400" />
                    </div>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setUploadDialogOpen(true)}
                  className="group relative w-full h-16 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-400 transition-all duration-300 flex items-center justify-center gap-3"
                >
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <Upload className="w-4 h-4 text-slate-600" />
                  </div>
                  <span className="text-[15px] font-medium text-slate-700">{t.taxReturnActions.uploadBill}</span>
                </button>
              )}
            </div>
          )}

          {/* Timeline (when not signed) */}
          {!isSigned && (
            <div className="space-y-0 relative">
              {timelineSteps.map((step, idx) => {
                const isLast = idx === timelineSteps.length - 1;
                const isCompleted = step.completed && !step.current;
                const isCurrent = !!step.current;
                const nextCompleted = !isLast && timelineSteps[idx + 1]?.completed && !timelineSteps[idx + 1]?.current;
                const nextIsCurrent = !isLast && !!timelineSteps[idx + 1]?.current;

                return (
                  <div key={step.id} className={cn("flex gap-6 relative", !isLast && "pb-12")}>
                    {!isLast && (
                      <div
                        className={cn(
                          "absolute left-[1.5rem] top-[3.5rem] bottom-[-0.5rem] w-[2px] z-0",
                          isCompleted && nextCompleted ? "bg-blue-500" :
                          isCompleted && nextIsCurrent ? "bg-gradient-to-b from-blue-500 to-slate-200" :
                          "bg-slate-100"
                        )}
                      />
                    )}
                    <div className="relative z-10 flex-shrink-0">
                      {isCompleted ? (
                        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-200">
                          <Check className="w-6 h-6 text-white" />
                        </div>
                      ) : isCurrent ? (
                        <div className="w-12 h-12 rounded-full bg-white border-[3px] border-blue-500 flex items-center justify-center shadow-xl shadow-blue-100 ring-4 ring-blue-50">
                          <div className="w-3.5 h-3.5 bg-blue-600 rounded-full animate-pulse" />
                        </div>
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center">
                          <div className="w-3 h-3 bg-slate-300 rounded-full" />
                        </div>
                      )}
                    </div>
                    <div className={cn("pt-2 w-full", isCurrent && "pt-1.5")}>
                      <div className="flex flex-wrap items-center gap-3 mb-1.5">
                        <h3 className="text-lg font-medium text-slate-900 tracking-tight">{step.label}</h3>
                        {isCurrent && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-50 text-orange-600 border border-orange-100 tracking-wide">
                            In Bearbeitung
                          </span>
                        )}
                      </div>
                      <p className="text-base text-slate-500 leading-relaxed max-w-md">{step.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Support (when not signed) */}
          {!isSigned && (
            <div className="rounded-[2rem] p-6"
              style={{
                background: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                border: '1px solid rgba(0, 0, 0, 0.04)',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.01), 0 12px 32px -4px rgba(0, 0, 0, 0.04)',
              }}
            >
              <h3 className="text-lg font-medium text-slate-900 tracking-tight mb-4">{t.taxReturnActions.needHelp}</h3>
              {supportTickets.length > 0 && (
                <div className="space-y-2 mb-4">
                  {supportTickets.map((ticket) => (
                    <div key={ticket.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="font-medium text-sm text-slate-900">{ticket.title}</p>
                      <p className="text-xs text-slate-500">
                        Status: {
                          ticket.status === 'open' ? t.taxReturnActions.statusOpen :
                          ticket.status === 'in_progress' ? t.taxReturnActions.statusInProgress :
                          ticket.status === 'resolved' ? t.taxReturnActions.statusResolved :
                          t.taxReturnActions.statusClosed
                        }
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex flex-col gap-3">
                {supportTickets.length > 0 && (
                  <button onClick={() => navigate(`/tickets?year=${taxYear}`)} className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <Eye className="w-5 h-5" /> {t.taxReturnActions.viewTickets}
                  </button>
                )}
                <button onClick={handleCreateTicket} className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  <AlertTriangle className="w-5 h-5" /> {supportTickets.length > 0 ? t.taxReturnActions.newTicket : t.taxReturnActions.reportProblem}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Upload Dialog */}
      <ModernUploadDialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <ModernUploadDialogContent className="sm:max-w-md bg-white border border-slate-200">
          <ModernUploadDialogHeader>
            <ModernUploadDialogTitle className="text-slate-900">{t.taxReturnActions.uploadTaxBill}</ModernUploadDialogTitle>
          </ModernUploadDialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="tax-bill-upload" className="text-slate-500">{t.taxReturnActions.selectFile}</Label>
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
                className="w-full h-12 rounded-full"
              >
                {t.taxReturnActions.cancel}
              </Button>
              <Button 
                onClick={handleTaxBillUpload} 
                disabled={!selectedFile || uploadLoading} 
                className="w-full h-12 rounded-full"
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
