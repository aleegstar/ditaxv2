import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useMfa } from '@/hooks/useMfa';

interface MfaChallengeProps {
  factorId: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export const MfaChallenge: React.FC<MfaChallengeProps> = ({
  factorId,
  onSuccess,
  onCancel
}) => {
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { createChallenge, verifyChallenge } = useMfa();

  useEffect(() => {
    const initChallenge = async () => {
      try {
        const challenge = await createChallenge(factorId);
        setChallengeId(challenge.id);
      } catch (error) {
        setError('Fehler beim Erstellen der Herausforderung');
      }
    };

    initChallenge();
  }, [factorId, createChallenge]);

  const handleVerify = async () => {
    if (!challengeId || !code) return;

    setIsLoading(true);
    setError(null);

    try {
      await verifyChallenge(factorId, challengeId, code);
      onSuccess();
    } catch (error) {
      setError('Ungültiger Code. Bitte versuchen Sie es erneut.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 !m-0">
      <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl p-8">
        {/* Header with Icon */}
        <div className="text-center space-y-4 mb-8">
          <div className="mx-auto w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-blue-500" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Zwei-Faktor-Authentifizierung
            </h2>
            <p className="text-sm text-muted-foreground">
              Gib den 6-stelligen Code aus deiner Authenticator-App ein
            </p>
          </div>
        </div>
        
        {/* Content */}
        <div className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Verifizierungscode</label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
                disabled={!challengeId}
                onKeyDown={handleKeyPress}
              >
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="w-12 h-12 text-lg rounded-lg border-slate-200" />
                  <InputOTPSlot index={1} className="w-12 h-12 text-lg rounded-lg border-slate-200" />
                  <InputOTPSlot index={2} className="w-12 h-12 text-lg rounded-lg border-slate-200" />
                  <InputOTPSlot index={3} className="w-12 h-12 text-lg rounded-lg border-slate-200" />
                  <InputOTPSlot index={4} className="w-12 h-12 text-lg rounded-lg border-slate-200" />
                  <InputOTPSlot index={5} className="w-12 h-12 text-lg rounded-lg border-slate-200" />
                </InputOTPGroup>
              </InputOTP>
            </div>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleVerify}
              className="w-full h-12 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-medium"
              disabled={code.length !== 6 || isLoading || !challengeId}
            >
              {isLoading ? 'Wird verifiziert...' : 'Bestätigen'}
            </Button>
            
            <button 
              onClick={onCancel}
              className="w-full text-center py-2 text-sm text-slate-600 hover:text-slate-800 transition-colors"
              disabled={isLoading}
            >
              Abbrechen
            </button>
          </div>

          <div className="text-center pt-2">
            <p className="text-sm text-blue-500 hover:text-blue-600 cursor-pointer transition-colors">
              Probleme beim Anmelden? Kontaktieren Sie den Support.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};