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
        description: "Bitte bestätigen Sie die Vollmacht und geben Sie Ihren vollständigen Namen ein."
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
        description: "Ihre Steuererklärung wurde elektronisch unterschrieben."
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
      <DialogContent className="max-w-lg bg-white border border-slate-200 p-0 overflow-hidden shadow-2xl [&>div:first-child]:bg-black/60">
        {step === 'complete' ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">
              Erfolgreich signiert!
            </h2>
            <p className="text-slate-600 text-center">
              Ihre Steuererklärung wurde elektronisch unterschrieben und kann nun eingereicht werden.
            </p>
          </div>
        ) : (
          <>
            <DialogHeader className="p-6 pb-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#1D64FF]/10 flex items-center justify-center">
                  <PenTool className="w-5 h-5 text-[#1D64FF]" />
                </div>
                <div>
                  <DialogTitle className="text-slate-900">
                    Steuererklärung {completedTaxReturn.tax_year} unterschreiben
                  </DialogTitle>
                  <p className="text-sm text-slate-500 mt-0.5">
                    Elektronische Signatur & Vollmacht
                  </p>
                </div>
              </div>
            </DialogHeader>

            <div className="p-6 space-y-5">
              {/* PDF Preview Button */}
              <button
                onClick={handleViewPdf}
                className="w-full p-4 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-colors flex items-center gap-4"
              >
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-red-600" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-medium text-slate-900">{completedTaxReturn.file_name}</p>
                  <p className="text-sm text-slate-500">Klicken zum Ansehen</p>
                </div>
              </button>

              {/* Authorization Text */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#1D64FF]" />
                  <Label className="text-slate-700 font-medium">Vollmacht & Bestätigung</Label>
                </div>
                <ScrollArea className="h-48 rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-700 whitespace-pre-line">
                    {authorizationText}
                  </p>
                </ScrollArea>
              </div>

              {/* Authorization Checkbox */}
              <div className="flex items-start gap-3 p-4 rounded-xl bg-slate-50 border border-slate-200">
                <Checkbox
                  id="authorization"
                  checked={authorizationAccepted}
                  onCheckedChange={(checked) => setAuthorizationAccepted(checked as boolean)}
                  className="mt-0.5"
                />
                <label htmlFor="authorization" className="text-sm text-slate-700 cursor-pointer">
                  Ich habe die Vollmacht gelesen und stimme zu, dass die ditax AG berechtigt ist, meine Steuererklärung einzureichen.
                </label>
              </div>

              {/* Signature Input */}
              <div className="space-y-2">
                <Label htmlFor="signature" className="text-slate-700">
                  Elektronische Unterschrift
                </Label>
                <Input
                  id="signature"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder={`Geben Sie "${fullName}" ein`}
                  className="bg-white border-slate-200 h-12 rounded-xl"
                />
                <p className="text-xs text-slate-500">
                  Geben Sie Ihren vollständigen Namen zur Bestätigung ein
                </p>
              </div>

              {/* Sign Button */}
              <Button
                onClick={handleSign}
                disabled={loading || !authorizationAccepted || signatureName.trim().toLowerCase() !== fullName.toLowerCase()}
                className="w-full h-12 rounded-full bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white font-medium"
                style={{ boxShadow: '0 0 20px rgba(29, 100, 255, 0.3)' }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Wird signiert...
                  </>
                ) : (
                  <>
                    <PenTool className="w-4 h-4 mr-2" />
                    Elektronisch unterschreiben
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-slate-500">
                Mit Ihrer Unterschrift bestätigen Sie die Richtigkeit aller Angaben
              </p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
