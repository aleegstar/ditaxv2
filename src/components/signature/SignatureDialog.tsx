import React, { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, FileText, CheckCircle, Send } from 'lucide-react';
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

  // Authorization text is kept for backend/legal purposes but not shown in UI
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
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent variant="bottom-sheet" className="px-5 pb-6 max-w-lg mx-auto">
        {step === 'complete' ? (
          <div className="flex flex-col items-center justify-center py-8">
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
          <div className="space-y-4 pt-2">
            {/* Header */}
            <div className="flex flex-col items-center text-center">
              <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center mb-2">
                <Send className="w-5 h-5 text-blue-600" strokeWidth={1.5} />
              </div>
              <DrawerTitle className="text-lg font-semibold text-slate-900">
                Steuererklärung einreichen
              </DrawerTitle>
              <p className="text-sm text-slate-500 mt-0.5">
                Steuerjahr {completedTaxReturn.tax_year}
              </p>
            </div>

            {/* PDF Preview Button */}
            <button
              onClick={handleViewPdf}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-red-500" strokeWidth={1.5} />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="font-medium text-slate-900 text-sm truncate">{completedTaxReturn.file_name}</p>
                <p className="text-xs text-slate-500">Dokument ansehen</p>
              </div>
            </button>

            {/* Single Confirmation Checkbox */}
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
              <Checkbox
                id="authorization"
                checked={authorizationAccepted}
                onCheckedChange={(checked) => setAuthorizationAccepted(checked as boolean)}
                className="mt-0.5 h-5 w-5 rounded border-slate-300 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <label htmlFor="authorization" className="text-sm text-slate-700 cursor-pointer leading-snug">
                Ich habe meine Steuererklärung geprüft und bin einverstanden, dass diese über Ditax eingereicht wird.
              </label>
            </div>

            {/* Signature Input */}
            <div>
              <Label htmlFor="signature" className="text-slate-700 font-medium text-sm">
                Name zur Bestätigung
              </Label>
              <Input
                id="signature"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder={`„${fullName}" eingeben`}
                className="bg-white border-slate-200 h-11 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 mt-1.5"
              />
            </div>

            {/* Buttons: Primary on top, Secondary below */}
            <div className="flex flex-col gap-2 pt-1">
              <Button
                onClick={handleSign}
                disabled={!canSubmit}
                className="w-full h-12 rounded-full bg-primary hover:bg-primary/90 text-white font-medium shadow-[0_0_15px_rgba(29,100,255,0.25)] disabled:opacity-50 disabled:shadow-none text-sm gap-2"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Einreichen
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="w-full h-11 rounded-full bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium border border-slate-200 text-sm"
              >
                Abbrechen
              </Button>
            </div>

            <p className="text-xs text-center text-slate-400 pb-1">
              Mit deiner Bestätigung wird die Steuererklärung über Ditax eingereicht
            </p>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
