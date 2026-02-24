import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, CheckCircle, Send, ExternalLink, Check, X, AlertTriangle } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateStoragePath } from '@/utils/fileValidation';
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog';

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  completedTaxReturn: {
    id: string;
    tax_year: string;
    file_name: string;
    file_path: string;
  };
  userProfile: {
    first_name: string;
    last_name: string;
    email: string;
    date_of_birth?: string;
  };
  onSignatureComplete: () => void;
}

export function SignatureDialog({
  open,
  onOpenChange,
  completedTaxReturn,
  userProfile,
  onSignatureComplete
}: SignatureDialogProps) {
  const [loading, setLoading] = useState(false);
  const [authorizationAccepted, setAuthorizationAccepted] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const [step, setStep] = useState<'review' | 'complete'>('review');
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);

  const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
  const currentDate = new Date().toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const authorizationText = `Ich, ${fullName}, ${userProfile.date_of_birth ? `geboren am ${new Date(userProfile.date_of_birth).toLocaleDateString('de-CH')}` : ''} bevollmächtige hiermit Ditax by Graber Sandro, meine Steuererklärung für das Steuerjahr ${completedTaxReturn.tax_year} beim zuständigen Steueramt einzureichen.

Ich bestätige, dass:
• Alle Angaben in dieser Steuererklärung von mir stammen und wahrheitsgemäss sind
• Ich die vollständige Steuererklärung geprüft und für korrekt befunden habe
• Ich für die Richtigkeit und Vollständigkeit aller Angaben allein verantwortlich bin
• Ditax by Graber Sandro ausschliesslich als Übermittler meiner Steuererklärung handelt und keine inhaltliche Prüfung vornimmt
• Ich verstehe, dass bei falschen Angaben strafrechtliche Konsequenzen gemäss Art. 175 ff. DBG drohen können
• Diese elektronische Unterschrift rechtlich bindend ist gemäss Art. 14 Abs. 2bis OR

Datum: ${currentDate}
E-Mail: ${userProfile.email}`;

  useEffect(() => {
    if (open) {
      setStep('review');
      setAuthorizationAccepted(false);
      setSignatureName('');
    }
  }, [open]);

  const handleSign = async () => {
    if (!authorizationAccepted || signatureName.trim().toLowerCase() !== fullName.toLowerCase()) {
      toast({
        variant: "destructive",
        title: "Bestätigung unvollständig",
        description: "Bitte bestätige die Einreichung und gib deinen vollständigen Namen ein."
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('sign-tax-return', {
        body: {
          completedTaxReturnId: completedTaxReturn.id,
          signatureName: signatureName.trim(),
          authorizationText,
          authorizationAccepted
        }
      });
      if (error) throw error;
      if (!data.success) throw new Error(data.error || 'Einreichung fehlgeschlagen');

      setStep('complete');
      toast({ title: "Erfolgreich eingereicht", description: "Deine Steuererklärung wurde zur Einreichung bestätigt." });
      setTimeout(() => { onSignatureComplete(); onOpenChange(false); }, 2000);
    } catch (error: any) {
      console.error('Signature error:', error);
      toast({ variant: "destructive", title: "Einreichung fehlgeschlagen", description: error?.message || "Ein Fehler ist aufgetreten." });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPdf = async () => {
    if (!validateStoragePath(completedTaxReturn.file_path)) {
      toast({ variant: "destructive", title: "Fehler", description: "Ungültiger Dateipfad." });
      return;
    }
    try {
      const { data, error } = await supabase.storage.from('completed-tax-returns').createSignedUrl(completedTaxReturn.file_path, 3600);
      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch {
      toast({ variant: "destructive", title: "Fehler", description: "PDF konnte nicht geöffnet werden." });
    }
  };

  const handleOpenTicket = () => {
    onOpenChange(false);
    setTimeout(() => setTicketDialogOpen(true), 200);
  };

  const nameMatches = signatureName.trim().toLowerCase() === fullName.toLowerCase();
  const canSubmit = authorizationAccepted && nameMatches && !loading;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          hideCloseButton
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white border-0 p-6 overflow-hidden shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-3xl gap-0"
        >
          {/* Close Button - identical to CreateTicketDialog */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-colors"
          >
            <X className="h-4 w-4 text-slate-500" />
          </button>

          {step === 'complete' ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
                <CheckCircle className="w-8 h-8 text-emerald-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2 text-center">Erfolgreich eingereicht!</h2>
              <p className="text-slate-500 text-center text-sm">Deine Steuererklärung wird übermittelt.</p>
            </div>
          ) : (
            <div className="pt-8">
              {/* Centered Header - matching CreateTicketDialog style */}
              <div className="flex flex-col items-center mb-6">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center mb-4">
                  <Send className="w-8 h-8 text-blue-500" strokeWidth={1.5} />
                </div>
                <DialogTitle className="text-xl font-semibold text-slate-900 text-center">
                  Einreichen — {completedTaxReturn.tax_year}
                </DialogTitle>
                <p className="text-sm text-slate-500 mt-1 text-center">
                  Steuererklärung bestätigen
                </p>
              </div>

              {/* PDF Card */}
              <button onClick={handleViewPdf} className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors group mb-4">
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 transition-colors shrink-0">
                  <FileText className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-slate-900 truncate group-hover:text-blue-600 transition-colors">{completedTaxReturn.file_name}</p>
                  <p className="text-xs text-slate-400">PDF Dokument</p>
                </div>
                <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-blue-500 shrink-0" strokeWidth={1.5} />
              </button>

              {/* Checkbox */}
              <label className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors cursor-pointer group mb-4">
                <input type="checkbox" checked={authorizationAccepted} onChange={e => setAuthorizationAccepted(e.target.checked)} className="peer sr-only" />
                <div className="mt-0.5 shrink-0 w-5 h-5 border-2 border-slate-300 rounded-md peer-checked:bg-blue-500 peer-checked:border-blue-500 flex items-center justify-center transition-all">
                  <Check className={`w-3.5 h-3.5 text-white transition-all ${authorizationAccepted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
                </div>
                <span className="text-sm text-slate-600 leading-snug select-none">
                  Ich habe meine Steuererklärung geprüft und bin einverstanden, dass diese über Ditax eingereicht wird.
                </span>
              </label>

              {/* Name Input */}
              <div className="space-y-2 mb-4">
                <label htmlFor="sig-name" className="text-slate-800 font-medium text-sm">
                  Name zur Bestätigung <span className="text-red-500">*</span>
                </label>
                <Input
                  id="sig-name"
                  value={signatureName}
                  onChange={e => setSignatureName(e.target.value)}
                  placeholder={fullName}
                  className="bg-white border-slate-200 h-12 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                />
              </div>

              {/* Buttons - identical style to CreateTicketDialog */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={!canSubmit}
                  className="flex-1 h-12 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Einreichen...
                    </>
                  ) : (
                    'Einreichen'
                  )}
                </Button>
              </div>

              {/* Problem melden link */}
              <div className="border-t border-slate-100 mt-4 pt-3">
                <button onClick={handleOpenTicket} className="w-full flex items-center justify-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                  <AlertTriangle className="w-3 h-3" strokeWidth={1.5} />
                  Nicht einverstanden? Problem melden
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <CreateTicketDialog
        isOpen={ticketDialogOpen}
        onClose={() => setTicketDialogOpen(false)}
        completedTaxReturnId={completedTaxReturn.id}
        taxYear={completedTaxReturn.tax_year}
      />
    </>
  );
}
