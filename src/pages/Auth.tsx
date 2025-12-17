import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowLeft, Mail, Fingerprint, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { isAndroidEnvironment, isDespiaEnvironment } from "@/utils/platform";
import { FramerButton } from "@/components/ui/framer-button";
const Auth = () => {
  const navigate = useNavigate();
  const {
    t
  } = useI18n();
  const [step, setStep] = useState<"main" | "code">("main");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const isOAuthInProgress = useRef(false);
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
      toast.success("Code gesendet! Prüfen Sie Ihre E-Mails.");
      setStep("code");
      setResendCountdown(25);
    } catch (error: any) {
      toast.error(error.message || "Fehler beim Senden des Codes");
    } finally {
      setIsLoading(false);
    }
  };
  const handleGoogleAuth = async () => {
    if (isOAuthInProgress.current) {
      console.log('⚠️ Google OAuth bereits in Bearbeitung, ignoriere Klick');
      return;
    }
    isOAuthInProgress.current = true;
    setIsLoading(true);
    const isDespia = isDespiaEnvironment();
    const isNativeCapacitor = Capacitor.isNativePlatform();
    console.log('🔗 Google Auth - isDespia:', isDespia, 'isNativeCapacitor:', isNativeCapacitor);
    if (isDespia) {
      console.log('🔗 Despia detected - OAuth mit Standard-Redirect');
      try {
        const {
          error
        } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'https://app.ditax.ch/auth-success'
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error('Google auth error (Despia):', error);
        toast.error("Fehler bei der Google-Anmeldung");
        isOAuthInProgress.current = false;
        setIsLoading(false);
      }
      return;
    }
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
        setIsLoading(false);
      }
      return;
    }
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
      setIsLoading(false);
    }
  };
  const handleAppleAuth = async () => {
    if (isOAuthInProgress.current) {
      console.log('⚠️ Apple OAuth bereits in Bearbeitung, ignoriere Klick');
      return;
    }
    isOAuthInProgress.current = true;
    setIsLoading(true);
    const isDespia = isDespiaEnvironment();
    const isNativeCapacitor = Capacitor.isNativePlatform();
    console.log('🔗 Apple Auth - isDespia:', isDespia, 'isNativeCapacitor:', isNativeCapacitor);
    if (isDespia) {
      console.log('🔗 Despia detected - Apple OAuth mit Standard-Redirect');
      try {
        const {
          error
        } = await supabase.auth.signInWithOAuth({
          provider: 'apple',
          options: {
            redirectTo: 'https://app.ditax.ch/auth-success'
          }
        });
        if (error) throw error;
      } catch (error) {
        console.error('Apple auth error (Despia):', error);
        toast.error("Fehler bei der Apple-Anmeldung");
        isOAuthInProgress.current = false;
        setIsLoading(false);
      }
      return;
    }
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
        setIsLoading(false);
      }
      return;
    }
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
      setIsLoading(false);
    }
  };
  const handleWebAuthnAuth = () => {
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
      toast.success("Erfolgreich angemeldet!");
      navigate("/");
    } catch (error: any) {
      toast.error(error.message || "Fehler bei der Code-Verifikation");
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
      toast.success("Code erneut gesendet!");
      setResendCountdown(25);
    } catch (error: any) {
      toast.error(error.message || "Fehler beim erneuten Senden des Codes");
    } finally {
      setIsLoading(false);
    }
  };
  const handleWeiterClick = () => {
    if (code.length === 6) {
      handleCodeVerification(code);
    }
  };
  return <div className="min-h-screen bg-[#020408] text-zinc-100 antialiased flex justify-center selection:bg-[#1D64FF]/30">
      {/* Mobile Container */}
      <div className="min-h-screen md:max-w-2xl w-full max-w-[430px] mr-auto ml-auto relative flex flex-col justify-center px-6 md:px-8 py-12 pb-72">
        {/* Background Ambient Glow */}
        <div className="absolute top-0 left-0 w-full h-[500px] z-0 pointer-events-none opacity-90" style={{
        background: 'radial-gradient(circle at 50% -15%, rgba(29, 100, 255, 0.22) 0%, rgba(29, 100, 255, 0.05) 50%, transparent 90%)',
        filter: 'blur(60px)'
      }} />

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
                  <img src="/ditax-logo-new.png" alt="Ditax" className="w-auto h-10 object-contain" />
                </div>

                {/* Header */}
                <div className="text-center mb-10 space-y-2">
                  <h1 className="font-medium tracking-tighter font-jakarta bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400 text-2xl">
                    Anmelden oder Registrieren  
                  </h1>
                  <p className="text-sm text-zinc-500 font-jakarta">
                    Melde dich an, um fortzufahren
                  </p>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    
                    <div className="relative">
                      <input type="email" name="email" id="email" value={email} onChange={e => setEmail(e.target.value)} onFocus={() => setIsInputFocused(true)} onBlur={() => setIsInputFocused(false)} className="block w-full min-h-[56px] rounded-xl border border-white/10 bg-[#0a0f1a] px-6 py-4 text-base text-white text-center placeholder:text-zinc-500 placeholder:text-center focus:outline-none focus:border-[#1D64FF] focus:ring-[#1D64FF]/20 transition-all font-jakarta" placeholder="name@firma.com" required disabled={isLoading} />
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className="w-full bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white rounded-xl py-3.5 px-4 text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] font-jakarta disabled:opacity-50">
                    {isLoading ? 'Code wird gesendet...' : 'Anmelden'}
                  </button>
                </form>

                {/* Oder Divider */}
                <div className="flex items-center gap-4 w-full mt-10">
                  <div className="flex-1 h-px bg-zinc-700" />
                  <span className="text-sm text-zinc-500 font-medium font-jakarta">Oder</span>
                  <div className="flex-1 h-px bg-zinc-700" />
                </div>
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
                  <img src="/ditax-logo-new.png" alt="Ditax" className="w-auto h-10 object-contain" />
                </div>

                {/* Header with Shield Icon */}
                <div className="text-center mb-8 space-y-2">
                  
                  <h1 className="text-3xl font-medium tracking-tighter font-jakarta bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                    Code eingeben
                  </h1>
                  <p className="text-sm text-zinc-500 font-jakarta max-w-[80%] mx-auto leading-relaxed">
                    Wir haben einen 6-stelligen Code an{' '}
                    <span className="text-zinc-200 font-medium">{email}</span>{' '}
                    gesendet.
                  </p>
                </div>

                {/* OTP Form */}
                <div className="space-y-8">
                  {/* Code Inputs */}
                  <div className="flex justify-between gap-2">
                    <InputOTP value={code} onChange={handleCodeChange} maxLength={6}>
                      <InputOTPGroup className="flex justify-between gap-2 w-full">
                        <InputOTPSlot index={0} className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" />
                        <InputOTPSlot index={1} className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" />
                        <InputOTPSlot index={2} className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" />
                        <InputOTPSlot index={3} className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" />
                        <InputOTPSlot index={4} className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" />
                        <InputOTPSlot index={5} className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {/* Verify Button */}
                  <button onClick={handleWeiterClick} disabled={isLoading || code.length !== 6} className="w-full bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white rounded-xl py-3.5 px-4 text-sm font-semibold shadow-sm hover:shadow-md transition-all duration-200 active:scale-[0.98] flex items-center justify-center gap-2 group font-jakarta disabled:opacity-50">
                    {isLoading ? 'Wird überprüft...' : 'Verifizieren'}
                    {!isLoading}
                  </button>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-xs text-zinc-500 font-jakarta">
                    Keinen Code erhalten?
                    {resendCountdown > 0 ? <>
                        <span className="text-zinc-300 font-medium ml-1">Erneut senden</span>
                        <span className="ml-1 text-zinc-600">({String(Math.floor(resendCountdown / 60)).padStart(2, '0')}:{String(resendCountdown % 60).padStart(2, '0')})</span>
                      </> : <button onClick={handleResendCode} disabled={isLoading} className="text-zinc-300 hover:text-white font-medium transition-colors ml-1">
                        Erneut senden
                      </button>}
                  </p>
                  
                  <button onClick={handleBackClick} className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-jakarta mt-2">
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
          <div className="absolute bottom-0 w-full h-48 bg-gradient-to-t from-[#020203] via-[#020203]/90 to-transparent pointer-events-none" />

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
            <div className="flex flex-col items-center overflow-hidden w-full pt-3 pr-6 pb-8 pl-6 relative shadow-[0_-8px_30px_-5px_rgba(255,255,255,0.1)] rounded-t-3xl bg-primary-foreground">
              {/* Pill Handle Divider */}
              <div className="w-10 h-1 rounded-full bg-zinc-600 mb-4" />
              
              {/* Subtle Top Highlight */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent opacity-50" />
              
              {/* Inner Gradient */}
              <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-slate-50/80 to-transparent pointer-events-none" />
              
              <div className="relative z-10 flex flex-col gap-2.5 w-full">
                {/* Google Login */}
                <button onClick={handleGoogleAuth} disabled={isLoading} className="hover:bg-slate-50 hover:text-slate-900 flex transition-all duration-200 active:scale-[0.98] hover:shadow-md group overflow-hidden text-slate-700 bg-white w-full border-slate-200/80 border rounded-xl py-3.5 px-4 relative shadow-sm gap-x-3 items-center justify-center disabled:opacity-50">
                  <svg className="w-5 h-5 shrink-0 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  <span className="font-medium text-[15px] tracking-tight">Weiter mit Google</span>
                </button>

                {/* Apple Login */}
                <button onClick={handleAppleAuth} disabled={isLoading} className="w-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md group disabled:opacity-50">
                  <svg className="w-5 h-5 shrink-0 fill-current text-slate-800 transition-transform group-hover:scale-110 duration-300" viewBox="0 0 24 24">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.48-.93 3.57-.84 1.5.12 2.65.72 3.4 1.8-.12.07-.12.09-.09.12-2.35 1.52-1.92 5.06.62 6.13-.53 1.55-1.32 3.11-2.58 4.93zM14.9 3.65c.66-1.12 1.12-2.31.95-3.65-1.32.12-2.65.81-3.32 1.95-.53.95-.98 2.2-.84 3.48 1.41.22 2.62-.6 3.21-1.78z" />
                  </svg>
                  <span className="font-medium text-[15px] tracking-tight">Weiter mit Apple</span>
                </button>

                {/* Passkey Login */}
                <button onClick={handleWebAuthnAuth} disabled={isLoading} className="w-full bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200/80 rounded-xl py-3.5 px-4 flex items-center justify-center gap-3 transition-all duration-200 active:scale-[0.98] shadow-sm hover:shadow-md group disabled:opacity-50">
                  <Fingerprint className="w-5 h-5 shrink-0 text-slate-500 group-hover:text-slate-800 transition-colors" />
                  <span className="font-medium text-[15px] tracking-tight">Weiter mit Passkey</span>
                </button>
              </div>

              {/* Footer Links */}
              <div className="mt-6 flex justify-center items-center gap-4 text-[13px] text-slate-400 font-medium font-jakarta">
                <a href="/terms" className="hover:text-slate-600 transition-colors">Impressum</a>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <a href="/privacy" className="hover:text-slate-600 transition-colors">Datenschutz</a>
                <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                <a href="/help" className="hover:text-slate-600 transition-colors">Hilfe</a>
              </div>
            </div>
          </motion.div>
        </div>}
    </div>;
};
export default Auth;