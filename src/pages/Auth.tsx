import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowLeft, Mail, Fingerprint, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { isAndroidEnvironment } from "@/utils/platform";
import { FramerButton } from "@/components/ui/framer-button";
import { isDespiaNative, triggerDespiaPasskeyAuth } from "@/lib/despia";
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
        await new Promise(resolve => setTimeout(resolve, 300));
        
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
            await new Promise(resolve => setTimeout(resolve, 500));
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

    // DESPIA NATIVE FLOW - Easy OAuth gemäß https://lovable.despia.com/default-guide/native-features/easy-oauth
    if (isDespia) {
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('auth-start', {
          body: {
            provider: 'google',
            deeplink_scheme: 'ditax'
          }
        });
        if (error || !data?.url) {
          console.error('❌ Failed to get OAuth URL:', error);
          toast.error("Fehler beim Starten der Anmeldung");
          isOAuthInProgress.current = false;
          setIsOAuthLoading(false);
          return;
        }
        despia(`oauth://?url=${encodeURIComponent(data.url)}`);
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

    // DESPIA NATIVE FLOW - Easy OAuth gemäß https://lovable.despia.com/default-guide/native-features/easy-oauth
    if (isDespia) {
      try {
        const {
          data,
          error
        } = await supabase.functions.invoke('auth-start', {
          body: {
            provider: 'apple',
            deeplink_scheme: 'ditax'
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
      const verifiedFactors = mfaData?.totp?.filter(f => f.status === 'verified') || [];
      
      if (verifiedFactors.length > 0) {
        // MFA is enabled - check if we need to verify
        const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
        
        if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
          // User needs to complete MFA challenge
          navigate('/mfa-verify', { state: { factorId: verifiedFactors[0].id } });
          return;
        }
      }
      
      toast.success("Erfolgreich angemeldet!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Fehler bei der Code-Verifikation");
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
      toast.success("Code erneut gesendet!");
      setResendCountdown(25);
    } catch (error: any) {
      toast.error(error.message || "Fehler beim erneuten Senden des Codes");
    } finally {
      setIsEmailLoading(false);
    }
  };
  const handleWeiterClick = () => {
    if (code.length === 6) {
      handleCodeVerification(code);
    }
  };
  return <div className="min-h-screen bg-white text-slate-900 antialiased flex justify-center selection:bg-[#1D64FF]/30">
      {/* Mobile Container */}
      <div className="min-h-screen md:max-w-2xl w-full max-w-[430px] mr-auto ml-auto relative flex flex-col justify-center px-6 md:px-8 py-12 pb-72">

        {/* Main Login Content */}
        <div className="relative z-20 w-full">
          <AnimatePresence mode="wait">
            {step === "main" ? <motion.div key="main-step" initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -20
          }} transition={{
            duration: 0.3
          }}>
                {/* Logo Centered */}
                <div className="flex justify-center mb-10">
                  <img alt="Ditax" className="w-auto h-10 object-contain" src="/lovable-uploads/3691c98c-9243-4894-b562-0ecf0e208722.png" />
                </div>

                {/* Header */}
                <div className="text-center mb-10 space-y-2">
                  <h1 className="font-medium tracking-tighter font-jakarta text-slate-900 text-2xl">
                    Anmelden oder Registrieren  
                  </h1>
                  <p className="text-sm text-slate-500 font-jakarta">
                    Melde dich an, um fortzufahren
                  </p>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="text-lg font-semibold text-slate-800 font-jakarta">
                      Email:
                    </label>
                    <div className="relative">
                      <input type="email" name="email" id="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setIsInputFocused(true)} onBlur={() => setTimeout(() => setIsInputFocused(false), 150)} className="min-h-[56px] px-6 py-4 text-base rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-[#1D64FF] focus:ring-[#1D64FF]/20 focus:outline-none w-full font-jakarta" placeholder="name@mail.com" required disabled={isLoading} />
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-b from-blue-500 to-blue-600 text-white border-t border-blue-400 rounded-xl py-3.5 px-4 text-sm font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 font-jakarta disabled:opacity-50 disabled:pointer-events-none">
                    {isEmailLoading ? 'Code wird gesendet...' : 'Login Code senden'}
                  </button>
                </form>

                {/* Oder Divider - hidden when input is focused */}
                {!isInputFocused && <div className="flex items-center gap-4 w-full mt-10">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-sm text-slate-500 font-medium font-jakarta">Oder</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>}
              </motion.div> : <motion.div key="code-step" initial={{
            opacity: 0,
            y: 20
          }} animate={{
            opacity: 1,
            y: 0
          }} exit={{
            opacity: 0,
            y: -20
          }} transition={{
            duration: 0.3
          }}>
                {/* Logo Centered */}
                <div className="flex justify-center mb-10">
                  <img src="/ditax-logo-new.svg" alt="Ditax" className="w-auto h-10 object-contain" />
                </div>

                {/* Header with Shield Icon */}
                <div className="text-center mb-8 space-y-2">
                  
                  <h1 className="text-3xl font-medium tracking-tighter font-jakarta text-slate-900">
                    Code eingeben
                  </h1>
                  <p className="text-sm text-slate-500 font-jakarta max-w-[80%] mx-auto leading-relaxed">
                    Wir haben einen 6-stelligen Code an{' '}
                    <span className="text-slate-800 font-medium">{email}</span>{' '}
                    gesendet.
                  </p>
                </div>

                {/* OTP Form */}
                <div className="space-y-8">
                  {/* Code Inputs */}
                  <div className="flex justify-between gap-2">
                    <InputOTP value={code} onChange={handleCodeChange} maxLength={6}>
                      <InputOTPGroup className="flex justify-between gap-2 w-full">
                        <InputOTPSlot index={0} className="w-full h-14 text-center text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-slate-900" />
                        <InputOTPSlot index={1} className="w-full h-14 text-center text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-slate-900" />
                        <InputOTPSlot index={2} className="w-full h-14 text-center text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-slate-900" />
                        <InputOTPSlot index={3} className="w-full h-14 text-center text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-slate-900" />
                        <InputOTPSlot index={4} className="w-full h-14 text-center text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-slate-900" />
                        <InputOTPSlot index={5} className="w-full h-14 text-center text-xl font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-slate-900" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {/* Verify Button */}
                  <button onClick={handleWeiterClick} disabled={isLoading || code.length !== 6} className="w-full bg-gradient-to-b from-blue-500 to-blue-600 text-white border-t border-blue-400 rounded-xl py-3.5 px-4 text-sm font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 group font-jakarta disabled:opacity-50 disabled:pointer-events-none">
                    {isLoading ? 'Wird überprüft...' : 'Verifizieren'}
                  </button>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-xs text-slate-500 font-jakarta">
                    Keinen Code erhalten?
                    {resendCountdown > 0 ? <>
                        <span className="text-slate-700 font-medium ml-1">Erneut senden</span>
                        <span className="ml-1 text-slate-400">({String(Math.floor(resendCountdown / 60)).padStart(2, '0')}:{String(resendCountdown % 60).padStart(2, '0')})</span>
                      </> : <button onClick={handleResendCode} disabled={isLoading} className="text-slate-700 hover:text-slate-900 font-medium transition-colors ml-1">
                        Erneut senden
                      </button>}
                  </p>
                  
                  <button onClick={handleBackClick} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors font-jakarta mt-2">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Zurück zum Login
                  </button>
                </div>
              </motion.div>}
          </AnimatePresence>

        </div>
      </div>

      {/* Floating Bottom Social Login Island - Only show on main step */}
      {step === "main" && !isInputFocused && <div className="fixed bottom-0 left-0 right-0 w-full pointer-events-none z-50">
          {/* Gradient Fade Background */}
          <div className="absolute bottom-0 w-full h-48 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />

          {/* The Domed Button Container */}
          <motion.div className="relative w-full flex justify-center items-end pb-0 pointer-events-auto" initial={{
        opacity: 0,
        y: 50
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.5,
        delay: 0.2
      }}>
            <div className="flex flex-col items-center overflow-hidden w-full pt-3 px-6 pb-8 relative shadow-[0_-8px_30px_-5px_rgba(0,0,0,0.3)] rounded-t-3xl bg-gradient-to-b from-slate-700 to-slate-900 border-t border-slate-600">
              {/* Pill Handle Divider */}
              <div className="w-10 h-1 rounded-full bg-slate-500 mb-4" />
              
              <div className="relative z-10 flex flex-col gap-2.5 w-full max-w-[430px] md:max-w-2xl mx-auto px-0 md:px-2">
                {/* Google Login */}
                <button onClick={handleGoogleAuth} disabled={isLoading} className="bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700 border border-slate-200 rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 w-full group disabled:opacity-50 disabled:pointer-events-none">
                  <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="font-medium text-[15px] tracking-tight">Weiter mit Google</span>
                </button>

                {/* Apple Login */}
                <button onClick={handleAppleAuth} disabled={isLoading} className="bg-gradient-to-b from-slate-50 to-slate-100 text-slate-700 border border-slate-200 rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 w-full group disabled:opacity-50 disabled:pointer-events-none">
                  <svg className="w-5 h-5 shrink-0 fill-current text-slate-800 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.48-.93 3.57-.84 1.5.12 2.65.72 3.4 1.8-.12.07-.12.09-.09.12-2.35 1.52-1.92 5.06.62 6.13-.53 1.55-1.32 3.11-2.58 4.93zM14.9 3.65c.66-1.12 1.12-2.31.95-3.65-1.32.12-2.65.81-3.32 1.95-.53.95-.98 2.2-.84 3.48 1.41.22 2.62-.6 3.21-1.78z" />
                  </svg>
                  <span className="font-medium text-[15px] tracking-tight">Weiter mit Apple</span>
                </button>

              </div>

              {/* Footer Links with centered Aikido Badge */}
              <div className="mt-6 flex justify-center items-center gap-4 text-[13px] text-slate-400 font-medium font-jakarta">
                <a href="/impressum" className="hover:text-white transition-colors">Impressum</a>
                <span className="w-1 h-1 bg-slate-500 rounded-full"></span>
                
                
                <a className="hover:text-white transition-colors" href="/datenschutzrichtlinie">Datenschutz</a>
                
                
              </div>
            </div>
          </motion.div>
        </div>}

    </div>;
};
export default Auth;