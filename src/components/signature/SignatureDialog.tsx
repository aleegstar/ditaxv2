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
  const [step, setStep] = useState<'review' | 'sign' | 'complete'>('review');
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);

  const fullName = `${userProfile.first_name || ''} ${userProfile.last_name || ''}`.trim();
  const currentDate = new Date().toLocaleDateString('de-CH', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
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

      if (!data.success) {
        throw new Error(data.error || 'Einreichung fehlgeschlagen');
      }

      setStep('complete');
      
      toast({
        title: "Erfolgreich eingereicht",
        description: "Deine Steuererklärung wurde zur Einreichung bestätigt."
      });

      setTimeout(() => {
        onSignatureComplete();
        onOpenChange(false);
      }, 2000);

    } catch (error: any) {
      console.error('Signature error:', error);
      toast({
        variant: "destructive",
        title: "Einreichung fehlgeschlagen",
        description: error?.message || "Ein Fehler ist aufgetreten."
      });
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
      const { data, error } = await supabase.storage
        .from('completed-tax-returns')
        .createSignedUrl(completedTaxReturn.file_path, 3600);

      if (error) throw error;
      window.open(data.signedUrl, '_blank');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Fehler",
        description: "PDF konnte nicht geöffnet werden."
      });
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
        <DialogContent variant="light" className="max-w-md w-[calc(100%-2rem)] p-5 sm:p-8 rounded-3xl border-0 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] sm:max-h-[90vh] overflow-y-auto gap-0" hideCloseButton>
          {step === 'complete' ? (
            <div className="flex flex-col items-center justify-center py-6">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
                <CheckCircle className="w-7 h-7 text-emerald-500" strokeWidth={1.5} />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-1 text-center">
                Erfolgreich eingereicht!
              </h2>
              <p className="text-muted-foreground text-center text-sm">
                Deine Steuererklärung wird übermittelt.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 relative">
              {/* Close Button - matching screenshot 2 style */}
              <button
                onClick={() => onOpenChange(false)}
                className="absolute -top-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>

              {/* Title */}
              <div className="pr-8">
                <DialogTitle className="text-lg font-semibold text-foreground">
                  Steuererklärung einreichen
                </DialogTitle>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Bestätige die Einreichung für das Steuerjahr {completedTaxReturn.tax_year}
                </p>
              </div>

              {/* Document Card */}
              <button
                onClick={handleViewPdf}
                className="w-full flex items-center gap-3 p-3 bg-card border border-border/60 rounded-2xl hover:border-primary/40 hover:shadow-md transition-all duration-300 group cursor-pointer"
              >
                <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 bg-muted text-muted-foreground rounded-xl border border-border/60 group-hover:bg-primary/5 group-hover:text-primary group-hover:border-primary/20 transition-colors duration-300">
                  <FileText className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {completedTaxReturn.file_name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-primary/70 transition-colors">
                    PDF Dokument
                  </p>
                </div>
                <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.5} />
                </div>
              </button>

              {/* Checkbox Area */}
              <label className="relative flex items-start gap-3 p-3.5 bg-muted/30 border border-border/40 rounded-2xl cursor-pointer hover:bg-muted/50 hover:border-border transition-all duration-200 group">
                <input
                  type="checkbox"
                  checked={authorizationAccepted}
                  onChange={(e) => setAuthorizationAccepted(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="mt-0.5 flex-shrink-0 w-5 h-5 border-2 border-border rounded-md peer-checked:bg-primary peer-checked:border-primary group-hover:border-primary/60 transition-all duration-200 flex items-center justify-center shadow-sm bg-card">
                  <Check className={`w-3.5 h-3.5 text-primary-foreground transition-all duration-200 ${authorizationAccepted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
                </div>
                <span className="text-sm text-muted-foreground leading-relaxed select-none">
                  Ich habe meine Steuererklärung geprüft und bin einverstanden, dass diese über Ditax eingereicht wird.
                </span>
              </label>

              {/* Name Input */}
              <div>
                <label htmlFor="signature-confirm" className="block text-sm font-semibold text-foreground mb-1.5 ml-1">
                  Name zur Bestätigung
                </label>
                <Input
                  id="signature-confirm"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder={fullName}
                  className="w-full px-4 py-3 h-auto bg-card border-border/60 rounded-xl text-base text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 shadow-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2.5">
                <Button
                  onClick={handleSign}
                  disabled={!canSubmit}
                  className="w-full py-3 h-auto rounded-2xl bg-gradient-to-b from-[hsl(var(--primary))] to-[hsl(var(--primary)/0.9)] hover:opacity-90 active:scale-95 text-primary-foreground text-base font-medium shadow-sm gap-2 disabled:opacity-50 transition-all duration-200"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Send className="w-4 h-4" strokeWidth={2} />
                      Einreichen
                    </>
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => onOpenChange(false)}
                  className="w-full py-3 h-auto rounded-2xl bg-card hover:bg-muted text-foreground border border-border/60 text-base font-medium shadow-sm transition-all duration-200"
                >
                  Abbrechen
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Mit deiner Bestätigung wird die Steuererklärung über Ditax eingereicht
              </p>

              {/* Support Ticket Link */}
              <div className="border-t border-border/40 pt-3 -mt-1">
                <button
                  onClick={handleOpenTicket}
                  className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200"
                >
                  <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                  <span>Nicht einverstanden? Problem melden</span>
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Support Ticket Dialog */}
      <CreateTicketDialog
        isOpen={ticketDialogOpen}
        onClose={() => setTicketDialogOpen(false)}
        completedTaxReturnId={completedTaxReturn.id}
        taxYear={completedTaxReturn.tax_year}
      />
    </>
  );
}
