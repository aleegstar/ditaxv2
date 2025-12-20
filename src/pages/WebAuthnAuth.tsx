import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { useEnhancedWebAuthn } from "@/hooks/use-enhanced-webauthn";
import { Fingerprint, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildDeeplinkUrl } from "@/lib/despia";
import { supabase } from "@/integrations/supabase/client";

const WebAuthnAuth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<"email" | "authenticating" | "error" | "success">("email");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Check if opened from Despia via system browser
  const isFromDespia = searchParams.get('despia') === 'true';
  const emailFromParams = searchParams.get('email');
  
  const {
    isSupported,
    authenticateWithPasskey,
    checkPasskeysForEmail
  } = useEnhancedWebAuthn();

  // Auto-fill email from URL params if coming from Despia
  useEffect(() => {
    if (emailFromParams) {
      setEmail(emailFromParams);
      console.log('📧 Email from URL params:', emailFromParams);
      
      // Auto-start authentication if email is provided
      if (isFromDespia && emailFromParams) {
        handleAutoAuth(emailFromParams);
      }
    }
  }, [emailFromParams, isFromDespia]);

  useEffect(() => {
    if (!isSupported) {
      setError("WebAuthn wird in diesem Browser nicht unterstützt");
      setStep("error");
    }
  }, [isSupported]);

  const handleAutoAuth = async (emailToAuth: string) => {
    setIsLoading(true);
    setError("");
    try {
      // Check if user has passkeys
      const passkeyResult = await checkPasskeysForEmail(emailToAuth);
      if (!passkeyResult || !passkeyResult.has_passkeys || passkeyResult.passkey_count === 0) {
        throw new Error("Keine Fingerprint-Geräte für diese E-Mail-Adresse gefunden");
      }
      setStep("authenticating");

      // Start WebAuthn authentication
      await authenticateWithPasskey(emailToAuth);
      
      // Get the session tokens
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Keine Session nach erfolgreicher Authentifizierung");
      }

      setStep("success");
      toast.success("Erfolgreich mit Fingerprint angemeldet!");

      // If from Despia, redirect back to app via deeplink with tokens
      if (isFromDespia) {
        const expiresAt = session.expires_at || Math.floor(Date.now() / 1000) + 3600;
        
        const deeplinkUrl = buildDeeplinkUrl('oauth/auth', {
          success: 'true',
          access_token: session.access_token,
          refresh_token: session.refresh_token || '',
          expires_at: expiresAt.toString(),
          auth_type: 'passkey'
        });

        console.log('🔗 Redirecting back to Despia app:', deeplinkUrl);
        
        // Small delay to show success state
        setTimeout(() => {
          window.location.href = deeplinkUrl;
        }, 500);
      } else {
        // Normal web flow - redirect to success page
        window.location.href = "/auth-success";
      }
    } catch (error: any) {
      console.error('WebAuthn auth failed:', error);
      setError(error.message || "Fingerprint-Anmeldung fehlgeschlagen");
      setStep("error");
      
      // If from Despia and error, redirect back with error
      if (isFromDespia) {
        setTimeout(() => {
          const errorDeeplink = buildDeeplinkUrl('oauth/auth', {
            success: 'false',
            error: error.message || 'passkey_auth_failed',
            auth_type: 'passkey'
          });
          window.location.href = errorDeeplink;
        }, 2000);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    await handleAutoAuth(email);
  };

  const handleRetry = () => {
    setStep("email");
    setError("");
    if (!emailFromParams) {
      setEmail("");
    }
  };

  const handleBackToMain = () => {
    if (isFromDespia) {
      // Redirect back to app with cancel
      const cancelDeeplink = buildDeeplinkUrl('oauth/auth', {
        success: 'false',
        error: 'user_cancelled',
        auth_type: 'passkey'
      });
      window.location.href = cancelDeeplink;
    } else {
      window.location.href = "/auth";
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-[30px]">
      <div className="w-full max-w-md space-y-4">
        <div className="flex justify-center mb-8">
          <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-10 w-auto" />
        </div>
        
        {step === "email" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl text-center">Fingerprint Anmeldung</h1>
              <p className="text-black/70 font-light text-xl text-center">Geben Sie Ihre E-Mail-Adresse ein</p>
              {isFromDespia && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Diese Seite wurde im System-Browser geöffnet für sichere Passkey-Authentifizierung
                </p>
              )}
            </div>
            
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <Input 
                  type="email" 
                  placeholder="E-Mail-Adresse" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)} 
                  className="h-14 px-6 py-4 text-base rounded-full border border-[#E2E8F0] bg-white text-foreground placeholder:text-muted-foreground shadow-none focus:shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-[#E2E8F0]" 
                  required 
                  disabled={isLoading || !!emailFromParams} 
                />
              </div>
              <Button 
                type="submit" 
                disabled={isLoading || !email} 
                className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-[10px]" 
                style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Fingerprint className="w-5 h-5" />}
                {isLoading ? 'Prüfe Fingerprint-Geräte...' : 'Mit Fingerprint anmelden'}
              </Button>
            </form>
            
            <Button 
              onClick={handleBackToMain} 
              className="w-full bg-white hover:bg-gray-50 text-black border border-[rgb(230,230,230)] font-medium px-[20px] py-[10px] h-14 text-base rounded-full transition-colors duration-200 flex items-center justify-center gap-[10px]" 
              style={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 3px 5px 0px' }}
            >
              {isFromDespia ? 'Zurück zur App' : 'Zurück zur Anmeldung'}
            </Button>
          </div>
        )}
        
        {step === "authenticating" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Fingerprint wird geprüft</h1>
              <p className="text-black/70 font-light text-xl">Berühren Sie Ihren Fingerprint-Sensor</p>
            </div>
            
            <div className="flex justify-center">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Fingerprint className="w-12 h-12 text-primary animate-pulse" />
                    <div className="absolute inset-0 w-12 h-12 border-2 border-primary rounded-full animate-ping" />
                  </div>
                  <span className="text-black/70">Warten auf Fingerprint...</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleRetry} 
              className="w-full bg-white hover:bg-gray-50 text-black border border-[rgb(230,230,230)] font-medium px-[20px] py-[10px] h-14 text-base rounded-full transition-colors duration-200 flex items-center justify-center gap-[10px]" 
              style={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 3px 5px 0px' }}
            >
              Abbrechen
            </Button>
          </div>
        )}

        {step === "success" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl text-center">Erfolgreich angemeldet!</h1>
              <p className="text-black/70 font-light text-xl text-center">
                {isFromDespia ? 'Du wirst zur App weitergeleitet...' : 'Du wirst weitergeleitet...'}
              </p>
            </div>
            
            <div className="flex justify-center">
              <div className="bg-green-50 border border-green-200 rounded-xl p-8 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <Fingerprint className="w-12 h-12 text-green-600" />
                  </div>
                  <span className="text-green-700">Fingerprint verifiziert</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {step === "error" && (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Anmeldung fehlgeschlagen</h1>
              <p className="text-black/70 font-light text-xl">Es ist ein Fehler aufgetreten</p>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-destructive text-sm text-left">{error}</p>
            </div>
            
            <div className="space-y-3">
              {error.includes("Keine Fingerprint-Geräte") ? (
                <div className="text-sm text-black/60 bg-muted/50 rounded-xl p-4">
                  <p className="font-medium mb-2">Mögliche Lösungen:</p>
                  <ul className="list-disc list-inside space-y-1 text-left">
                    <li>Registrieren Sie zuerst ein Fingerprint-Gerät im Web-Browser</li>
                    <li>Verwenden Sie die E-Mail-Anmeldung</li>
                    <li>Prüfen Sie die eingegebene E-Mail-Adresse</li>
                  </ul>
                </div>
              ) : (
                <Button 
                  onClick={handleRetry} 
                  className="w-full bg-[#1d64ff] hover:bg-[#1d64ff]/90 text-white rounded-full px-[20px] py-[10px] h-14 text-base font-medium border-0 transition-colors duration-200" 
                  style={{ boxShadow: 'rgba(29, 100, 255, 0.2) 0px 3px 10px 0px' }}
                >
                  Erneut versuchen
                </Button>
              )}
              
              <Button 
                onClick={handleBackToMain} 
                className="w-full bg-white hover:bg-gray-50 text-black border border-[rgb(230,230,230)] font-medium px-[20px] py-[10px] h-14 text-base rounded-full transition-colors duration-200 flex items-center justify-center gap-[10px]" 
                style={{ boxShadow: 'rgba(0, 0, 0, 0.05) 0px 3px 5px 0px' }}
              >
                {isFromDespia ? 'Zurück zur App' : 'Zurück zur Anmeldung'}
              </Button>
            </div>
            
            {isFromDespia && (
              <p className="text-xs text-muted-foreground text-center">
                Du wirst automatisch zur App zurückgeleitet...
              </p>
            )}
          </div>
        )}
        
        <p className="text-xs pt-10 text-[#333333]/20 text-center">
          {isFromDespia 
            ? 'System-Browser für sichere Passkey-Authentifizierung'
            : 'Diese Seite öffnet sich automatisch im Standard-Browser'
          }
        </p>
      </div>
    </div>
  );
};

export default WebAuthnAuth;