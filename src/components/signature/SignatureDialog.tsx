import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, FileText, CheckCircle, PenTool, Shield } from 'lucide-react';
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

  const authorizationText = `Ich, ${fullName}, ${userProfile.date_of_birth ? `geboren am ${new Date(userProfile.date_of_birth).toLocaleDateString('de-CH')}` : ''} bevollmächtige hiermit die ditax AG, meine Steuererklärung für das Steuerjahr ${completedTaxReturn.tax_year} beim zuständigen Steueramt einzureichen.

Ich bestätige, dass:
• Ich alle Angaben in der Steuererklärung wahrheitsgemäss gemacht habe
• Ich die Steuererklärung vollständig geprüft und für korrekt befunden habe
• Die ditax AG berechtigt ist, in meinem Namen mit dem Steueramt zu kommunizieren
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
      <DialogContent className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md max-h-[90vh] bg-white border-0 p-0 overflow-hidden shadow-2xl rounded-3xl gap-0">
        {step === 'complete' ? (
          <div className="flex flex-col items-center justify-center py-16 px-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-b from-emerald-400 to-emerald-500 flex items-center justify-center mb-6 shadow-lg shadow-emerald-500/30">
              <CheckCircle className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Erfolgreich signiert!
            </h2>
            <p className="text-slate-500 text-center text-sm">
              Deine Steuererklärung wurde elektronisch unterschrieben und kann nun eingereicht werden.
            </p>
          </div>
        ) : (
          <>
            {/* Header with gradient background */}
            <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                  <PenTool className="w-4 h-4 text-white" strokeWidth={1.5} />
                </div>
                <div>
                  <DialogTitle className="text-white font-semibold">
                    Steuererklärung {completedTaxReturn.tax_year} unterschreiben
                  </DialogTitle>
                  <p className="text-sm text-slate-400 mt-0.5">
                    Elektronische Signatur & Vollmacht
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* PDF Preview Button */}
              <button
                onClick={handleViewPdf}
                className="w-full p-4 rounded-2xl border border-slate-100 bg-gradient-to-b from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-100 transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-b from-red-400 to-red-500 flex items-center justify-center flex-shrink-0 shadow-md shadow-red-500/20">
                  <FileText className="w-5 h-5 text-white" strokeWidth={1.5} />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-slate-900 text-sm">{completedTaxReturn.file_name}</p>
                  <p className="text-xs text-slate-500">Klicken zum Ansehen</p>
                </div>
              </button>

              {/* Authorization Text */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" strokeWidth={1.5} />
                  <Label className="text-slate-800 font-medium text-sm">Vollmacht & Bestätigung</Label>
                </div>
                <ScrollArea className="h-40 rounded-2xl border border-slate-100 bg-slate-50/80 p-4">
                  <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">
                    {authorizationText}
                  </p>
                </ScrollArea>
              </div>

              {/* Authorization Checkbox */}
              <div className="flex items-start gap-3 p-4 rounded-2xl bg-slate-50/80 border border-slate-100">
                <Checkbox
                  id="authorization"
                  checked={authorizationAccepted}
                  onCheckedChange={(checked) => setAuthorizationAccepted(checked as boolean)}
                  className="mt-0.5 h-5 w-5 rounded-md border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <label htmlFor="authorization" className="text-sm text-slate-600 cursor-pointer leading-relaxed">
                  Ich habe die Vollmacht gelesen und stimme zu, dass die ditax AG berechtigt ist, meine Steuererklärung einzureichen.
                </label>
              </div>

              {/* Signature Input */}
              <div className="space-y-2">
                <Label htmlFor="signature" className="text-slate-800 font-medium text-sm">
                  Elektronische Unterschrift
                </Label>
                <Input
                  id="signature"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder={`Gib "${fullName}" ein`}
                  className="bg-white border-slate-200 h-12 rounded-xl text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500/20"
                />
                <p className="text-xs text-slate-500">
                  Gib deinen vollständigen Namen zur Bestätigung ein
                </p>
              </div>

              {/* Sign Button */}
              <Button
                onClick={handleSign}
                disabled={loading || !authorizationAccepted || signatureName.trim().toLowerCase() !== fullName.toLowerCase()}
                className="w-full h-12 rounded-xl bg-gradient-to-b from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-medium shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird signiert...
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4 mr-2" strokeWidth={1.5} />
                    Elektronisch unterschreiben
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-400">
                Mit deiner Unterschrift bestätigst du die Richtigkeit aller Angaben
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
