import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { isDespiaEnvironment, isAndroidEnvironment } from "@/utils/platform";
import { isDespiaNative, DEEPLINK_SCHEME } from "@/lib/despia";
import { supabase } from "@/integrations/supabase/client";
import despia from "despia-native";

const AppleAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const initAppleAuth = async () => {
      try {
        const isDespia = isDespiaNative() || isDespiaEnvironment();
        const isNative = Capacitor.isNativePlatform() || isAndroidEnvironment();
        
        console.log('🔐 AppleAuth: Starting authentication', { isDespia, isNative });
        console.log('🔐 AppleAuth: Debug info:', {
          userAgent: navigator.userAgent,
          despiaPackageType: typeof despia,
        });
        
        if (isDespia) {
          // Use Despia Easy OAuth via auth-start Edge Function
          console.log('🔗 AppleAuth: Using Despia Easy OAuth via auth-start Edge Function');
          
          const { data, error: fnError } = await supabase.functions.invoke('auth-start', {
            body: {
              provider: 'apple',
              deeplink_scheme: DEEPLINK_SCHEME
            }
          });
          
          console.log('🔗 AppleAuth: auth-start response:', { data, error: fnError });
          
          if (fnError || !data?.url) {
            throw new Error(fnError?.message || 'Failed to get OAuth URL from auth-start');
          }
          
          // Trigger Despia Easy OAuth using the despia-native NPM package
          const oauthCommand = `oauth://?url=${encodeURIComponent(data.url)}`;
          console.log('🔗 AppleAuth: Executing despia command:', oauthCommand);
          
          despia(oauthCommand);
          
          // Timeout: Show error if OAuth doesn't proceed within 5 seconds
          setTimeout(() => {
            if (isLoading) {
              console.warn('⚠️ AppleAuth: OAuth timeout - browser may not have opened');
              setError("OAuth konnte nicht gestartet werden. Bitte versuche es erneut.");
              setIsLoading(false);
            }
          }, 5000);
          
          return;
        }
        
        if (isNative) {
          // Use standard OAuth for Capacitor
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
              redirectTo: 'https://app.ditax.ch/auth-success'
            }
          });
          
          if (error) {
            throw error;
          }
        } else {
          // Use standard OAuth for web browsers
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'apple',
            options: {
              redirectTo: 'https://app.ditax.ch/auth-success'
            }
          });
          
          if (error) {
            throw error;
          }
        }
      } catch (error: any) {
        console.error('Apple auth failed:', error);
        setError(error.message || "Fehler bei der Apple-Anmeldung");
        setIsLoading(false);
      }
    };

    // Small delay to show loading state
    const timer = setTimeout(() => {
      initAppleAuth();
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  const handleRetry = () => {
    setIsLoading(true);
    setError("");
    window.location.reload();
  };

  const handleBackToMain = () => {
    window.location.href = "/auth";
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center mb-8">
          <img src="/ditax-logo-new.svg" alt="Ditax Logo" className="h-10 w-auto" />
        </div>
        
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Apple Anmeldung</h1>
              <p className="text-black/70 font-light text-xl">Sie werden zu Apple weitergeleitet...</p>
            </div>
            
            <div className="flex justify-center">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div className="flex items-center gap-3">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 21.99 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.09997 21.99C7.78997 22.03 6.79997 20.68 5.95997 19.47C4.24997 17 2.93997 12.45 4.69997 9.39C5.56997 7.87 7.12997 6.91 8.81997 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" fill="currentColor"/>
                    </svg>
                    <span className="text-black/70">Verbindung zu Apple...</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Anmeldung fehlgeschlagen</h1>
              <p className="text-black/70 font-light text-xl">Es ist ein Fehler aufgetreten</p>
            </div>
            
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
              <p className="text-destructive text-sm">{error}</p>
            </div>
            
            <div className="space-y-3">
              <Button 
                onClick={handleRetry}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-4 min-h-[56px] text-base rounded-xl"
              >
                Erneut versuchen
              </Button>
              
              <Button 
                onClick={handleBackToMain}
                variant="outline"
                className="w-full bg-white hover:bg-gray-50 text-black border border-[#E2E8F0] font-medium px-6 py-4 min-h-[56px] text-base rounded-xl"
              >
                Zurück zur Anmeldung
              </Button>
            </div>
          </div>
        )}
        
        <p className="text-xs pt-10 text-[#333333]/20">
          Diese Seite öffnet sich automatisch im Standard-Browser
        </p>
      </div>
    </div>
  );
};

export default AppleAuth;
