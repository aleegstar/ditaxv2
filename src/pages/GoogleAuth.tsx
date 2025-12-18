import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";
import { isDespiaEnvironment, isAndroidEnvironment } from "@/utils/platform";
import { despia } from "@/utils/despiaStatusBar";

const GoogleAuth = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const initGoogleAuth = async () => {
      try {
        const isDespia = isDespiaEnvironment();
        const isNative = Capacitor.isNativePlatform() || isAndroidEnvironment();
        
        if (isDespia) {
          // Use Despia Easy OAuth - get URL without redirecting
          const { data, error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: 'https://app.ditax.ch/auth-success',
              skipBrowserRedirect: true
            }
          });
          
          if (error) {
            throw error;
          }
          
          if (data?.url) {
            // Pass the OAuth URL to Despia native handler
            despia(`oauth://${data.url}`);
          }
        } else if (isNative) {
          // Use standard OAuth for Capacitor
          const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
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
            provider: 'google',
            options: {
              redirectTo: 'https://app.ditax.ch/auth-success'
            }
          });
          
          if (error) {
            throw error;
          }
        }
      } catch (error: any) {
        console.error('Google auth failed:', error);
        setError(error.message || "Fehler bei der Google-Anmeldung");
        setIsLoading(false);
      }
    };

    // Small delay to show loading state
    const timer = setTimeout(() => {
      initGoogleAuth();
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
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center mb-8">
          <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-10 w-auto" />
        </div>
        
        {isLoading ? (
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Google Anmeldung</h1>
              <p className="text-black/70 font-light text-xl">Sie werden zu Google weitergeleitet...</p>
            </div>
            
            <div className="flex justify-center">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 shadow-sm">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <div className="flex items-center gap-3">
                    <svg width="24" height="24" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M17.64 9.20456C17.64 8.56637 17.5827 7.95274 17.4764 7.36365H9V10.845H13.8436C13.635 11.97 13.0009 12.9232 12.0477 13.5614V15.8195H14.9564C16.6582 14.2527 17.64 11.9455 17.64 9.20456Z" fill="#4285F4" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M9 18C11.43 18 13.4673 17.1941 14.9564 15.8195L12.0477 13.5614C11.2418 14.1014 10.2109 14.4205 9 14.4205C6.65591 14.4205 4.67182 12.8373 3.96409 10.71H0.957275V13.0418C2.43818 15.9832 5.48182 18 9 18Z" fill="#34A853" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M3.96409 10.71C3.78409 10.17 3.68182 9.59318 3.68182 9C3.68182 8.40682 3.78409 7.83 3.96409 7.29V4.95818H0.957273C0.347727 6.17318 0 7.54773 0 9C0 10.4523 0.347727 11.8268 0.957273 13.0418L3.96409 10.71Z" fill="#FBBC04" />
                      <path fillRule="evenodd" clipRule="evenodd" d="M9 3.57955C10.3214 3.57955 11.5077 4.03364 12.4405 4.92545L15.0218 2.34409C13.4632 0.891818 11.4259 0 9 0C5.48182 0 2.43818 2.01682 0.957275 4.95818L3.96409 7.29C4.67182 5.16273 6.65591 3.57955 9 3.57955Z" fill="#EA4335" />
                    </svg>
                    <span className="text-black/70">Verbindung zu Google...</span>
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

export default GoogleAuth;