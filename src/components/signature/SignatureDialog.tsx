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
  const [responsibilityAccepted, setResponsibilityAccepted] = useState(false);
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
      setResponsibilityAccepted(false);
      setSignatureName('');
    }
  }, [open]);

  const handleSign = async () => {
    if (!authorizationAccepted || !responsibilityAccepted || signatureName.trim().toLowerCase() !== fullName.toLowerCase()) {
      toast({
        variant: "destructive",
        title: "Signatur ungültig",
        description: "Bitte bestätige alle Bedingungen und gib deinen vollständigen Namen ein."
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
      <DialogContent className="fixed left-1/2 top-[50%] -translate-x-1/2 -translate-y-1/2 w-[calc(100%-1.5rem)] max-w-md bg-white border-0 p-3 sm:p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.25)] rounded-2xl gap-0">
        {/* Close Button */}
        <button
          onClick={() => onOpenChange(false)}
          className="absolute right-2.5 top-2.5 w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors z-10"
        >
          <X className="h-3.5 w-3.5 text-slate-500" />
        </button>

        {step === 'complete' ? (
          <div className="flex flex-col items-center justify-center py-5">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center mb-2">
              <CheckCircle className="w-6 h-6 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-base font-semibold text-slate-900 mb-1 text-center">
              Erfolgreich signiert!
            </h2>
            <p className="text-slate-500 text-center text-xs">
              Deine Steuererklärung wurde unterschrieben.
            </p>
          </div>
        ) : (
          <div className="pt-1">
            {/* Header */}
            <div className="flex flex-col items-center mb-2">
              <DialogTitle className="text-base font-semibold text-slate-900 text-center pr-6">
                Steuererklärung {completedTaxReturn.tax_year} unterschreiben
              </DialogTitle>
              <p className="text-[11px] text-slate-500 mt-0.5 text-center">
                Elektronische Signatur & Vollmacht
              </p>
            </div>

            <div className="space-y-2">
              {/* PDF Preview Button */}
              <button
                onClick={handleViewPdf}
                className="w-full p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-2"
              >
                <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-4 h-4 text-red-500" strokeWidth={1.5} />
                </div>
                <div className="text-left flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-xs truncate">{completedTaxReturn.file_name}</p>
                  <p className="text-[10px] text-slate-500">Klicken zum Ansehen</p>
                </div>
              </button>

              {/* Authorization Text - Compact */}
              <div className="p-2 rounded-lg border border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-1 mb-1">
                  <Shield className="w-3 h-3 text-blue-500" strokeWidth={1.5} />
                  <span className="text-slate-800 font-medium text-[10px]">Vollmacht & Bestätigung</span>
                </div>
                <p className="text-[10px] text-slate-600 leading-snug line-clamp-3">
                  {authorizationText}
                </p>
              </div>

              {/* Authorization Checkbox */}
              <div className="flex items-start gap-2 p-2 rounded-lg bg-white border border-slate-200">
                <Checkbox
                  id="authorization"
                  checked={authorizationAccepted}
                  onCheckedChange={(checked) => setAuthorizationAccepted(checked as boolean)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                />
                <label htmlFor="authorization" className="text-[11px] text-slate-600 cursor-pointer leading-snug">
                  Ich stimme zu, dass Ditax by Graber Sandro meine Steuererklärung einreichen darf.
                </label>
              </div>

              {/* Responsibility Checkbox */}
              <div className="flex items-start gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
                <Checkbox
                  id="responsibility"
                  checked={responsibilityAccepted}
                  onCheckedChange={(checked) => setResponsibilityAccepted(checked as boolean)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
                />
                <label htmlFor="responsibility" className="text-[11px] text-amber-800 cursor-pointer leading-snug">
                  Ich bestätige, dass ich für die Richtigkeit aller Angaben allein verantwortlich bin und Ditax by Graber Sandro keine inhaltliche Prüfung meiner Angaben vornimmt.
                </label>
              </div>

              {/* Signature Input */}
              <div>
                <Label htmlFor="signature" className="text-slate-800 font-medium text-[11px]">
                  Elektronische Unterschrift
                </Label>
                <Input
                  id="signature"
                  value={signatureName}
                  onChange={(e) => setSignatureName(e.target.value)}
                  placeholder={`Gib "${fullName}" ein`}
                  className="bg-white border-slate-200 h-9 rounded-lg text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 mt-1"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Vollständigen Namen zur Bestätigung eingeben
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={() => onOpenChange(false)}
                  className="flex-1 h-10 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium border border-slate-200 text-xs"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={handleSign}
                  disabled={loading || !authorizationAccepted || !responsibilityAccepted || signatureName.trim().toLowerCase() !== fullName.toLowerCase()}
                  className="flex-1 h-10 rounded-full bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_0_15px_rgba(29,100,255,0.25)] disabled:opacity-50 disabled:shadow-none text-xs"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Unterschreiben'
                  )}
                </Button>
              </div>

              <p className="text-[10px] text-center text-slate-400">
                Mit deiner Unterschrift bestätigst du die Richtigkeit aller Angaben
              </p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
