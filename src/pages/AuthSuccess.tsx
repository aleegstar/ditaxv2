import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDespiaNative } from "@/lib/despia";
import { CheckCircle } from "lucide-react";

/**
 * AuthSuccess - OAuth-Redirect-Handler
 * 
 * Flow für Despia (OAuth im In-App WebView):
 * 1. OAuth läuft im WebView (In-App-Tab)
 * 2. Nach OAuth redirected Google/Apple zu https://app.ditax.ch/auth-success#tokens
 * 3. Diese Seite extrahiert die Tokens und setzt die Session
 * 4. Deeplink wird ausgelöst um Tokens zur nativen App zurückzuschicken
 * 5. Chrome Custom Tab wird geschlossen, Haupt-WebView setzt Session
 * 
 * Flow für Web Browser:
 * 1. OAuth läuft im gleichen Browser-Tab/Popup
 * 2. Redirect zu auth-success mit Tokens im Hash
 * 3. Session setzen und zur Home-Seite navigieren
 */
const AuthSuccess = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const url = new URL(window.location.href);
      
      // Check if we came from Despia (via query param OR user agent)
      // The query param is more reliable since isDespiaNative() may not work in Chrome Custom Tab
      const despiaParam = url.searchParams.get('despia') === 'true';
      const isDespia = isDespiaNative() || despiaParam;
      
      console.log('🔗 AuthSuccess: Starting auth callback handling...');
      console.log('🔗 AuthSuccess: URL:', window.location.href);
      console.log('🔗 AuthSuccess: Is Despia?', isDespia, '(param:', despiaParam, ', native:', isDespiaNative(), ')');
      
      // Extract tokens from URL hash (OAuth redirect format: #access_token=xxx&refresh_token=yyy)
      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      
      // Also check query params (alternative format)
      const qpAccessToken = url.searchParams.get('at') || url.searchParams.get('access_token');
      const qpRefreshToken = url.searchParams.get('rt') || url.searchParams.get('refresh_token');
      
      const finalAccessToken = accessToken || qpAccessToken;
      const finalRefreshToken = refreshToken || qpRefreshToken;

      if (finalAccessToken && finalRefreshToken) {
        console.log('🔐 AuthSuccess: Tokens found, setting session...');
        
        try {
          const { data, error } = await supabase.auth.setSession({
            access_token: finalAccessToken,
            refresh_token: finalRefreshToken,
          });

          if (error) {
            console.error('❌ AuthSuccess: Session error:', error);
            setErrorMessage(error.message);
            setStatus('error');
            return;
          }

          if (data?.session) {
            console.log('✅ AuthSuccess: Session set successfully');
            setStatus('success');
            
            // Kurze Verzögerung um sicherzustellen dass Session gespeichert ist
            setTimeout(() => {
              if (isDespia) {
                // Despia: Deeplink auslösen um Tokens zur nativen App zurückzuschicken
                // Das schließt den Chrome Custom Tab und navigiert den Haupt-WebView
                // Format: ditax://oauth/auth?params - oauth/ prefix closes browser session
                console.log('🔗 AuthSuccess: Triggering deeplink for Despia...');
                const deeplinkUrl = `ditax://oauth/auth?success=true&at=${finalAccessToken}&rt=${finalRefreshToken}`;
                window.location.href = deeplinkUrl;
              } else {
                // Web-Flow: Normal zur Home navigieren
                console.log('🔗 AuthSuccess: Navigating to home...');
                window.location.href = '/';
              }
            }, 100);
          } else {
            console.log('⚠️ AuthSuccess: No session data returned');
            setErrorMessage('Keine Session-Daten erhalten');
            setStatus('error');
          }
        } catch (err) {
          console.error('❌ AuthSuccess: Exception:', err);
          setErrorMessage(String(err));
          setStatus('error');
        }
      } else {
        console.log('⚠️ AuthSuccess: No tokens found - checking existing session');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('✅ AuthSuccess: Existing session found');
            setStatus('success');
            
            if (isDespia) {
              // Despia: Deeplink mit vorhandenen Tokens - oauth/auth format
              console.log('🔗 AuthSuccess: Triggering deeplink with existing session...');
              const deeplinkUrl = `ditax://oauth/auth?success=true&at=${session.access_token}&rt=${session.refresh_token}`;
              window.location.href = deeplinkUrl;
            } else {
              window.location.href = '/';
            }
          } else {
            console.log('❌ AuthSuccess: No session - redirecting to auth');
            setStatus('error');
            setErrorMessage('Keine Anmeldedaten gefunden');
            setTimeout(() => {
              window.location.href = '/auth';
            }, 2000);
          }
        } catch (err) {
          console.error('❌ AuthSuccess: Session check failed:', err);
          setErrorMessage(String(err));
          setStatus('error');
        }
      }
    };

    handleAuthCallback();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-white to-blue-50/50 px-6">
      <div className="w-full max-w-sm text-center">
        {/* Logo - slightly smaller for better focus on success state */}
        <div className="mb-12">
          <img 
            src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" 
            alt="Ditax Logo" 
            className="h-8 w-auto mx-auto opacity-90" 
          />
        </div>
        
        {status === 'loading' && (
          <div className="space-y-6">
            {/* Loading spinner with glow */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              Anmeldung wird verarbeitet...
            </p>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-8">
            {/* Success icon with gradient, glow and animation */}
            <div className="relative mx-auto w-24 h-24">
              {/* Outer glow/halo */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-500/20 blur-2xl animate-pulse" />
              {/* Soft shadow */}
              <div className="absolute inset-2 rounded-full bg-emerald-500/10 blur-xl" />
              {/* Main circle with gradient */}
              <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 animate-in zoom-in-50 duration-500">
                <CheckCircle className="w-12 h-12 text-white stroke-[2.5]" />
              </div>
            </div>
            
            {/* Title */}
            <div className="space-y-3">
              <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">
                Erfolgreich angemeldet
              </h1>
              <p className="text-sm text-[#6B7280]">
                Du wirst weitergeleitet...
              </p>
            </div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-8">
            {/* Error icon with styling */}
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center shadow-lg shadow-red-500/10">
                <span className="text-3xl">✕</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-xl font-semibold text-[#111827]">
                Anmeldung fehlgeschlagen
              </h1>
              {errorMessage && (
                <p className="text-sm text-[#6B7280] break-words max-w-xs mx-auto">
                  {errorMessage}
                </p>
              )}
            </div>
            
            <button
              onClick={() => window.location.href = '/auth'}
              className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-gradient-to-r from-primary via-blue-600 to-blue-700 text-white text-sm font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all duration-200"
            >
              Zurück zur Anmeldung
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuthSuccess;
