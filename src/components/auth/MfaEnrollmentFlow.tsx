import React, { useState } from 'react';
import { Shield, Smartphone, Copy, Check, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useMfa } from '@/hooks/useMfa';
import { toast } from 'sonner';
import { MfaStepper } from '@/components/ui/mfa-stepper';

interface MfaEnrollmentFlowProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const MfaEnrollmentFlow: React.FC<MfaEnrollmentFlowProps> = ({
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [verificationCode, setVerificationCode] = useState('');
  const [copied, setCopied] = useState(false);
  const { startEnrollment, verifyEnrollment, enrollmentData, isLoading } = useMfa();

  const handleStartEnrollment = async () => {
    try {
      await startEnrollment();
      setCurrentStep(1);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const handleCopySecret = () => {
    if (enrollmentData?.totp.secret) {
      navigator.clipboard.writeText(enrollmentData.totp.secret);
      setCopied(true);
      toast.success('Secret in Zwischenablage kopiert');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerifyCode = async () => {
    if (!enrollmentData?.id || !verificationCode) return;

    try {
      await verifyEnrollment(enrollmentData.id, verificationCode);
      setCurrentStep(3); // Move to "Abgeschlossen" step
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const steps = [
    {
      title: 'Vorbereitung',
      description: 'Installieren Sie eine Authenticator-App'
    },
    {
      title: 'Einrichtung',
      description: 'Scannen Sie den QR-Code oder geben Sie das Secret ein'
    },
    {
      title: 'Verifizierung',
      description: 'Geben Sie den 6-stelligen Code ein'
    },
    {
      title: 'Abgeschlossen',
      description: 'MFA ist erfolgreich aktiviert'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-lg mx-auto bg-background border-border">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              className="p-0 h-auto"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Zwei-Faktor-Authentifizierung einrichten
              </CardTitle>
              <CardDescription>
                Schritt {currentStep + 1} von {steps.length}
              </CardDescription>
            </div>
          </div>
          <MfaStepper steps={steps} currentStep={currentStep} />
        </CardHeader>
        
        <CardContent className="space-y-6">
          {currentStep === 0 && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <Smartphone className="w-16 h-16 mx-auto text-primary" />
                <div>
                  <h3 className="font-semibold">Authenticator-App installieren</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Installieren Sie eine der folgenden Apps auf Ihrem Smartphone:
                  </p>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Google Authenticator</div>
                  <div className="text-sm text-muted-foreground">Kostenlos für iOS und Android</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Microsoft Authenticator</div>
                  <div className="text-sm text-muted-foreground">Kostenlos für iOS und Android</div>
                </div>
                <div className="p-3 border rounded-lg">
                  <div className="font-medium">Authy</div>
                  <div className="text-sm text-muted-foreground">Kostenlos für iOS und Android</div>
                </div>
              </div>

              <Button 
                onClick={handleStartEnrollment} 
                className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]"
                style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
                disabled={isLoading}
              >
                Weiter zur Einrichtung
              </Button>
            </div>
          )}

          {currentStep === 1 && enrollmentData && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <h3 className="font-semibold">QR-Code scannen</h3>
                <p className="text-sm text-muted-foreground">
                  Scannen Sie diesen QR-Code mit Ihrer Authenticator-App
                </p>
                
                <div className="bg-white p-4 rounded-lg border inline-block">
                  <img 
                    src={enrollmentData.totp.qr_code} 
                    alt="QR Code für MFA Setup"
                    className="w-48 h-48"
                  />
                </div>
              </div>

              <div className="border-t pt-4">
                <Label className="text-sm font-medium">
                  Oder geben Sie dieses Secret manuell ein:
                </Label>
                <div className="flex gap-2 mt-2">
                  <Input 
                    value={enrollmentData.totp.secret}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopySecret}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <Button 
                onClick={() => setCurrentStep(2)} 
                className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]"
                style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
              >
                Weiter zur Verifizierung
              </Button>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="text-center space-y-4">
                <h3 className="font-semibold">Code eingeben</h3>
                <p className="text-sm text-muted-foreground">
                  Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="mfa-code">Verifizierungscode</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-lg font-mono tracking-widest"
                  maxLength={6}
                />
              </div>

              <Button 
                onClick={handleVerifyCode}
                className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]"
                style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
                disabled={verificationCode.length !== 6 || isLoading}
              >
                Code verifizieren
              </Button>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              
              <div>
                <h3 className="font-semibold text-green-600">Erfolgreich eingerichtet!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ihre Zwei-Faktor-Authentifizierung ist jetzt aktiv
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Wichtig:</strong> Bei Ihrem nächsten Login benötigen Sie zusätzlich zu Ihrem Passwort einen Code aus Ihrer Authenticator-App.
                </p>
              </div>

              <Button onClick={onComplete} className="w-full">
                Fertig
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};