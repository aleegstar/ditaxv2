import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isDespiaNative } from "@/lib/despia";

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
              // Despia: Deeplink mit vorhandenen Tokens
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

  // Minimale UI während der Verarbeitung
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-full max-w-md text-center p-6">
        <img 
          src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" 
          alt="Ditax Logo" 
          className="h-10 w-auto mx-auto mb-6" 
        />
        
        {status === 'loading' && (
          <div className="space-y-3">
            <div className="animate-pulse text-gray-600">Anmeldung wird verarbeitet...</div>
            <div className="w-8 h-8 border-2 border-[#1d64ff] border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        )}
        
        {status === 'success' && (
          <div className="space-y-3">
            <div className="text-green-600 font-medium">✓ Erfolgreich angemeldet</div>
            <div className="text-gray-500 text-sm">Weiterleitung...</div>
          </div>
        )}
        
        {status === 'error' && (
          <div className="space-y-4">
            <div className="text-red-600 font-medium">Anmeldung fehlgeschlagen</div>
            {errorMessage && (
              <div className="text-gray-500 text-sm break-words">{errorMessage}</div>
            )}
            <button
              onClick={() => window.location.href = '/auth'}
              className="mt-4 px-6 py-2 bg-[#1d64ff] text-white rounded-full hover:bg-[#1650cc] transition-colors"
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
