import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { ChevronLeft, ChevronDown, Fingerprint, ShieldCheck, Globe, Mail } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { isAndroidEnvironment } from "@/utils/platform";

import { isDespiaNative, isDespiaIOS, triggerDespiaPasskeyAuth, DEEPLINK_SCHEME } from "@/lib/despia";
import { getAppleOAuthUrl } from "@/lib/apple-auth";
import despia from 'despia-native';

const AuthLanguageToggle = () => {
  const { language, switchLanguage } = useI18n();
  return (
    <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border border-border/60 bg-background">
      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
      <button
        onClick={() => switchLanguage('de')}
        className={`text-xs font-medium px-1 transition-colors ${language === 'de' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        DE
      </button>
      <button
        onClick={() => switchLanguage('en')}
        className={`text-xs font-medium px-1 transition-colors ${language === 'en' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>
        EN
      </button>
    </div>);
};

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const {
    t
  } = useI18n();
  const [step, setStep] = useState<"main" | "code">("main");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isOAuthLoading, setIsOAuthLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showEmailForm, setShowEmailForm] = useState(false);

  const isOAuthInProgress = useRef(false);

  // Combined loading state for backward compatibility
  const isLoading = isEmailLoading || isOAuthLoading;

  // Reset OAuth state on mount (fixes stuck button after cancelled/failed OAuth)
  useEffect(() => {
    isOAuthInProgress.current = false;
    setIsOAuthLoading(false);
  }, []);

  // Handle deeplink callback from Despia native app
  // NEW: Session is now set in NativeCallback (Chrome Custom Tab) 
  // We just need to check for success=true and retrieve the existing session
  useEffect(() => {
    const handleDeeplinkAuth = async () => {
      // Check query params (from deeplink)
      const success = searchParams.get('success');
      const accessToken = searchParams.get('access_token') || searchParams.get('at');
      const refreshToken = searchParams.get('refresh_token') || searchParams.get('rt');
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      // Also check URL hash (for web OAuth flow: /auth#access_token=xxx)
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const hashAccessToken = hashParams.get('access_token');
      const hashRefreshToken = hashParams.get('refresh_token');
      const hashError = hashParams.get('error');
      const hashErrorDescription = hashParams.get('error_description');

      // Use either source
      const finalAccessToken = accessToken || hashAccessToken;
      const finalRefreshToken = refreshToken || hashRefreshToken;
      const finalError = errorParam || hashError;
      const finalErrorDescription = errorDescription || hashErrorDescription;

      // Handle errors first
      if (finalError) {
        toast.error(finalErrorDescription || finalError || 'Anmeldung fehlgeschlagen');
        window.history.replaceState({}, '', '/auth');
        return;
      }

      // If success is explicitly false (from deeplink)
      if (success === 'false') {
        toast.error(finalErrorDescription || 'Anmeldung fehlgeschlagen');
        window.history.replaceState({}, '', '/auth');
        return;
      }

      // NEW: Handle success=true from short deeplink
      // Session was already set in NativeCallback (Chrome Custom Tab shares storage)
      if (success === 'true') {
        console.log('🔐 Success signal received, checking for existing session...');
        setIsOAuthLoading(true);

        // Small delay to ensure session storage is synced
        await new Promise((resolve) => setTimeout(resolve, 300));

        try {
          const { data: { session } } = await supabase.auth.getSession();

          if (session) {
            console.log('✅ Session found! User authenticated.');
            window.history.replaceState({}, '', '/auth');
            toast.success('Erfolgreich angemeldet!');
            navigate('/', { replace: true });
            return;
          } else {
            console.log('⚠️ No session found after success signal, retrying...');
            // Retry once more after a longer delay
            await new Promise((resolve) => setTimeout(resolve, 500));
            const { data: { session: retrySession } } = await supabase.auth.getSession();

            if (retrySession) {
              console.log('✅ Session found on retry!');
              window.history.replaceState({}, '', '/auth');
              toast.success('Erfolgreich angemeldet!');
              navigate('/', { replace: true });
              return;
            }

            console.error('❌ No session found after retries');
            toast.error('Session konnte nicht geladen werden');
          }
        } catch (err) {
          console.error('Error checking session:', err);
          toast.error('Fehler beim Laden der Session');
        } finally {
          setIsOAuthLoading(false);
          window.history.replaceState({}, '', '/auth');
        }
        return;
      }

      // LEGACY: Handle tokens passed directly in URL (for web flow or old deeplinks)
      if (finalAccessToken) {
        setIsOAuthLoading(true);
        try {
          const { error } = await supabase.auth.setSession({
            access_token: finalAccessToken,
            refresh_token: finalRefreshToken || ''
          });
          if (error) throw error;

          window.history.replaceState({}, '', '/auth');
          toast.success('Erfolgreich angemeldet!');
          navigate('/', { replace: true });
        } catch (error: any) {
          console.error('Auth error:', error);
          toast.error(error.message || 'Fehler bei der Anmeldung');
        } finally {
          setIsOAuthLoading(false);
        }
        return;
      }

      // No tokens and no success signal - check if already authenticated
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/', { replace: true });
      }
    };
    handleDeeplinkAuth();
  }, [searchParams, navigate]);
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsEmailLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      toast.success("Code gesendet! Prüfe deine E-Mails.");
      setStep("code");
      setResendCountdown(25);
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Senden des Codes");
    } finally {
      setIsEmailLoading(false);
    }
  };
  const handleGoogleAuth = async () => {
    if (isOAuthInProgress.current) return;
    isOAuthInProgress.current = true;
    setIsOAuthLoading(true);
    const isDespia = isDespiaNative();
    const isNativeCapacitor = Capacitor.isNativePlatform();

    // DESPIA NATIVE (iOS + Android) - unified flow via native-callback
    if (isDespia) {
      try {
        const { data, error } = await supabase.functions.invoke('auth-start', {
          body: { provider: 'google', deeplink_scheme: DEEPLINK_SCHEME }
        });
        if (error || !data?.url) {
          console.error('❌ Failed to get OAuth URL:', error);
          toast.error("Fehler beim Starten der Anmeldung");
          isOAuthInProgress.current = false;
          setIsOAuthLoading(false);
          return;
        }
        console.log('📱 Despia Google Auth: Using native-callback');
        despia(`oauth://?url=${encodeURIComponent(data.url)}`);
        setTimeout(() => {
          isOAuthInProgress.current = false;
          setIsOAuthLoading(false);
        }, 30000);
      } catch (err) {
        console.error('❌ Error starting native auth:', err);
        toast.error("Fehler bei der Google-Anmeldung");
        isOAuthInProgress.current = false;
        setIsOAuthLoading(false);
      }
      return;
    }

    // Capacitor native browser
    if (isNativeCapacitor || isAndroidEnvironment()) {
      try {
        const {
          data,
          error
        } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'https://app.ditax.ch/auth-success',
            skipBrowserRedirect: true
          }
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({
            url: data.url,
            presentationStyle: 'popover'
          });
        }
      } catch (error) {
        console.error('Google auth error:', error);
        toast.error("Fehler bei der Google-Anmeldung");
        isOAuthInProgress.current = false;
        setIsOAuthLoading(false);
      }
      return;
    }

    // Web Flow - Standard Supabase OAuth
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'https://app.ditax.ch/auth-success'
        }
      });
    } catch (error) {
      console.error('Google auth error:', error);
      toast.error("Fehler bei der Google-Anmeldung");
      isOAuthInProgress.current = false;
      setIsOAuthLoading(false);
    }
  };
  const handleAppleAuth = async () => {
    if (isOAuthInProgress.current) return;
    isOAuthInProgress.current = true;
    setIsOAuthLoading(true);
    const isDespia = isDespiaNative();
    const isNativeCapacitor = Capacitor.isNativePlatform();

    // iOS DESPIA: Direct Apple OAuth with form_post (bypasses isolated ASWebAuthenticationSession storage)
    if (isDespia && isDespiaIOS()) {
      try {
        const url = getAppleOAuthUrl(true, DEEPLINK_SCHEME);
        if (!url) {
          toast.error("Apple Sign In nicht konfiguriert");
          isOAuthInProgress.current = false;
          setIsOAuthLoading(false);
          return;
        }
        console.log('🍎 iOS Apple Auth: Direct form_post flow');
        despia(`oauth://?url=${encodeURIComponent(url)}`);
        setTimeout(() => {
          isOAuthInProgress.current = false;
          setIsOAuthLoading(false);
        }, 30000);
      } catch (err) {
        console.error('Error starting iOS Apple auth:', err);
        toast.error("Fehler bei der Apple-Anmeldung");
        isOAuthInProgress.current = false;
        setIsOAuthLoading(false);
      }
      return;
    }

    // ANDROID DESPIA NATIVE FLOW - Easy OAuth gemäß https://lovable.despia.com/default-guide/native-features/easy-oauth
    if (isDespia) {
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('auth-start', {
          body: {
            provider: 'apple',
            deeplink_scheme: DEEPLINK_SCHEME
          }
        });
        if (error || !data?.url) {
          console.error('Failed to get Apple OAuth URL:', error);
          toast.error("Fehler beim Starten der Anmeldung");
          isOAuthInProgress.current = false;
          setIsOAuthLoading(false);
          return;
        }

        // Easy OAuth: Opens ASWebAuthenticationSession (iOS) or Chrome Custom Tab (Android)
        despia(`oauth://?url=${encodeURIComponent(data.url)}`);
        // Safety timeout - reset after 30s if OAuth doesn't complete
        setTimeout(() => {
          isOAuthInProgress.current = false;
          setIsOAuthLoading(false);
        }, 30000);
      } catch (err) {
        console.error('Error starting native Apple auth:', err);
        toast.error("Fehler bei der Apple-Anmeldung");
        isOAuthInProgress.current = false;
        setIsOAuthLoading(false);
      }
      return;
    }

    // Capacitor native browser
    if (isNativeCapacitor || isAndroidEnvironment()) {
      try {
        const {
          data,
          error
        } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: 'https://app.ditax.ch/auth-success',
            skipBrowserRedirect: true
          }
        });
        if (error) throw error;
        if (data?.url) {
          await Browser.open({
            url: data.url,
            presentationStyle: 'popover'
          });
        }
      } catch (error) {
        console.error('Apple auth error:', error);
        toast.error("Fehler bei der Apple-Anmeldung");
        isOAuthInProgress.current = false;
        setIsOAuthLoading(false);
      }
      return;
    }

    // Web Flow
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: 'https://app.ditax.ch/auth-success'
        }
      });
    } catch (error) {
      console.error('Apple auth error:', error);
      toast.error("Fehler bei der Apple-Anmeldung");
      isOAuthInProgress.current = false;
      setIsOAuthLoading(false);
    }
  };
  const handleWebAuthnAuth = () => {
    const isDespia = isDespiaNative();
    if (isDespia) {
      triggerDespiaPasskeyAuth(email || undefined);
      return;
    }
    navigate('/webauthn-auth');
  };
  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      handleCodeVerification(value);
    }
  };
  const handleCodeVerification = async (otpCode: string) => {
    setIsEmailLoading(true);
    try {
      const {
        error
      } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: 'email'
      });
      if (error) throw error;

      // Check if MFA is required
      const { data: mfaData } = await supabase.auth.mfa.listFactors();
      const verifiedFactors = mfaData?.totp?.filter((f) => f.status === 'verified') || [];

      if (verifiedFactors.length > 0) {
        // MFA is enabled - check if we need to verify
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

        if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
          // User needs to complete MFA challenge
          navigate('/mfa-verify', { state: { factorId: verifiedFactors[0].id } });
          return;
        }
      }

      toast.success(t.authFlow.loginSuccess);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || t.authFlow.codeVerificationError);
      setCode("");
    } finally {
      setIsEmailLoading(false);
    }
  };
  const handleBackClick = () => {
    setStep("main");
    setCode("");
  };
  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    setIsEmailLoading(true);
    try {
      const {
        error
      } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
      toast.success(t.authFlow.codeSent);
      setResendCountdown(25);
    } catch (error: any) {
      toast.error(error.message || t.authFlow.sendError);
    } finally {
      setIsEmailLoading(false);
    }
  };
  const handleWeiterClick = () => {
    if (code.length === 6) {
      handleCodeVerification(code);
    }
  };
  return <div className="min-h-screen text-foreground antialiased overflow-hidden relative bg-muted/30">

      {/* Animated gradient background blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <motion.div
          animate={{ x: [0, 30, -20, 0], y: [0, -40, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-1/4 -left-1/4 w-[60%] h-[60%] rounded-full opacity-[0.07]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
        <motion.div
          animate={{ x: [0, -25, 15, 0], y: [0, 30, -25, 0], scale: [1, 0.95, 1.1, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -bottom-1/4 -right-1/4 w-[50%] h-[50%] rounded-full opacity-[0.05]"
          style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
        />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-0 sm:p-6 lg:p-8">

        {/* Liquid Glass Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-full min-h-screen sm:min-h-0 max-w-[420px] rounded-none sm:rounded-[2.5rem] px-7 py-12 sm:px-10 sm:py-14 relative overflow-hidden"
          style={{
            background: 'hsla(var(--background) / 0.65)',
            backdropFilter: 'blur(40px) saturate(1.8)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.8)',
            boxShadow: '0 8px 60px -12px hsla(var(--primary) / 0.08), 0 0 0 1px hsla(var(--foreground) / 0.04), inset 0 1px 0 0 hsla(0 0% 100% / 0.5), inset 0 -1px 0 0 hsla(0 0% 0% / 0.02)',
          }}
        >
          {/* Inner glass shimmer edge */}
          <div className="absolute inset-0 rounded-none sm:rounded-[2.5rem] pointer-events-none" style={{
            background: 'linear-gradient(135deg, hsla(0 0% 100% / 0.2) 0%, transparent 40%, transparent 60%, hsla(0 0% 100% / 0.05) 100%)',
          }} />

          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {step === "main" ? <motion.div key="main-step" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}>

                  {/* Logo & Title */}
                  <div className="flex flex-col items-center text-center mb-10">
                    <img alt="Ditax" className="w-auto h-7 object-contain mb-8" src="/lovable-uploads/3691c98c-9243-4894-b562-0ecf0e208722.png" />
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground mb-1">
                      {t.authFlow.login}
                    </h1>
                    <p className="text-muted-foreground text-[13px] font-light">
                      {t.authFlow.loginSubtitle}
                    </p>
                  </div>

                  {/* Social Logins */}
                  <div className="space-y-2.5">
                    {/* Google */}
                    <button onClick={handleGoogleAuth} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl h-[52px] px-4 text-[14px] font-medium text-foreground transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:pointer-events-none" style={{
                      background: 'hsla(var(--background) / 0.6)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid hsla(var(--foreground) / 0.06)',
                      boxShadow: '0 1px 3px hsla(var(--foreground) / 0.04), inset 0 1px 0 hsla(0 0% 100% / 0.4)',
                    }}>
                      <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                      </svg>
                      <span>{t.authFlow.continueWithGoogle}</span>
                    </button>

                    {/* Apple */}
                    <button onClick={handleAppleAuth} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl h-[52px] px-4 text-[14px] font-medium text-foreground transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] focus:outline-none disabled:opacity-50 disabled:pointer-events-none" style={{
                      background: 'hsla(var(--background) / 0.6)',
                      backdropFilter: 'blur(12px)',
                      WebkitBackdropFilter: 'blur(12px)',
                      border: '1px solid hsla(var(--foreground) / 0.06)',
                      boxShadow: '0 1px 3px hsla(var(--foreground) / 0.04), inset 0 1px 0 hsla(0 0% 100% / 0.4)',
                    }}>
                      <svg className="w-[18px] h-[18px] shrink-0 fill-current" viewBox="0 0 24 24">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.48-.93 3.57-.84 1.5.12 2.65.72 3.4 1.8-.12.07-.12.09-.09.12-2.35 1.52-1.92 5.06.62 6.13-.53 1.55-1.32 3.11-2.58 4.93zM14.9 3.65c.66-1.12 1.12-2.31.95-3.65-1.32.12-2.65.81-3.32 1.95-.53.95-.98 2.2-.84 3.48 1.41.22 2.62-.6 3.21-1.78z" />
                      </svg>
                      <span>{t.authFlow.continueWithApple}</span>
                    </button>
                  </div>

                  {/* Divider */}
                  <div className="relative my-7">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full" style={{ borderTop: '1px solid hsla(var(--foreground) / 0.06)' }} />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-3 text-[11px] uppercase tracking-widest text-muted-foreground/60" style={{ background: 'hsla(var(--background) / 0.65)' }}>{t.authFlow.or}</span>
                    </div>
                  </div>

                  {/* Email Accordion */}
                  <div className="w-full">
                    <button
                      type="button"
                      onClick={() => setShowEmailForm(prev => !prev)}
                      className="flex w-full items-center justify-center gap-2 rounded-2xl h-[52px] px-4 text-[14px] font-medium text-muted-foreground transition-all duration-200 hover:text-foreground hover:scale-[1.01] active:scale-[0.98] focus:outline-none"
                      style={{
                        background: 'hsla(var(--background) / 0.6)',
                        backdropFilter: 'blur(12px)',
                        WebkitBackdropFilter: 'blur(12px)',
                        border: '1px solid hsla(var(--foreground) / 0.06)',
                        boxShadow: '0 1px 3px hsla(var(--foreground) / 0.04), inset 0 1px 0 hsla(0 0% 100% / 0.4)',
                      }}
                    >
                      <Mail className="w-4 h-4" />
                      <span>{'Mit E-Mail anmelden'}</span>
                      <motion.div animate={{ rotate: showEmailForm ? 180 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronDown className="w-4 h-4 ml-0.5" />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {showEmailForm && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2, ease: [0.25, 0.1, 0.25, 1] }}
                          className="overflow-hidden"
                        >
                          <form onSubmit={handleEmailSubmit} className="space-y-3 pt-4">
                            <div>
                              <label htmlFor="email" className="sr-only">{t.authFlow.emailPlaceholder}</label>
                              <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setIsInputFocused(true)} onBlur={() => setTimeout(() => setIsInputFocused(false), 150)} className="block w-full rounded-2xl h-[52px] px-5 text-[14px] text-foreground placeholder:text-muted-foreground/50 focus:outline-none transition-all" style={{
                                background: 'hsla(var(--background) / 0.5)',
                                backdropFilter: 'blur(8px)',
                                WebkitBackdropFilter: 'blur(8px)',
                                border: '1px solid hsla(var(--foreground) / 0.06)',
                                boxShadow: 'inset 0 2px 4px hsla(var(--foreground) / 0.02)',
                              }} placeholder={t.authFlow.emailPlaceholder} aria-label={t.authFlow.emailPlaceholder} required disabled={isLoading} />
                            </div>

                            <button type="submit" disabled={isLoading} className="group flex w-full items-center justify-center gap-3 h-[52px] px-6 rounded-full text-[14px] font-semibold tracking-tight transition-all duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] text-white shadow-[0_2px_8px_hsl(222,100%,56%,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] hover:shadow-[0_4px_16px_hsl(222,100%,56%,0.45),inset_0_1px_0_rgba(255,255,255,0.25)] hover:brightness-110">
                              <span>{isEmailLoading ? t.authFlow.sendingCode : t.authFlow.sendCode}</span>
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors group-hover:bg-white/25">
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-0.5 transition-transform"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                              </div>
                            </button>

                            <p className="text-center text-[11px] text-muted-foreground/60 leading-relaxed px-4 pt-1">
                              {t.authFlow.microcopy}
                            </p>
                          </form>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Footer Links */}
                  <div className="mt-12 flex flex-col items-center gap-3 text-[11px] text-muted-foreground/50">
                    <div className="flex items-center gap-3">
                      <a href="/impressum" className="hover:text-foreground transition-colors">Impressum</a>
                      <span className="text-border">·</span>
                      <a href="/datenschutzrichtlinie" className="hover:text-foreground transition-colors">Datenschutz</a>
                    </div>
                    <AuthLanguageToggle />
                  </div>

                </motion.div> : <motion.div key="code-step" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}>

                  {/* Logo */}
                  <div className="flex items-center justify-center gap-3 mb-10">
                    <img src="/lovable-uploads/3691c98c-9243-4894-b562-0ecf0e208722.png" alt="Ditax" className="w-auto h-7 object-contain" />
                  </div>

                  {/* Header */}
                  <div className="text-center mb-8 space-y-1.5">
                    <h1 className="text-[22px] font-semibold tracking-[-0.02em] text-foreground">
                      {t.authFlow.enterCode}
                    </h1>
                    <p className="text-[13px] text-muted-foreground font-light max-w-[85%] mx-auto leading-relaxed">
                      {t.authFlow.codeSentTo}{' '}
                      <span className="text-foreground font-medium">{email}</span>{' '}
                      {t.authFlow.codeSentToSuffix}
                    </p>
                  </div>

                  {/* OTP Form */}
                  <div className="space-y-5">
                    <div className="flex justify-between gap-2">
                      <InputOTP value={code} onChange={handleCodeChange} maxLength={6}>
                        <InputOTPGroup className="flex justify-between gap-2 w-full">
                           {[0,1,2,3,4,5].map(i => (
                             <InputOTPSlot key={i} index={i} className="w-full h-[52px] text-center text-lg font-semibold rounded-2xl transition-all text-foreground" style={{
                               background: 'hsla(var(--background) / 0.5)',
                               backdropFilter: 'blur(8px)',
                               WebkitBackdropFilter: 'blur(8px)',
                               border: '1px solid hsla(var(--foreground) / 0.06)',
                               boxShadow: 'inset 0 2px 4px hsla(var(--foreground) / 0.02)',
                             }} />
                           ))}
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <button onClick={handleWeiterClick} disabled={isLoading || code.length !== 6} className="flex w-full items-center justify-center h-[52px] px-6 rounded-2xl text-[14px] font-semibold tracking-tight transition-all duration-200 hover:scale-[1.01] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none" style={{
                      background: 'linear-gradient(135deg, hsl(var(--foreground)) 0%, hsla(var(--foreground) / 0.85) 100%)',
                      color: 'hsl(var(--background))',
                      boxShadow: '0 4px 14px -4px hsla(var(--foreground) / 0.3), inset 0 1px 0 hsla(0 0% 100% / 0.1)',
                    }}>
                      {isLoading ? t.authFlow.verifying : t.authFlow.verifyButton}
                    </button>
                  </div>

                  {/* Footer Actions */}
                  <div className="mt-8 flex flex-col items-center gap-3 text-center">
                    <p className="text-[13px] text-muted-foreground font-light">
                      {t.authFlow.noCodeReceived}
                      {resendCountdown > 0 ? <>
                          <span className="text-foreground font-medium ml-1">{t.authFlow.resend}</span>
                          <span className="ml-1 text-muted-foreground/60">({String(Math.floor(resendCountdown / 60)).padStart(2, '0')}:{String(resendCountdown % 60).padStart(2, '0')})</span>
                        </> : <button onClick={handleResendCode} disabled={isLoading} className="text-foreground hover:text-foreground/80 font-medium transition-colors ml-1">
                          {t.authFlow.resend}
                        </button>}
                    </p>

                    <button onClick={handleBackClick} className="flex items-center gap-1.5 text-[13px] text-muted-foreground/60 hover:text-foreground transition-colors mt-1">
                      <ChevronLeft className="w-3.5 h-3.5" />
                      {t.authFlow.backToLogin}
                    </button>
                  </div>

                </motion.div>}
            </AnimatePresence>
          </div>

        </motion.div>
      </div>

    </div>;
};
export default Auth;