import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, AlertCircle, ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MfaVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    const initMfa = async () => {
      // Get factor ID from location state or fetch from API
      let fId = (location.state as any)?.factorId;
      
      if (!fId) {
        // Fetch factors if not provided
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = mfaData?.totp?.filter(f => f.status === 'verified') || [];
        
        if (verifiedFactors.length === 0) {
          // No MFA factors, redirect to home
          navigate('/', { replace: true });
          return;
        }
        
        fId = verifiedFactors[0].id;
      }
      
      setFactorId(fId);

      // Create a challenge
      try {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId: fId });
        if (error) throw error;
        setChallengeId(data.id);
      } catch (err) {
        console.error('Error creating MFA challenge:', err);
        setError('Fehler beim Erstellen der Herausforderung');
      }
    };

    initMfa();
  }, [location.state, navigate]);

  const handleVerify = async () => {
    if (!challengeId || !code || !factorId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code
      });

      if (error) throw error;
      
      toast.success('Erfolgreich angemeldet!');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('MFA verification error:', err);
      setError('Ungültiger Code. Bitte versuchen Sie es erneut.');
      setCode('');
      
      // Create a new challenge for retry
      try {
        const { data } = await supabase.auth.mfa.challenge({ factorId: factorId! });
        if (data) setChallengeId(data.id);
      } catch (challengeErr) {
        console.error('Error creating new challenge:', challengeErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && code.length === 6) {
      handleVerify();
    }
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto bg-background border-border">
        <CardHeader className="text-center space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCancel}
            className="absolute left-4 top-4 p-2"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <div>
            <CardTitle className="text-xl font-semibold">Zwei-Faktor-Authentifizierung</CardTitle>
            <CardDescription className="mt-2">
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

          <div className="space-y-3">
            <Label className="text-sm font-medium">Verifizierungscode</Label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={6}
                value={code}
                onChange={(value) => setCode(value)}
                disabled={!challengeId}
                onKeyDown={handleKeyPress}
                autoFocus
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

          <div className="space-y-2 pt-2">
            <Button 
              onClick={handleVerify}
              className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-xl h-12 text-base font-medium"
              disabled={code.length !== 6 || isLoading || !challengeId}
            >
              {isLoading ? 'Wird verifiziert...' : 'Bestätigen'}
            </Button>
            
            <Button 
              onClick={handleCancel}
              variant="ghost"
              className="w-full text-muted-foreground"
              disabled={isLoading}
            >
              Abbrechen
            </Button>
          </div>

          <div className="text-center pt-4">
            <p className="text-sm text-muted-foreground">
              Probleme beim Anmelden? Kontaktieren Sie den Support.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default MfaVerify;