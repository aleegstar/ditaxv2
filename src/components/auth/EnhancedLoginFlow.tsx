import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, ArrowLeft, Loader2, AlertCircle, Fingerprint } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from '@/hooks/use-toast';
import { ConsentStep } from './ConsentStep';
import { MfaChallenge } from './MfaChallenge';
import { useEnhancedWebAuthn } from '@/hooks/use-enhanced-webauthn';
import { isDespiaNative, triggerDespiaPasskeyAuth } from '@/lib/despia';
import { useI18n } from '@/contexts/I18nContext';

export const EnhancedLoginFlow: React.FC = () => {
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'otp' | 'consent' | 'mfa'>('email');
  const [otpDisabled, setOtpDisabled] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [hasPasskeys, setHasPasskeys] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();
  
  const { 
    checkPasskeysForEmail, 
    authenticateWithPasskey, 
    isSupported: isWebAuthnSupported,
    isLoading: isPasskeyLoading 
  } = useEnhancedWebAuthn();

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
      setOtpDisabled(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      await checkOtpStatus(email);
      
      const passkeyCheck = await checkPasskeysForEmail(email.trim());
      setHasPasskeys(passkeyCheck.has_passkeys);

      if (otpDisabled) {
        toast({
          title: t.authFlow.otpDisabled,
          description: t.authFlow.otpDisabledHint,
          variant: 'default',
        });
        setLoading(false);
        return;
      }

      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      setStep('otp');
      toast({
        title: t.authFlow.codeSent,
        description: t.authFlow.codeSentDescription,
      });
    } catch (error: any) {
      console.error('Email submission error:', error);
      toast({
        title: t.authFlow.sendError,
        description: error.message || t.authFlow.sendError,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeyAuth = async () => {
    if (!email.trim()) return;
    
    if (isDespiaNative()) {
      triggerDespiaPasskeyAuth(email.trim());
      return;
    }
    
    setLoading(true);
    try {
      const result = await authenticateWithPasskey(email.trim());
      
      if (result.success) {
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
          title: t.authFlow.loginSuccess,
          description: t.authFlow.loginSuccessDescription,
        });
        navigate('/');
      }
    } catch (error: any) {
      console.error('Passkey authentication error:', error);
      toast({
        title: t.authFlow.passkeyError,
        description: error.message || t.authFlow.passkeyError,
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
        const { data: mfaFactors } = await supabase.auth.mfa.listFactors();
        const activeFactor = mfaFactors?.totp?.find(factor => factor.status === 'verified');

        if (activeFactor) {
          setMfaFactorId(activeFactor.id);
          setStep('mfa');
          setLoading(false);
          return;
        }

        const hasConsent = await checkConsentStatus(data.user.id);
        
        if (!hasConsent) {
          setStep('consent');
          setLoading(false);
          return;
        }
      }

      toast({
        title: t.authFlow.loginSuccess,
        description: t.authFlow.loginSuccessDescription,
      });
      
      navigate('/');
    } catch (error: any) {
      console.error('OTP verification error:', error);
      toast({
        title: t.authFlow.invalidCode,
        description: t.authFlow.invalidCode,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePasskeySuccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
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
      title: t.authFlow.loginSuccess,
      description: t.authFlow.loginSuccessDescription,
    });
    navigate('/');
  };

  const handleMfaSuccess = () => {
    navigate('/');
  };

  const handleMfaCancel = () => {
    supabase.auth.signOut();
    setStep('email');
    setMfaFactorId(null);
  };

  if (step === 'consent') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
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
            <CardTitle className="text-2xl">{t.authFlow.enterCode}</CardTitle>
            <CardDescription>
              {t.authFlow.codeSentTo.replace('{email}', email)}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Passkey Button */}
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
                  {isPasskeyLoading ? t.authFlow.passkeyAuthenticating : t.authFlow.passkeyLogin}
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">{t.authFlow.orEnterCode}</span>
                  </div>
                </div>
              </>
            )}

            <form onSubmit={handleOtpSubmit} className="space-y-4">
              <div className="space-y-2">
                <Input
                  type="text"
                  placeholder={t.authFlow.sixDigitCode}
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
                    {t.authFlow.verifying}
                  </>
                ) : (
                  t.authFlow.verifyButton
                )}
              </Button>
            </form>

            <div className="flex items-center justify-center">
              <Button
                variant="ghost"
                onClick={async () => {
                  if (email && !otpCode) {
                    try {
                      await supabase.functions.invoke('cleanup-unverified-registrations', {
                        body: { email: email.trim() }
                      });
                    } catch (error) {
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
                {t.authFlow.changeEmail}
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
          <CardTitle className="text-2xl">{t.authFlow.login}</CardTitle>
          <CardDescription>
            {t.authFlow.loginSubtitle}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">{t.authFlow.emailLabel}</label>
              <Input
                type="email"
                placeholder={t.authFlow.emailPlaceholder}
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
                    {t.authFlow.otpDisabledHint}
                  </span>
                </div>
              </div>
            )}
            
            <button 
              type="submit" 
              disabled={loading || !email.trim() || otpDisabled}
              className="group relative flex w-full items-center justify-center gap-3 rounded-full bg-gradient-to-b from-[rgb(50,120,255)] to-[rgb(20,80,220)] pl-6 pr-4 py-2.5 transition-all shadow-[0_4px_20px_-4px_rgba(29,100,255,0.5),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_6px_28px_-4px_rgba(29,100,255,0.6),inset_0_1px_0_rgba(255,255,255,0.25)] hover:scale-[1.02] active:scale-95 active:shadow-[0_2px_10px_-4px_rgba(29,100,255,0.4)] disabled:pointer-events-none disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center gap-2 text-base font-semibold text-white tracking-tight">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t.authFlow.sendingCode}
                </span>
              ) : (
                <>
                  <span className="text-base font-semibold text-white tracking-tight">
                    {otpDisabled ? t.authFlow.codeDisabled : t.authFlow.sendCode}
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm text-white transition-all group-hover:bg-white/25">
                    <ArrowRight className="h-4 w-4 stroke-[2] group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </>
              )}
            </button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            {t.authFlow.noAccount}{' '}
            <Button
              variant="link"
              className="p-0 h-auto font-normal"
              onClick={() => navigate('/auth?mode=signup')}
            >
              {t.authFlow.registerNow}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
