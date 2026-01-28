import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, ArrowLeft, Loader2, AlertCircle, Fingerprint } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ConsentStep } from './ConsentStep';
import { MfaChallenge } from './MfaChallenge';
import { useEnhancedWebAuthn } from '@/hooks/use-enhanced-webauthn';
import { isDespiaNative, triggerDespiaPasskeyAuth } from '@/lib/despia';

export const EnhancedLoginFlow: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'otp' | 'consent' | 'mfa'>('email');
  const [otpDisabled, setOtpDisabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const navigate = useNavigate();
  
  const { 
    checkPasskeysForEmail, 
    authenticateWithPasskey, 
    isSupported: isWebAuthnSupported,
    isLoading: isPasskeyLoading 
  } = useEnhancedWebAuthn();

  // Check if user has OTP disabled when email is entered
  const checkOtpStatus = async (userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('disable_otp_fallback')
        .eq('email', userEmail)
        .single();
      
      if (!error && data) {
        setOtpDisabled(data.disable_otp_fallback || false);
      }
    } catch (error) {
      // User might not exist yet, that's okay
      setOtpDisabled(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      // Check if user has disabled OTP
      await checkOtpStatus(email);
      
      // Check if user has passkeys
      const passkeyCheck = await checkPasskeysForEmail(email.trim());
      setHasPasskeys(passkeyCheck.has_passkeys);

      if (otpDisabled) {
        toast({
          title: 'OTP deaktiviert',
          description: 'Für dieses Konto sind E-Mail-Codes deaktiviert. Bitte aktivieren Sie einen Fingerprint in den Profileinstellungen.',
          variant: 'default',
        });
        setLoading(false);
        return;
      }

      // Send OTP
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      setStep('otp');
      toast({
        title: 'Code gesendet',
        description: 'Wir haben dir einen Anmeldecode per E-Mail gesendet.',
      });
    } catch (error: any) {
      console.error('Email submission error:', error);
      toast({
        title: 'Fehler beim Senden',
        description: error.message || 'E-Mail-Code konnte nicht gesendet werden.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyAuth = async () => {
    if (!email.trim()) return;
    
    // Check if running in Despia - open system browser for passkey auth
    if (isDespiaNative()) {
      triggerDespiaPasskeyAuth(email.trim());
      return;
    }
    
    setLoading(true);
    try {
      const result = await authenticateWithPasskey(email.trim());
      
      if (result.success) {
        // Check consent for passkey users too
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const hasConsent = await checkConsentStatus(user.id);
          
          if (!hasConsent) {
            setStep('consent');
            setLoading(false);
            return;
          }
        }
        
        toast({
          title: 'Anmeldung erfolgreich',
          description: 'Du wurdest erfolgreich angemeldet.',
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      toast({
        title: 'Fehler bei Fingerprint-Anmeldung',
        description: error.message || 'Die Fingerprint-Anmeldung ist fehlgeschlagen.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const checkConsentStatus = async (userId: string) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('terms_accepted_at')
        .eq('id', userId)
        .single();

      return !!profile?.terms_accepted_at;
    } catch (error) {
      console.error('Error checking consent status:', error);
      return false;
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: email.trim(),
        token: otpCode.trim(),
        type: 'email',
      });

      if (error) throw error;

      if (data.user) {
        // Check if user has MFA enabled
        const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
        const activeFactor = mfaFactors?.totp?.find(factor => factor.status === 'verified');

        if (activeFactor) {
          setMfaFactorId(activeFactor.id);
          setStep('mfa');
          setLoading(false);
          return;
        }

        // Check if user has already given consent
        const hasConsent = await checkConsentStatus(data.user.id);
        
        if (!hasConsent) {
          setStep('consent');
          setLoading(false);
          return;
        }
      }

      toast({
        title: 'Anmeldung erfolgreich',
        description: 'Du wurdest erfolgreich angemeldet.',
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast({
        title: 'Ungültiger Code',
        description: 'Der eingegebene Code ist ungültig oder abgelaufen.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySuccess = async () => {
    // Check consent for passkey users too
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Check if user has MFA enabled
        const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
        const activeFactor = mfaFactors?.totp?.find(factor => factor.status === 'verified');

        if (activeFactor) {
          setMfaFactorId(activeFactor.id);
          setStep('mfa');
          return;
        }

        const hasConsent = await checkConsentStatus(user.id);
        
        if (!hasConsent) {
          setStep('consent');
          return;
        }
      }
    } catch (error) {
      console.error('Error checking consent after passkey auth:', error);
    }
    
    navigate('/');
  };

  const handleConsentComplete = () => {
    toast({
      title: 'Anmeldung erfolgreich',
      description: 'Du wurdest erfolgreich angemeldet.',
    });
    navigate('/');
  };

  const handleMfaSuccess = () => {
    navigate('/');
  };

  const handleMfaCancel = () => {
    // Sign out and go back to email step
    supabase.auth.signOut();
    setStep('email');
    setMfaFactorId(null);
  };

  if (step === 'consent') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <ConsentStep 
          onConsentComplete={handleConsentComplete}
          userEmail={email}
        />
      </div>
    );
  }

  if (step === 'mfa' && mfaFactorId) {
    return (
      <MfaChallenge
        factorId={mfaFactorId}
        onSuccess={handleMfaSuccess}
        onCancel={handleMfaCancel}
      />
    );
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Code eingeben</CardTitle>
            <CardDescription>
              Wir haben dir einen Code an {email} gesendet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Passkey Button - Only show if user has passkeys */}
            {hasPasskeys && isWebAuthnSupported && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePasskeyAuth}
                  disabled={loading || isPasskeyLoading}
                  className="w-full"
                >
                  {isPasskeyLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Fingerprint className="mr-2 h-4 w-4" />
                  )}
                  {isPasskeyLoading ? 'Authentifizierung...' : 'Mit Fingerprint anmelden'}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">oder Code eingeben</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder="6-stelliger Code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                  autoComplete="one-time-code"
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading || !otpCode.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird überprüft...
                  </>
                ) : (
                  'Anmelden'
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                onClick={async () => {
                  // Cleanup unverified account if OTP was not entered
                  if (email && !otpCode) {
                    try {
                      await supabase.functions.invoke('cleanup-unverified-registrations', {
                        body: { email: email.trim() }
                      });
                    } catch (error) {
                      // Silently ignore - not critical
                      console.warn('Cleanup of unverified account failed:', error);
                    }
                  }
                  setStep('email');
                  setOtpCode('');
                  setHasPasskeys(false);
                }}
                className="text-sm"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                E-Mail ändern
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Anmelden</CardTitle>
          <CardDescription>
            Melde dich mit deiner E-Mail an
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Email/OTP Authentication Section */}
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Email:</label>
              <Input
                type="email"
                placeholder="name@mail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            
            {otpDisabled && email && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    E-Mail-Codes sind für dieses Konto deaktiviert. Verwende deinen Fingerprint.
                  </span>
                </div>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading || !email.trim() || otpDisabled}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Code wird gesendet...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  {otpDisabled ? 'E-Mail-Codes deaktiviert' : 'Login Code senden'}
                </>
              )}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            Haben Sie noch kein Konto?{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => navigate('/auth?mode=signup')}
            >
              Jetzt registrieren
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
