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
          variant="light"
          hideCloseButton
          className="w-[92vw] max-w-[420px] rounded-[20px] border-0 p-0 shadow-[0_8px_40px_rgba(0,0,0,0.12)] gap-0 overflow-hidden"
        >
          {step === 'complete' ? (
            <div className="flex flex-col items-center justify-center p-8">
              <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-base font-semibold text-foreground mb-0.5">Erfolgreich eingereicht!</h2>
              <p className="text-sm text-muted-foreground">Deine Steuererklärung wird übermittelt.</p>
            </div>
          ) : (
            <div className="p-5 sm:p-6">
              {/* Close */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-colors"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>

              {/* Header */}
              <DialogTitle className="text-base font-semibold text-foreground pr-8">
                Steuererklärung einreichen
              </DialogTitle>

              {/* PDF */}
              <button onClick={handleViewPdf} className="w-full flex items-center gap-2.5 p-2.5 bg-card border border-border/50 rounded-xl hover:border-primary/30 transition-all group mb-3">
                <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground group-hover:text-primary group-hover:bg-primary/5 transition-colors shrink-0">
                  <FileText className="w-4.5 h-4.5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[13px] font-medium text-foreground truncate group-hover:text-primary transition-colors">{completedTaxReturn.file_name}</p>
                  <p className="text-[11px] text-muted-foreground">PDF Dokument</p>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary shrink-0" strokeWidth={1.5} />
              </button>

              {/* Checkbox */}
              <label className="flex items-start gap-2.5 p-3 bg-muted/30 border border-border/30 rounded-xl cursor-pointer hover:bg-muted/50 transition-colors group mb-3">
                <input type="checkbox" checked={authorizationAccepted} onChange={e => setAuthorizationAccepted(e.target.checked)} className="peer sr-only" />
                <div className="mt-px shrink-0 w-[18px] h-[18px] border-[1.5px] border-border rounded peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center bg-card transition-all">
                  <Check className={`w-3 h-3 text-primary-foreground transition-all ${authorizationAccepted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
                </div>
                <span className="text-[13px] text-muted-foreground leading-snug select-none">
                  Ich habe meine Steuererklärung geprüft und bin einverstanden, dass diese über Ditax eingereicht wird.
                </span>
              </label>

              {/* Name */}
              <div className="mb-4">
                <label htmlFor="sig-name" className="block text-[13px] font-medium text-foreground mb-1 ml-0.5">Name zur Bestätigung</label>
                <Input
                  id="sig-name"
                  value={signatureName}
                  onChange={e => setSignatureName(e.target.value)}
                  placeholder={fullName}
                  className="h-10 px-3 bg-card border-border/50 rounded-lg text-sm placeholder:text-muted-foreground focus:ring-1 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <Button variant="ghost" onClick={() => onOpenChange(false)} className="flex-1 h-12 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-medium shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
                  Abbrechen
                </Button>
                <Button onClick={handleSign} disabled={!canSubmit} className="flex-1 h-12 rounded-full bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Einreichen'}
                </Button>
              </div>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Mit deiner Bestätigung wird die Steuererklärung über Ditax eingereicht
              </p>

              <div className="border-t border-border/30 mt-3 pt-2.5">
                <button onClick={handleOpenTicket} className="w-full flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
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
