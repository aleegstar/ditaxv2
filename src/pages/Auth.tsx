import { useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/contexts/I18nContext";
import { ArrowLeft, ArrowRight, Mail, Fingerprint, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { isAndroidEnvironment, isDespiaEnvironment } from "@/utils/platform";
import { FramerButton } from "@/components/ui/framer-button";

const Auth = () => {
  const navigate = useNavigate();
  const { t } = useI18n();
  const [step, setStep] = useState<"main" | "code">("main");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  
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
      const { error } = await supabase.auth.signInWithOtp({
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
        const { error } = await supabase.auth.signInWithOAuth({
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
        const { data, error } = await supabase.auth.signInWithOAuth({
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
        const { error } = await supabase.auth.signInWithOAuth({
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
        const { data, error } = await supabase.auth.signInWithOAuth({
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
      const { error } = await supabase.auth.verifyOtp({
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
      const { error } = await supabase.auth.signInWithOtp({
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

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-100 antialiased flex justify-center selection:bg-[#1D64FF]/30">
      {/* Mobile Container */}
      <div className="min-h-screen md:max-w-2xl w-full max-w-[430px] mr-auto ml-auto relative flex flex-col justify-center px-6 md:px-8 py-12">
        {/* Background Ambient Glow */}
        <div 
          className="absolute top-0 left-0 w-full h-[500px] z-0 pointer-events-none opacity-90"
          style={{
            background: 'radial-gradient(circle at 50% -15%, rgba(29, 100, 255, 0.22) 0%, rgba(29, 100, 255, 0.05) 50%, transparent 90%)',
            filter: 'blur(60px)'
          }}
        />

        {/* Main Login Content */}
        <div className="relative z-20 w-full">
          <AnimatePresence mode="wait">
            {step === "main" ? (
              <motion.div
                key="main-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Logo Centered */}
                <div className="flex justify-center mb-10">
                  <img 
                    src="/ditax-logo-new.png" 
                    alt="Ditax" 
                    className="w-auto h-10 object-contain"
                  />
                </div>

                {/* Header */}
                <div className="text-center mb-10 space-y-2">
                  <h1 className="text-3xl font-medium tracking-tighter font-jakarta bg-clip-text text-transparent bg-gradient-to-b from-white to-zinc-400">
                    Willkommen zurück
                  </h1>
                  <p className="text-sm text-zinc-500 font-jakarta">
                    Melde dich an, um fortzufahren
                  </p>
                </div>

                {/* Social Login */}
                <div className="space-y-3">
                  {/* Google */}
                  <FramerButton
                    type="button"
                    variant="outline"
                    onClick={handleGoogleAuth}
                    disabled={isLoading}
                    className="font-jakarta"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Weiter mit Google
                  </FramerButton>

                  {/* Apple */}
                  <FramerButton
                    type="button"
                    variant="outline"
                    onClick={handleAppleAuth}
                    disabled={isLoading}
                    className="font-jakarta"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                    Weiter mit Apple
                  </FramerButton>

                  {/* Passkey */}
                  <FramerButton
                    type="button"
                    variant="outline"
                    onClick={handleWebAuthnAuth}
                    disabled={isLoading}
                    className="font-jakarta"
                  >
                    <Fingerprint className="w-5 h-5" />
                    Weiter mit Passkey
                  </FramerButton>
                </div>

                {/* Divider */}
                <div className="relative flex py-8 items-center">
                  <div className="flex-grow border-t border-white/10"></div>
                  <span className="flex-shrink-0 mx-4 text-zinc-600 text-xs font-jakarta uppercase tracking-wider">
                    oder
                  </span>
                  <div className="flex-grow border-t border-white/10"></div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleEmailSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-xs font-medium text-zinc-400 font-jakarta ml-1">
                      E-Mail Adresse
                    </label>
                    <div className="relative group">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-[#1D64FF] transition-colors">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        type="email"
                        name="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="block w-full rounded-full border border-white/10 bg-white/5 pl-10 pr-3 py-3 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 transition-all font-jakarta shadow-inner"
                        placeholder="name@firma.com"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <FramerButton
                    type="submit"
                    variant="primary"
                    disabled={isLoading}
                    className="w-full h-12 text-sm font-semibold font-jakarta"
                  >
                    {isLoading ? 'Code wird gesendet...' : 'Anmelden'}
                  </FramerButton>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                  <p className="text-xs text-zinc-500 font-jakarta">
                    Noch kein Konto?{' '}
                    <a href="#" className="text-[#1D64FF] hover:text-[#1D64FF]/80 font-medium transition-colors">
                      Registrieren
                    </a>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="code-step"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {/* Logo Centered */}
                <div className="flex justify-center mb-10">
                  <img 
                    src="/ditax-logo-new.png" 
                    alt="Ditax" 
                    className="w-auto h-10 object-contain"
                  />
                </div>

                {/* Header with Shield Icon */}
                <div className="text-center mb-8 space-y-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/[0.03] border border-white/10 mb-4 text-[#1D64FF]">
                    <ShieldCheck className="w-6 h-6" strokeWidth={1.5} />
                  </div>
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
                        <InputOTPSlot 
                          index={0} 
                          className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" 
                        />
                        <InputOTPSlot 
                          index={1} 
                          className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" 
                        />
                        <InputOTPSlot 
                          index={2} 
                          className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" 
                        />
                        <InputOTPSlot 
                          index={3} 
                          className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" 
                        />
                        <InputOTPSlot 
                          index={4} 
                          className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" 
                        />
                        <InputOTPSlot 
                          index={5} 
                          className="w-full h-14 text-center text-xl font-semibold bg-white/[0.03] border border-white/10 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#1D64FF]/50 focus:border-[#1D64FF]/50 focus:bg-[#1D64FF]/5 transition-all text-white" 
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>

                  {/* Verify Button */}
                  <button
                    onClick={handleWeiterClick}
                    disabled={isLoading || code.length !== 6}
                    className="w-full bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white rounded-full py-3 text-sm font-semibold shadow-[0_0_20px_-5px_rgba(29,100,255,0.4)] transition-all flex items-center justify-center gap-2 group font-jakarta disabled:opacity-50"
                  >
                    {isLoading ? 'Wird überprüft...' : 'Verifizieren'}
                    {!isLoading && (
                      <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                    )}
                  </button>
                </div>

                {/* Footer Actions */}
                <div className="mt-8 flex flex-col items-center gap-4 text-center">
                  <p className="text-xs text-zinc-500 font-jakarta">
                    Keinen Code erhalten?
                    {resendCountdown > 0 ? (
                      <>
                        <span className="text-zinc-300 font-medium ml-1">Erneut senden</span>
                        <span className="ml-1 text-zinc-600">({String(Math.floor(resendCountdown / 60)).padStart(2, '0')}:{String(resendCountdown % 60).padStart(2, '0')})</span>
                      </>
                    ) : (
                      <button
                        onClick={handleResendCode}
                        disabled={isLoading}
                        className="text-zinc-300 hover:text-white font-medium transition-colors ml-1"
                      >
                        Erneut senden
                      </button>
                    )}
                  </p>
                  
                  <button 
                    onClick={handleBackClick}
                    className="flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors font-jakarta mt-2"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Zurück zum Login
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Meta Footer */}
          <motion.div
            className="mt-10 flex justify-center items-center gap-6 text-[13px] text-zinc-600 font-medium tracking-wide font-jakarta"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <a href="/terms" className="hover:text-zinc-400 transition-colors">Impressum</a>
            <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
            <a href="/privacy" className="hover:text-zinc-400 transition-colors">Datenschutz</a>
            <span className="w-1 h-1 bg-zinc-700 rounded-full"></span>
            <a href="/help" className="hover:text-zinc-400 transition-colors">Hilfe</a>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
