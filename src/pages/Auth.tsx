import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowLeft, Mail, Fingerprint, ShieldCheck } from "lucide-react";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { isAndroidEnvironment } from "@/utils/platform";
import { FramerButton } from "@/components/ui/framer-button";
import { isDespiaNative, isDespiaIOS, triggerDespiaPasskeyAuth, DEEPLINK_SCHEME } from "@/lib/despia";
import { getAppleOAuthUrl } from "@/lib/apple-auth";
import despia from 'despia-native';
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
  return <div className="min-h-screen bg-white text-slate-900 antialiased selection:bg-[#1D64FF]/30 overflow-hidden relative">

      {/* Ambient Background Lighting */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-blue-100 rounded-full blur-3xl mix-blend-multiply opacity-70 animate-pulse" />
        <div className="absolute top-1/2 right-1/4 w-80 h-80 bg-cyan-100 rounded-full blur-3xl mix-blend-multiply opacity-70" />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-indigo-100 rounded-full blur-3xl mix-blend-multiply opacity-70" />
      </div>

      {/* Main Container */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8">

        {/* Glass Card */}
        <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white/70 p-8 shadow-2xl shadow-slate-200/50 backdrop-blur-xl sm:p-12">

          <AnimatePresence mode="wait">
            {step === "main" ? <motion.div key="main-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>

                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <img alt="Ditax" className="w-auto h-10 object-contain" src="/lovable-uploads/3691c98c-9243-4894-b562-0ecf0e208722.png" />
                </div>

                {/* Header */}
                <div className="text-center mb-8">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900 mb-2">
                    {t.authFlow.login}
                  </h1>
                  <p className="text-slate-500 font-normal text-xs">
                    {t.authFlow.loginSubtitle}
                  </p>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="sr-only">{t.authFlow.emailPlaceholder}</label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400 group-focus-within:text-blue-600 transition-colors">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input type="email" name="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => setIsInputFocused(true)} onBlur={() => setTimeout(() => setIsInputFocused(false), 150)} className="block w-full rounded-2xl border border-slate-200 bg-white py-4 pl-12 pr-4 text-lg text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm hover:border-slate-300" placeholder={t.authFlow.emailPlaceholder} aria-label={t.authFlow.emailPlaceholder} required disabled={isLoading} />
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 py-4 text-lg font-medium text-white shadow-lg shadow-blue-500/20 border-t border-blue-400 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-white transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none">
                    {isEmailLoading ? t.authFlow.sendingCode : t.authFlow.sendCode}
                  </button>

                  <p className="text-center text-sm text-slate-500 leading-relaxed px-4">
                    {t.authFlow.microcopy}
                  </p>
                </form>

                {/* Divider */}
                <div className="relative my-10">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-white/70 backdrop-blur-xl px-4 text-base text-slate-500 rounded-full">{t.authFlow.or}</span>
                  </div>
                </div>

                {/* Social Logins */}
                <div className="space-y-4">
                  {/* Google */}
                  <button onClick={handleGoogleAuth} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-4 px-4 text-base font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none group">
                    <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    <span>{t.authFlow.continueWithGoogle}</span>
                  </button>

                  {/* Apple */}
                  <button onClick={handleAppleAuth} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-4 px-4 text-base font-medium text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:border-slate-300 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-slate-200 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none group">
                    <svg className="w-5 h-5 shrink-0 fill-current text-slate-900 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.48-.93 3.57-.84 1.5.12 2.65.72 3.4 1.8-.12.07-.12.09-.09.12-2.35 1.52-1.92 5.06.62 6.13-.53 1.55-1.32 3.11-2.58 4.93zM14.9 3.65c.66-1.12 1.12-2.31.95-3.65-1.32.12-2.65.81-3.32 1.95-.53.95-.98 2.2-.84 3.48 1.41.22 2.62-.6 3.21-1.78z" />
                    </svg>
                    <span>{t.authFlow.continueWithApple}</span>
                  </button>
                </div>

                {/* Footer Links */}
                <div className="mt-12 flex flex-col items-center justify-between gap-6 sm:flex-row text-sm text-slate-500">
                  <div className="flex gap-6">
                    <a href="/impressum" className="hover:text-slate-900 transition-colors">Impressum</a>
                    <span className="text-slate-300">•</span>
                    <a href="/datenschutzrichtlinie" className="hover:text-slate-900 transition-colors">Datenschutz</a>
                  </div>
                  <LanguageDropdown variant="compact" />
                </div>

              </motion.div> : <motion.div key="code-step" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3 }}>

                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                  <img src="/lovable-uploads/3691c98c-9243-4894-b562-0ecf0e208722.png" alt="Ditax" className="w-auto h-10 object-contain" />
                </div>

                {/* Header */}
                <div className="text-center mb-8 space-y-2">
                  <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                    {t.authFlow.enterCode}
                  </h1>
                  <p className="text-base text-slate-500 max-w-[80%] mx-auto leading-relaxed">
                    {t.authFlow.codeSentTo}{' '}
                    <span className="text-slate-800 font-medium">{email}</span>{' '}
                    {t.authFlow.codeSentToSuffix}
                  </p>
                </div>

                {/* OTP Form */}
                <div className="space-y-8">
                  <div className="flex justify-between gap-2">
                    <InputOTP value={code} onChange={handleCodeChange} maxLength={6}>
                      <InputOTPGroup className="flex justify-between gap-2 w-full">
                        <InputOTPSlot index={0} className="w-full h-14 text-center text-xl font-semibold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900" />
                        <InputOTPSlot index={1} className="w-full h-14 text-center text-xl font-semibold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900" />
                        <InputOTPSlot index={2} className="w-full h-14 text-center text-xl font-semibold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900" />
                        <InputOTPSlot index={3} className="w-full h-14 text-center text-xl font-semibold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900" />
                        <InputOTPSlot index={4} className="w-full h-14 text-center text-xl font-semibold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900" />
                        <InputOTPSlot index={5} className="w-full h-14 text-center text-xl font-semibold bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-slate-900" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  <button onClick={handleWeiterClick} disabled={isLoading || code.length !== 6} className="flex w-full items-center justify-center rounded-2xl bg-gradient-to-b from-blue-500 to-blue-600 py-4 text-lg font-medium text-white shadow-lg shadow-blue-500/20 border-t border-blue-400 hover:-translate-y-0.5 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none">
                    {isLoading ? t.authFlow.verifying : t.authFlow.verifyButton}
                  </button>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-sm text-slate-500">
                    {t.authFlow.noCodeReceived}
                    {resendCountdown > 0 ? <>
                        <span className="text-slate-700 font-medium ml-1">{t.authFlow.resend}</span>
                        <span className="ml-1 text-slate-400">({String(Math.floor(resendCountdown / 60)).padStart(2, '0')}:{String(resendCountdown % 60).padStart(2, '0')})</span>
                      </> : <button onClick={handleResendCode} disabled={isLoading} className="text-slate-700 hover:text-slate-900 font-medium transition-colors ml-1">
                        {t.authFlow.resend}
                      </button>}
                  </p>

                  <button onClick={handleBackClick} className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mt-2">
                    <ArrowLeft className="w-4 h-4" />
                    {t.authFlow.backToLogin}
                  </button>
                </div>

              </motion.div>}
          </AnimatePresence>

        </div>
      </div>

    </div>;
};
export default Auth;