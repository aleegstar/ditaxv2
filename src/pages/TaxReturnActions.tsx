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
      <div className="min-h-screen bg-white">
        {/* Header */}
        <header className="w-full max-w-3xl mx-auto px-6 py-8 md:py-12 flex items-center justify-between relative">
          <button 
            onClick={() => navigate('/')}
            className="group p-3 rounded-full border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all duration-300 focus:ring-4 focus:ring-slate-100 outline-none"
          >
            <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900 transition-colors" />
          </button>
          <h1 className="absolute left-1/2 -translate-x-1/2 text-xl md:text-2xl font-semibold tracking-tight text-slate-900">
            {t.taxReturnActions.title} {taxYear}
          </h1>
          <div className="w-11" />
        </header>

        <div className="max-w-3xl mx-auto px-6 pb-24 md:pb-12">
          {/* Glassy Detail Card */}
          <div className="relative mb-16">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-50 to-slate-50 rounded-[2.5rem] blur-2xl opacity-50 -z-10" />
            <div className="bg-white/60 backdrop-blur-xl border border-slate-100 rounded-[2rem] p-8 md:p-10 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.06)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-10 gap-x-12">
                {firstName && (
                  <div className="space-y-2">
                    <span className="block text-sm font-medium text-slate-400">Name</span>
                    <p className="text-lg text-slate-900 font-medium tracking-tight">{firstName}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-slate-400">Steuerjahr</span>
                  <p className="text-lg text-slate-900 font-medium tracking-tight">{taxYear}</p>
                </div>
                <div className="space-y-2">
                  <span className="block text-sm font-medium text-slate-400">Service</span>
                  <div className="flex items-center gap-2">
                    {expressService && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                      </span>
                    )}
                    <p className="text-lg text-slate-900 font-medium tracking-tight">
                      {expressService ? 'Express-Service' : 'Standard'}
                    </p>
                  </div>
                </div>
                <div className="md:col-span-1 space-y-2">
                  <span className="block text-sm font-medium text-slate-400">Status</span>
                  <span className="inline-flex items-center gap-1.5 text-lg text-blue-600 font-medium tracking-tight">
                    {isSigned ? 'Abgeschlossen' : 'In Bearbeitung'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Signature CTA */}
          {needsSignature && (
            <div className="relative w-full overflow-hidden rounded-[2rem] bg-gradient-to-br from-primary to-primary/80 shadow-lg mb-12 p-6">
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

          {/* Signed Status */}
          {isSigned && (
            <div className="rounded-[2rem] bg-emerald-50 border border-emerald-200 shadow-sm mb-12">
              <div className="flex items-center gap-4 p-6">
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

          {/* Timeline */}
          <div className="space-y-0 relative">
            {timelineSteps.map((step, idx) => {
              const isLast = idx === timelineSteps.length - 1;
              const isCompleted = step.completed && !step.current;
              const isCurrent = !!step.current;
              const nextCompleted = !isLast && timelineSteps[idx + 1]?.completed && !timelineSteps[idx + 1]?.current;
              const nextIsCurrent = !isLast && !!timelineSteps[idx + 1]?.current;

              return (
                <div key={step.id} className={cn("flex gap-6 relative", !isLast && "pb-12")}>
                  {/* Connector line */}
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
                  {/* Icon */}
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
                  {/* Content */}
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

          {/* Action cards for signed returns */}
          {isSigned && (
            <div className="mt-12 space-y-4">
              <div className="rounded-[2rem] bg-white border border-slate-100 shadow-[0_4px_14px_rgba(0,0,0,0.04)] p-6">
                <h3 className="text-lg font-medium text-slate-900 tracking-tight mb-4">{t.taxReturnActions.taxYear} {taxYear}</h3>
                <div className="flex flex-col gap-3">
                  <button onClick={handleView} className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <Eye className="w-5 h-5" /> {t.taxReturnActions.view}
                  </button>
                  <button onClick={handleDownload} className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                    <Download className="w-5 h-5" /> {t.taxReturnActions.download}
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] bg-white border border-slate-100 shadow-[0_4px_14px_rgba(0,0,0,0.04)] p-6">
                <div className="flex items-center gap-3 mb-4">
                  <h3 className="text-lg font-medium text-slate-900 tracking-tight">{t.taxReturnActions.definitiveTaxBill}</h3>
                  {definitiveTaxBill ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> {t.taxReturnActions.available}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500" /> {t.taxReturnActions.pending}
                    </span>
                  )}
                </div>
                {definitiveTaxBill ? (
                  <div className="flex flex-col gap-3">
                    <button onClick={handleTaxBillView} className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      <Eye className="w-5 h-5" /> {t.taxReturnActions.viewBill}
                    </button>
                    <button onClick={handleTaxBillDownload} className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      <Download className="w-5 h-5" /> {t.taxReturnActions.downloadBill}
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <p className="text-sm text-slate-500 mb-1">{t.taxReturnActions.noBillYet}</p>
                    <button onClick={() => setUploadDialogOpen(true)} className="flex items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                      <Upload className="w-5 h-5" /> {t.taxReturnActions.uploadBill}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Support */}
          {!isSigned && (
            <div className="mt-12 rounded-[2rem] bg-white border border-slate-100 shadow-[0_4px_14px_rgba(0,0,0,0.04)] p-6">
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
