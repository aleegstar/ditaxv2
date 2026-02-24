import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileText, CheckCircle, Send, ExternalLink, Check } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { validateStoragePath } from '@/utils/fileValidation';

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

  const nameMatches = signatureName.trim().toLowerCase() === fullName.toLowerCase();
  const canSubmit = authorizationAccepted && nameMatches && !loading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="light" className="max-w-lg p-4 sm:p-10 rounded-3xl border-slate-100 shadow-[0_0_50px_-12px_rgba(0,0,0,0.06),0_20px_24px_-4px_rgba(0,0,0,0.02)] max-h-[95dvh] sm:max-h-[90vh] overflow-y-auto" hideCloseButton={step === 'complete'}>
        {step === 'complete' ? (
          <div className="flex flex-col items-center justify-center py-6">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-7 h-7 text-emerald-500" strokeWidth={1.5} />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1 text-center">
              Erfolgreich eingereicht!
            </h2>
            <p className="text-slate-500 text-center text-sm">
              Deine Steuererklärung wird übermittelt.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3 sm:gap-5">

            {/* Document Card */}
            <button
              onClick={handleViewPdf}
              className="w-full flex items-center gap-3 p-3 sm:p-4 bg-white border border-slate-200/80 shadow-sm rounded-2xl hover:border-blue-400 hover:shadow-md transition-all duration-300 group cursor-pointer"
            >
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 text-slate-600 rounded-xl border border-slate-100 group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors duration-300">
                <FileText className="w-5 h-5 sm:w-6 sm:h-6" strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm sm:text-base font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                  {completedTaxReturn.file_name}
                </p>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5 group-hover:text-blue-500 transition-colors">
                  PDF Dokument
                </p>
              </div>
              <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <ExternalLink className="w-4 h-4" strokeWidth={1.5} />
              </div>
            </button>

            {/* Checkbox Area */}
            <label className="relative flex items-start gap-3 p-4 bg-slate-50/50 border border-slate-200/60 rounded-2xl cursor-pointer hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 group">
              <input
                type="checkbox"
                checked={authorizationAccepted}
                onChange={(e) => setAuthorizationAccepted(e.target.checked)}
                className="peer sr-only"
              />
              <div className="mt-0.5 flex-shrink-0 w-5 h-5 border-2 border-slate-300 rounded-md peer-checked:bg-blue-600 peer-checked:border-blue-600 group-hover:border-blue-400 transition-all duration-200 flex items-center justify-center shadow-sm bg-white">
                <Check className={`w-3.5 h-3.5 text-white transition-all duration-200 ${authorizationAccepted ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} strokeWidth={3} />
              </div>
              <span className="text-sm text-slate-600 leading-relaxed select-none">
                Ich habe meine Steuererklärung geprüft und bin einverstanden, dass diese über Ditax eingereicht wird.
              </span>
            </label>

            {/* Name Input */}
            <div>
              <label htmlFor="signature-confirm" className="block text-sm font-semibold text-slate-900 mb-1.5 ml-1">
                Name zur Bestätigung
              </label>
              <Input
                id="signature-confirm"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder={fullName}
                className="w-full px-4 py-3 h-auto bg-white border-slate-200/80 rounded-xl text-base text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 shadow-sm"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row-reverse gap-2.5">
              <Button
                onClick={handleSign}
                disabled={!canSubmit}
                className="flex-1 py-3 h-auto rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-base font-medium shadow-sm hover:shadow gap-2 disabled:opacity-50"
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
                className="flex-1 py-3 h-auto rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-base font-medium shadow-sm"
              >
                Abbrechen
              </Button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              Mit deiner Bestätigung wird die Steuererklärung über Ditax eingereicht
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
