import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, CheckCircle, PenTool, Shield, X } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

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
• Ich alle Angaben in der Steuererklärung wahrheitsgemäss gemacht habe
• Ich die Steuererklärung vollständig geprüft und für korrekt befunden habe
• Ditax by Graber Sandro berechtigt ist, in meinem Namen mit dem Steueramt zu kommunizieren
• Ich verstehe, dass diese elektronische Signatur rechtlich bindend ist

Diese elektronische Unterschrift gilt als rechtsverbindliche Willenserklärung gemäss Art. 14 Abs. 2bis OR.

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
        title: "Signatur ungültig",
        description: "Bitte bestätige die Vollmacht und gib deinen vollständigen Namen ein."
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
        throw new Error(data.error || 'Signatur fehlgeschlagen');
      }

      setStep('complete');
      
      toast({
        title: "Erfolgreich signiert",
        description: "Deine Steuererklärung wurde elektronisch unterschrieben."
      });

      setTimeout(() => {
        onSignatureComplete();
        onOpenChange(false);
      }, 2000);

    } catch (error: any) {
      console.error('Signature error:', error);
      toast({
        variant: "destructive",
        title: "Signatur fehlgeschlagen",
        description: error?.message || "Ein Fehler ist aufgetreten."
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewPdf = async () => {
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md bg-white border-0 p-4 sm:p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-3xl gap-0">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shadow-sm hover:bg-slate-200 transition-colors z-10"
        >
          <X className="h-4 w-4 text-slate-500" />
        </button>

        {step === 'complete' ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1 text-center">
              Erfolgreich signiert!
            </h2>
            <p className="text-slate-500 text-center text-sm">
              Deine Steuererklärung wurde elektronisch unterschrieben.
            </p>
          </div>
        ) : (
          <div className="pt-2">
            {/* Header */}
            <div className="flex flex-col items-center mb-3">
              <DialogTitle className="text-lg font-semibold text-slate-900 text-center">
                Steuererklärung {completedTaxReturn.tax_year} unterschreiben
              </DialogTitle>
              <p className="text-xs text-slate-500 mt-0.5 text-center">
                Elektronische Signatur & Vollmacht
              </p>
            </div>

            <div className="space-y-3">
              {/* PDF Preview Button */}
              <button
                onClick={handleViewPdf}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-3 group"
              >
                <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm truncate">{completedTaxReturn.file_name}</p>
                  <p className="text-xs text-slate-500">Klicken zum Ansehen</p>
                </div>
              </button>

              {/* Authorization Text */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-blue-500" strokeWidth={1.5} />
                  <Label className="text-slate-800 font-medium text-xs">Vollmacht & Bestätigung</Label>
                </div>
                <ScrollArea className="h-20 rounded-lg border border-slate-200 bg-white p-2">
                  <p className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
                    {authorizationText}
                  </p>
                </ScrollArea>
              </div>

              {/* Authorization Checkbox */}
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <Checkbox
                  id="authorization"
                  checked={authorizationAccepted}
                  onCheckedChange={(checked) => setAuthorizationAccepted(checked as boolean)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <label htmlFor="authorization" className="text-xs text-slate-600 cursor-pointer leading-relaxed">
                  Ich habe die Vollmacht gelesen und stimme zu, dass Ditax by Graber Sandro berechtigt ist, meine Steuererklärung einzureichen.
                </label>
              </div>

              {/* Signature Input */}
              <div className="space-y-1.5">
                <Label htmlFor="signature" className="text-slate-800 font-medium text-xs">
                  Elektronische Unterschrift
                </Label>
                <Input
                  id="signature"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder={`Gib "${fullName}" ein`}
                  className="bg-white border-slate-200 h-10 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                />
                <p className="text-[11px] text-slate-500">
                  Gib deinen vollständigen Namen zur Bestätigung ein
                </p>
              </div>

              {/* Buttons */}
              <div className="flex flex-col gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="w-full h-11 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium border border-slate-200 text-sm"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={loading || !authorizationAccepted || signatureName.trim().toLowerCase() !== fullName.toLowerCase()}
                  className="w-full h-11 rounded-full bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_0_20px_rgba(29,100,255,0.3)] disabled:opacity-50 disabled:shadow-none text-sm"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Wird signiert...
                    </>
                  ) : (
                    'Unterschreiben'
                  )}
                </Button>
              </div>

              <p className="text-[11px] text-center text-slate-400">
                Mit deiner Unterschrift bestätigst du die Richtigkeit aller Angaben
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
