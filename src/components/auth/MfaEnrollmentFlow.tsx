import React, { useState } from 'react';
import { Shield, ShieldCheck, Smartphone, Copy, Check, ArrowRight, X } from 'lucide-react';
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
      setCurrentStep(3);
    } catch (error) {
      // Error handling is done in the hook
    }
  };

  const steps = [
    { title: 'Vorbereitung', description: 'Installiere eine Authenticator-App' },
    { title: 'Einrichtung', description: 'Scanne den QR-Code' },
    { title: 'Verifizierung', description: 'Gib den Code ein' },
    { title: 'Abschluss', description: 'MFA ist aktiviert' }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4 !m-0">
      {/* Modal Container */}
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100/80 overflow-hidden relative">
        {/* Close Button */}
        <button 
          onClick={onCancel}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none hover:bg-slate-50 p-2 rounded-xl z-20"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Section */}
        <div className="p-8 pb-0">
          <div className="flex items-start gap-5">
            <div className="flex-1 pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50/80 text-blue-600 mb-4 border border-blue-100/50">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-wider">
                  Sicherheit
                </span>
              </div>
              <h1 className="text-xl font-semibold text-slate-900 tracking-tight leading-snug">
                MFA Einrichtung
              </h1>
              <p className="text-slate-500 text-sm mt-1.5 font-medium">
                Schritt {currentStep + 1} von {steps.length}
              </p>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <div className="px-8">
          <MfaStepper steps={steps} currentStep={currentStep} />
        </div>

        {/* Main Content */}
        <div className="px-8 pb-8">
          {/* Step 0: Preparation */}
          {currentStep === 0 && (
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100/80 rounded-full flex items-center justify-center shadow-inner border border-blue-100/50">
                  <Smartphone className="w-9 h-9 text-blue-600" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
                Authenticator-App installieren
              </h2>
              <p className="text-slate-500 text-sm max-w-[280px] mx-auto mb-6 leading-relaxed">
                Installiere eine der folgenden Apps auf deinem Smartphone.
              </p>

              {/* App Options */}
              <div className="w-full space-y-2 mb-8">
                {['Google Authenticator', 'Microsoft Authenticator', 'Authy'].map((app) => (
                  <div 
                    key={app}
                    className="w-full bg-slate-50 rounded-2xl p-4 text-left flex gap-4 border border-slate-100 shadow-sm"
                  >
                    <div className="shrink-0 w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-slate-100/50">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="text-sm text-slate-600 leading-relaxed py-0.5">
                      <span className="font-semibold text-slate-900 block mb-0.5">
                        {app}
                      </span>
                      Kostenlos für iOS und Android
                    </div>
                  </div>
                ))}
              </div>

              {/* Button */}
              <button 
                onClick={handleStartEnrollment}
                disabled={isLoading}
                className="w-full group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Weiter zur Einrichtung</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Step 1: Setup QR Code */}
          {currentStep === 1 && enrollmentData && (
            <div className="flex flex-col items-center text-center">
              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
                QR-Code scannen
              </h2>
              <p className="text-slate-500 text-sm max-w-[280px] mx-auto mb-6 leading-relaxed">
                Scanne diesen QR-Code mit deiner Authenticator-App.
              </p>

              {/* QR Code */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm mb-6">
                <img 
                  src={enrollmentData.totp.qr_code} 
                  alt="QR Code für MFA Setup"
                  className="w-48 h-48"
                />
              </div>

              {/* Secret Input */}
              <div className="w-full bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 shadow-sm mb-8">
                <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                  Oder gib dieses Secret manuell ein:
                </Label>
                <div className="flex gap-2">
                  <Input 
                    value={enrollmentData.totp.secret}
                    readOnly
                    className="font-mono text-sm bg-white border-slate-200"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleCopySecret}
                    className="shrink-0 bg-white border-slate-200 hover:bg-slate-50"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {/* Button */}
              <button 
                onClick={() => setCurrentStep(2)}
                className="w-full group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                <span>Weiter zur Verifizierung</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Step 2: Verification */}
          {currentStep === 2 && (
            <div className="flex flex-col items-center text-center">
              {/* Icon */}
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-blue-50 to-blue-100/80 rounded-full flex items-center justify-center shadow-inner border border-blue-100/50">
                  <Shield className="w-9 h-9 text-blue-600" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
                Code eingeben
              </h2>
              <p className="text-slate-500 text-sm max-w-[280px] mx-auto mb-6 leading-relaxed">
                Gib den 6-stelligen Code aus deiner Authenticator-App ein.
              </p>

              {/* Code Input */}
              <div className="w-full mb-8">
                <Input
                  type="text"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="text-center text-2xl font-mono tracking-[0.5em] py-6 bg-slate-50 border-slate-200 rounded-2xl"
                  maxLength={6}
                />
              </div>

              {/* Button */}
              <button 
                onClick={handleVerifyCode}
                disabled={verificationCode.length !== 6 || isLoading}
                className="w-full group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <span>Code verifizieren</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}

          {/* Step 3: Success */}
          {currentStep === 3 && (
            <div className="flex flex-col items-center text-center">
              {/* Success Icon */}
              <div className="mb-6 relative">
                <div className="absolute inset-0 bg-emerald-100 rounded-full blur-xl opacity-50" />
                <div className="relative w-20 h-20 bg-gradient-to-br from-emerald-50 to-emerald-100/80 rounded-full flex items-center justify-center shadow-inner border border-emerald-100/50">
                  <Check className="w-9 h-9 text-emerald-600" />
                </div>
              </div>

              <h2 className="text-xl font-semibold text-slate-900 tracking-tight mb-2">
                Erfolgreich eingerichtet!
              </h2>
              <p className="text-slate-500 text-sm max-w-[280px] mx-auto mb-8 leading-relaxed">
                Deine Zwei-Faktor-Authentifizierung ist jetzt aktiv und dein Konto geschützt.
              </p>

              {/* Info Box */}
              <div className="w-full bg-slate-50 rounded-2xl p-4 text-left flex gap-4 mb-8 border border-slate-100 shadow-sm">
                <div className="shrink-0 w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-slate-100/50">
                  <Shield className="w-5 h-5" />
                </div>
                <div className="text-sm text-slate-600 leading-relaxed py-0.5">
                  <span className="font-semibold text-slate-900 block mb-0.5">
                    Wichtig
                  </span>
                  Verwende beim nächsten Login den Code aus deiner Authenticator-App.
                </div>
              </div>

              {/* Button */}
              <button 
                onClick={onComplete}
                className="w-full group bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium py-3.5 rounded-xl shadow-lg shadow-blue-500/25 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center gap-2"
              >
                <span>Fertigstellen</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
