import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";


const AuthBridge = () => {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuthBridge = async () => {
      try {
        console.log('🌉 AuthBridge: Starting token processing...');
        console.log('🌉 AuthBridge: URL:', window.location.href);
        console.log('🌉 AuthBridge: User Agent:', navigator.userAgent);
        
        const accessToken = searchParams.get('at');
        const refreshToken = searchParams.get('rt');

        console.log('🌉 AuthBridge: Access token present?', !!accessToken);
        console.log('🌉 AuthBridge: Refresh token present?', !!refreshToken);

        if (!accessToken || !refreshToken) {
          console.error('❌ AuthBridge: Missing tokens');
          setError('Fehlende Authentifizierungstoken');
          setLoading(false);
          return;
        }

        // Check if we already have a valid session (avoid duplicate setSession)
        const { data: existingSession } = await supabase.auth.getSession();
        if (existingSession?.session) {
          console.log('✅ AuthBridge: Session already exists - navigating to home');
          setSuccess(true);
          setLoading(false);
          window.location.href = '/';
          return;
        }

        // Set the session in Supabase
        console.log('🔐 AuthBridge: Setting session with tokens...');
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken
        });

        if (sessionError) {
          console.error('❌ AuthBridge: Session error:', sessionError);
          setError(sessionError.message);
          setLoading(false);
          return;
        }

        if (data?.session) {
          console.log('✅ AuthBridge: Session set successfully');
          console.log('✅ AuthBridge: User ID:', data.session.user?.id);
          setSuccess(true);
          setLoading(false);
          
          // Navigate to home after successful session
          console.log('🔗 AuthBridge: Navigating to home page...');
          window.location.href = '/';
        } else {
          console.error('❌ AuthBridge: No session returned');
          setError('Session konnte nicht erstellt werden');
          setLoading(false);
        }
      } catch (err) {
        console.error('❌ AuthBridge: Unexpected error:', err);
        setError('Ein unerwarteter Fehler ist aufgetreten');
        setLoading(false);
      }
    };

    handleAuthBridge();
  }, [searchParams]);

  const handleOpenApp = () => {
    // Attempt deep link only once to prevent loop
    try {
      const httpsDeepLink = 'https://app.ditax.ch/auth-success';
      window.location.href = httpsDeepLink;
    } catch (error) {
      console.error('Deep link failed:', error);
      // Stay in browser on failure
    }
  };

  const handleBrowserContinue = () => {
    // Continue in browser - redirect to main app
    window.location.href = '/';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-[40px]">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center mb-8">
            <img src="/ditax-logo-new.svg" alt="Ditax Logo" className="h-10 w-auto" />
          </div>
          
          <p className="text-black/70 font-light text-xl">Anmeldung wird verarbeitet...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-[40px]">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center mb-8">
            <img src="/ditax-logo-new.svg" alt="Ditax Logo" className="h-10 w-auto" />
          </div>
          
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-center mb-4">
                <AlertCircle className="w-16 h-16 text-destructive" />
              </div>
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Anmeldung fehlgeschlagen</h1>
              <p className="text-black/70 font-light text-xl">{error}</p>
            </div>
            
            <Button 
              onClick={() => window.location.href = '/auth'} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-4 min-h-[56px] text-base rounded-xl"
            >
              Zurück zur Anmeldung
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-[40px]">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="flex justify-center mb-8">
          <img src="/ditax-logo-new.svg" alt="Ditax Logo" className="h-10 w-auto" />
        </div>
        
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-center mb-4">
              <CheckCircle className="w-16 h-16 text-success" />
            </div>
            <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Anmeldung erfolgreich!</h1>
            <p className="text-black/70 font-light text-xl">Sie wurden erfolgreich angemeldet</p>
          </div>
          
          <div className="bg-success/10 border border-success/20 rounded-xl p-6">
            <div className="flex flex-col items-center gap-3">
              <p className="text-success font-medium text-center">
                Die App wird automatisch geöffnet...
              </p>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={handleOpenApp} 
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium px-6 py-4 min-h-[56px] text-base rounded-xl"
            >
              App öffnen
            </Button>
            
            <Button 
              onClick={handleBrowserContinue}
              variant="outline"
              className="w-full bg-white hover:bg-gray-50 text-black border border-[#E2E8F0] font-medium px-6 py-4 min-h-[56px] text-base rounded-xl"
            >
              Im Browser fortfahren
            </Button>
          </div>
        </div>
        
        <div className="text-xs text-[#333333]/40 space-y-2">
          <p>Falls sich die App nicht automatisch öffnet, tippen Sie auf "App öffnen" oder fahren Sie im Browser fort.</p>
        </div>
      </div>
    </div>
  );
};

export default AuthBridge;
