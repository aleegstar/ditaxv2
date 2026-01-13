"use client";

import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { useI18n } from "@/contexts/I18nContext";
import { AuthErrorHandler } from "./auth-error-handler";
import { useAuthRetry } from "@/hooks/use-auth-retry";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { isAndroidEnvironment, isDespiaEnvironment } from "@/utils/platform";

interface SignInPageProps {
  className?: string;
  prefilledEmail?: string;
  onBack?: () => void;
}

export const SignInPage = ({
  className,
  prefilledEmail = "",
  onBack
}: SignInPageProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const { t } = useI18n();
  const [email, setEmail] = useState(prefilledEmail);
  const [step, setStep] = useState<"email" | "code" | "success">("email");
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [userFirstName, setUserFirstName] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const from = location.state?.from || '/';
  const {
    sendOTPWithRetry,
    verifyOTPWithRetry,
    retryCount,
    isRetrying,
    reset: resetRetry
  } = useAuthRetry();

  // Ref-basierter Schutz gegen Doppelklicks (synchron!)
  const isOAuthInProgress = useRef(false);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    console.log('🚀 Starting email submission for:', email);
    setIsLoading(true);
    setAuthError("");
    
    try {
      // Send OTP directly without passkey check
      console.log('📧 Sending OTP...');
      await sendOTPWithRetry(email);
      console.log('✅ OTP sent successfully');
      toast.success(t.auth.codeSent);
      setStep("code");
      resetRetry();
    } catch (error: any) {
      console.error('❌ Email submission failed:', error);
      setAuthError(error.message || "Fehler beim Verarbeiten der E-Mail");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      handleCodeVerification(value);
    }
  };

  const loadUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('📊 Loading profile for user:', user?.id);
      if (user) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('first_name')
          .eq('id', user.id)
          .maybeSingle();
        if (!error && profile) {
          console.log('✅ Profile loaded:', profile);
          setUserFirstName(profile.first_name || "");
        } else if (error) {
          console.error('❌ Error loading profile:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error loading user profile:', error);
    }
  };

  const handleCodeVerification = async (otpCode: string) => {
    console.log('🔐 Starting code verification');
    setIsLoading(true);
    setAuthError("");
    try {
      await verifyOTPWithRetry(email, otpCode);
      console.log('✅ OTP verification successful');
      await loadUserProfile();
      toast.success(t.auth.loginSuccess);
      resetRetry();
      console.log('🚀 Navigating to:', from);
      navigate(from);
    } catch (error: any) {
      console.error('❌ OTP verification failed:', error);
      setAuthError(error.message || "Fehler bei der Code-Verifikation");
      setCode("");
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackClick = () => {
    if (step === "code") {
      setStep("email");
    } else if (onBack) {
      onBack();
    } else {
      setStep("email");
    }
    setCode("");
    setAuthError("");
    resetRetry();
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    setAuthError("");
    try {
      await sendOTPWithRetry(email);
      console.log('✅ Code resent successfully');
      toast.success(t.auth.codeResent);
      resetRetry();
    } catch (error: any) {
      console.error('❌ Resend code failed:', error);
      setAuthError(error.message || "Fehler beim erneuten Senden des Codes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    // Doppelklick-Schutz mit Ref (synchron!)
    if (isOAuthInProgress.current) {
      console.log('⚠️ Google OAuth bereits in Bearbeitung, ignoriere Klick');
      return;
    }
    isOAuthInProgress.current = true;
    setIsLoading(true);
    setAuthError("");
    
    const isDespia = isDespiaEnvironment();
    const isNativeCapacitor = Capacitor.isNativePlatform();
    
    try {
      // Despia WebView: OAuth direkt im WebView (OHNE Browser.open!)
      if (isDespia && !isNativeCapacitor) {
        console.log('🔗 Despia WebView detected - OAuth direkt im WebView');
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: 'https://app.ditax.ch/auth-success'
          }
        });
        if (error) throw error;
        return;
      }
      
      // Native Capacitor App: Browser.open() verwenden
      if (isNativeCapacitor || isAndroidEnvironment()) {
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
        return;
      }
      
      // Web: Standard OAuth flow
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/`
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('❌ Google sign-in failed:', error);
      setAuthError(error.message || "Fehler bei der Google-Anmeldung");
      isOAuthInProgress.current = false;
      setIsLoading(false);
    }
  };

  const handleRetryAuth = () => {
    if (step === "email") {
      handleEmailSubmit(new Event('submit') as any);
    } else if (step === "code") {
      handleResendCode();
    }
  };

  return (
    <div className={cn("flex w-[100%] flex-col min-h-screen relative", className)}>
      <div className="relative z-10 flex flex-col flex-1">
        <div className="flex flex-1 flex-col lg:flex-row">
          <div className="flex-1 flex flex-col justify-start items-center pt-8 sm:pt-12 lg:pt-20 px-4">
            <motion.div 
              className="w-full max-w-sm" 
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ duration: 0.6, ease: "easeOut", delay: 0.4 }}
            >
              {authError && (
                <div className="mb-4">
                  <AuthErrorHandler 
                    error={authError} 
                    onRetry={handleRetryAuth} 
                    isRetrying={isRetrying} 
                    retryCount={retryCount} 
                  />
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === "email" ? (
                  <motion.div 
                    key="email-step" 
                    initial={{ opacity: 0, x: -100 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: -100 }} 
                    transition={{ duration: 0.4, ease: "easeOut" }} 
                    className="space-y-6 text-center"
                  >
                    <div className="space-y-6">
                      <div className="flex justify-center mb-8">
                        <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-10 w-auto" />
                      </div>
                      <div className="space-y-1 text-slate-700">
                        <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">{t.auth.title}</h1>
                        <p className="text-black/70 font-light text-xl my-[10px]">{t.auth.subtitle}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <button 
                        onClick={handleGoogleSignIn} 
                        disabled={isLoading || isRetrying} 
                        className="w-full bg-white hover:bg-gray-50 text-black border border-[#E2E8F0] font-medium px-6 py-4 min-h-[56px] text-base rounded-xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-none flex items-center justify-center gap-3"
                      >
                        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" clipRule="evenodd" d="M17.64 9.20456C17.64 8.56637 17.5827 7.95274 17.4764 7.36365H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20456Z" fill="#4285F4" />
                          <path fillRule="evenodd" clipRule="evenodd" d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
                          <path fillRule="evenodd" clipRule="evenodd" d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC04" />
                          <path fillRule="evenodd" clipRule="evenodd" d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335" />
                        </svg>
                        {isLoading || isRetrying ? t.auth.sending : t.auth.googleSignIn}
                      </button>
                      
                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                          <span className="w-full border-t border-[#E2E8F0]" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                          <span className="bg-white px-4 text-[#718096]">{t.auth.or}</span>
                        </div>
                      </div>

                      <form onSubmit={handleEmailSubmit} className="space-y-6">
                        <div>
                          <Input
                            type="email" 
                            placeholder={t.auth.emailPlaceholder} 
                            value={email} 
                            onChange={e => setEmail(e.target.value)} 
                            className="min-h-[56px] px-6 py-4 text-base rounded-xl border border-[#E2E8F0] bg-white text-foreground placeholder:text-muted-foreground shadow-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#E2E8F0]" 
                            required 
                            disabled={isLoading || isRetrying} 
                          />
                        </div>
                        <button 
                          type="submit" 
                          disabled={isLoading || isRetrying} 
                          className="w-full bg-[#1d64ff] text-white hover:bg-[#1d64ff]/90 rounded-xl px-6 py-4 min-h-[56px] text-base font-medium shadow-none border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isLoading || isRetrying ? t.auth.sending : t.auth.loginButton}
                        </button>
                      </form>
                    </div>
                    
                    <p className="text-xs pt-10 text-[#333333]/20">
                      {t.auth.termsText}
                    </p>
                  </motion.div>
                ) : step === "code" ? (
                  <motion.div 
                    key="code-step" 
                    initial={{ opacity: 0, x: 100 }} 
                    animate={{ opacity: 1, x: 0 }} 
                    exit={{ opacity: 0, x: 100 }} 
                    transition={{ duration: 0.4, ease: "easeOut" }} 
                    className="space-y-4 sm:space-y-6 text-center"
                  >
                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex justify-center mb-4 sm:mb-8">
                        <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-10 w-auto" />
                      </div>
                      <div className="space-y-1">
                        <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">{t.auth.verifyTitle}</h1>
                        <p className="text-black/50 text-xl font-light">{t.auth.verifySubtitle}</p>
                      </div>
                    </div>
                    
                    <div className="w-full flex justify-center">
                      <InputOTP maxLength={6} value={code} onChange={handleCodeChange} disabled={isLoading}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                    
                    <div>
                      <motion.p 
                        onClick={handleResendCode} 
                        className="text-black/50 hover:text-black/70 transition-colors cursor-pointer text-sm" 
                        whileHover={{ scale: 1.02 }} 
                        transition={{ duration: 0.2 }}
                      >
                        {isLoading ? t.auth.resending : t.auth.resendCode}
                      </motion.p>
                    </div>
                    
                    <div className="flex w-full gap-3">
                      <button 
                        onClick={handleBackClick} 
                        className="w-[30%] bg-white hover:bg-gray-50 text-black border border-gray-200 font-medium py-4 px-6 rounded-2xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={isLoading}
                      >
                        {t.auth.backButton}
                      </button>
                      <button 
                        onClick={() => handleCodeVerification(code)} 
                        className="flex-1 bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white font-medium py-4 px-6 rounded-2xl transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                        disabled={code.length !== 6 || isLoading}
                      >
                        {isLoading ? t.auth.verifying : t.auth.continueButton}
                      </button>
                    </div>
                    
                    <div className="pt-8 sm:pt-16">
                      <p className="text-xs text-black/40">
                        {t.auth.termsText}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="success-step" 
                    initial={{ opacity: 0, y: 50 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    transition={{ duration: 0.4, ease: "easeOut", delay: 0.3 }} 
                    className="space-y-6 text-center"
                  >
                    <div className="flex justify-center">
                      <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-10 w-auto" />
                    </div>
                    <div className="space-y-1">
                      <h1 className="text-[2.5rem] font-bold leading-[1.1] tracking-tight text-black">
                        {userFirstName ? `${t.auth.welcomeBack} ${userFirstName}` : t.auth.welcomeBack}
                      </h1>
                      <p className="text-[1.25rem] text-black/50 font-light">{t.auth.welcome}</p>
                    </div>
                    
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0 }} 
                      animate={{ scale: 1, opacity: 1 }} 
                      transition={{ duration: 0.5, delay: 0.5 }} 
                      className="py-10"
                    >
                      <div className="mx-auto w-16 h-16 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
