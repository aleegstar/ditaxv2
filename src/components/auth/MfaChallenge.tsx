import React, { useState, useEffect } from 'react';
import { Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md mx-auto bg-background border-border">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle>Zwei-Faktor-Authentifizierung</CardTitle>
            <CardDescription>
              Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="mfa-code">Verifizierungscode</Label>
            <Input
              id="mfa-code"
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyPress={handleKeyPress}
              className="text-center text-lg font-mono tracking-widest"
              maxLength={6}
              disabled={!challengeId}
            />
          </div>

          <div className="space-y-2">
            <Button 
              onClick={handleVerify}
              className="w-full"
              disabled={code.length !== 6 || isLoading || !challengeId}
            >
              {isLoading ? 'Wird verifiziert...' : 'Bestätigen'}
            </Button>
            
            <Button 
              onClick={onCancel}
              variant="outline"
              className="w-full"
              disabled={isLoading}
            >
              Abbrechen
            </Button>
          </div>

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Probleme beim Anmelden? Kontaktieren Sie den Support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};