import { useNavigate, useSearchParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowLeft } from "lucide-react";
import { LanguageDropdown } from "@/components/ui/language-dropdown";
import { isDespiaNative, triggerDespiaPasskeyAuth } from "@/lib/despia";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { t } = useI18n();
  const [step, setStep] = useState<"main" | "code">("main");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);

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
        setIsLoading(true);
        
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
          setIsLoading(false);
          window.history.replaceState({}, '', '/auth');
        }
        return;
      }

      // LEGACY: Handle tokens passed directly in URL (for web flow or old deeplinks)
      if (finalAccessToken) {
        setIsLoading(true);
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
          setIsLoading(false);
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
    setIsLoading(true);
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
      setIsLoading(false);
    }
  };
  // Social login functions removed for App Store review - will be re-added later
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
    setIsLoading(true);
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
      
      toast.success(t.authFlow.loginSuccess);
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || t.authFlow.codeVerificationError);
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };
  const handleBackClick = () => {
    setStep("main");
    setCode("");
  };
  const handleResendCode = async () => {
    if (resendCountdown > 0) return;
    setIsLoading(true);
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
      setIsLoading(false);
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
                <div className="flex justify-center mb-6">
                  <img alt="Ditax" className="w-auto h-10 object-contain" src="/lovable-uploads/3691c98c-9243-4894-b562-0ecf0e208722.png" />
                </div>

                {/* Header */}
                <div className="text-center mb-5 space-y-1">
                  <h1 className="font-normal tracking-tight font-jakarta text-slate-600 text-lg">
                    {t.authFlow.login}
                  </h1>
                  <p className="text-sm text-slate-400 font-jakarta">
                    {t.authFlow.loginSubtitle}
                  </p>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  <div>
                    <label htmlFor="email" className="sr-only">{t.authFlow.emailPlaceholder}</label>
                    <input type="email" name="email" id="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setIsInputFocused(true)} onBlur={() => setTimeout(() => setIsInputFocused(false), 150)} className="min-h-[52px] px-5 py-3.5 text-base rounded-xl bg-slate-50 border border-slate-200 text-slate-800 placeholder:text-slate-400 focus:border-[#1D64FF] focus:ring-[#1D64FF]/20 focus:outline-none w-full font-jakarta" placeholder={t.authFlow.emailPlaceholder} aria-label={t.authFlow.emailPlaceholder} required disabled={isLoading} />
                  </div>

                  <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-b from-blue-500 to-blue-600 text-white border-t border-blue-400 rounded-xl py-3.5 px-4 text-[15px] font-semibold hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 font-jakarta disabled:opacity-50 disabled:pointer-events-none">
                    {isLoading ? t.authFlow.sendingCode : t.authFlow.sendCode}
                  </button>
                  
                  {/* Microcopy */}
                  <div className="text-center pt-1.5">
                    <p className="text-xs text-slate-400 font-jakarta leading-relaxed">
                      {t.authFlow.microcopy}
                    </p>
                  </div>
                </form>

                {/* Oder Divider - hidden when input is focused */}
                {!isInputFocused && <div className="flex items-center gap-4 w-full mt-14">
                    <div className="flex-1 h-px bg-slate-300" />
                    <span className="text-sm text-slate-600 font-medium font-jakarta">{t.authFlow.or}</span>
                    <div className="flex-1 h-px bg-slate-300" />
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
                <div className="flex justify-center mb-6">
                  <img src="/lovable-uploads/3691c98c-9243-4894-b562-0ecf0e208722.png" alt="Ditax" className="w-auto h-10 object-contain" />
                </div>

                {/* Header with Shield Icon */}
                <div className="text-center mb-8 space-y-2">
                  
                  <h1 className="text-lg font-normal tracking-tight font-jakarta text-slate-600">
                    {t.authFlow.enterCode}
                  </h1>
                  <p className="text-sm text-slate-500 font-jakarta max-w-[80%] mx-auto leading-relaxed">
                    {t.authFlow.codeSentTo}{' '}
                    <span className="text-slate-800 font-medium">{email}</span>{' '}
                    {t.authFlow.codeSentToSuffix}
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
                    {isLoading ? t.authFlow.verifying : t.authFlow.verifyButton}
                  </button>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-xs text-slate-500 font-jakarta">
                    {t.authFlow.noCodeReceived}
                    {resendCountdown > 0 ? <>
                        <span className="text-slate-700 font-medium ml-1">{t.authFlow.resend}</span>
                        <span className="ml-1 text-slate-400">({String(Math.floor(resendCountdown / 60)).padStart(2, '0')}:{String(resendCountdown % 60).padStart(2, '0')})</span>
                      </> : <button onClick={handleResendCode} disabled={isLoading} className="text-slate-700 hover:text-slate-900 font-medium transition-colors ml-1">
                        {t.authFlow.resend}
                      </button>}
                  </p>
                  
                  <button onClick={handleBackClick} className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-700 transition-colors font-jakarta mt-2">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    {t.authFlow.backToLogin}
                  </button>
                </div>
              </motion.div>}
          </AnimatePresence>

        </div>
      </div>

      {/* Footer Links - Only show on main step */}
      {step === "main" && !isInputFocused && <div className="fixed bottom-0 left-0 right-0 w-full pointer-events-none z-50">
          {/* Gradient Fade Background */}
          <div className="absolute bottom-0 w-full h-32 bg-gradient-to-t from-white via-white/90 to-transparent pointer-events-none" />

          <motion.div className="relative w-full flex justify-center items-end pb-6 md:pb-8 pointer-events-auto" initial={{
        opacity: 0,
        y: 20
      }} animate={{
        opacity: 1,
        y: 0
      }} transition={{
        duration: 0.4,
        delay: 0.2
      }}>
            {/* Footer Links */}
            <div className="flex justify-center items-center gap-3 text-[13px] text-slate-500 font-medium font-jakarta">
              <a href="/impressum" className="hover:text-slate-700 transition-colors">Impressum</a>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <a className="hover:text-slate-700 transition-colors" href="/datenschutzrichtlinie">Datenschutz</a>
              <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
              <LanguageDropdown variant="compact" />
            </div>
          </motion.div>
        </div>}

    </div>;
};
export default Auth;