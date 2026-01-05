import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { DEEPLINK_SCHEME } from "@/lib/despia";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

/**
 * NativeCallback - Proxy page for Despia Easy OAuth
 * 
 * Gemäß Despia-Dokumentation:
 * - KEIN setSession() hier!
 * - Nur Tokens aus URL Hash extrahieren
 * - Per Deeplink zurück zur App leiten
 * - Die Session wird in Auth.tsx gesetzt (im WebView)
 */
const NativeCallback = () => {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasRun = useRef(false);

  // Get deeplink_scheme from query params or use default
  const deeplinkScheme = searchParams.get('deeplink_scheme') || DEEPLINK_SCHEME;

  useEffect(() => {
    // Prevent double execution
    if (hasRun.current) return;
    hasRun.current = true;

    // EXTENSIVE DEBUG LOGGING - Log everything about the received URL
    console.log('🔐🔐🔐 NativeCallback RECEIVED URL 🔐🔐🔐');
    console.log('🔐 FULL URL:', window.location.href);
    console.log('🔐 Protocol:', window.location.protocol);
    console.log('🔐 Host:', window.location.host);
    console.log('🔐 Hostname:', window.location.hostname);
    console.log('🔐 Pathname:', window.location.pathname);
    console.log('🔐 Search (query params):', window.location.search);
    console.log('🔐 Hash (fragment):', window.location.hash);
    console.log('🔐 Hash length:', window.location.hash.length);
    console.log('🔐 deeplinkScheme from query:', deeplinkScheme);
    console.log('🔐🔐🔐 END URL DEBUG 🔐🔐🔐');

    // Parse tokens from URL hash (Supabase Implicit Flow)
    const hash = window.location.hash.substring(1);
    const hashParams = new URLSearchParams(hash);
    
    // Also check query params as fallback (some OAuth flows use query params)
    const queryParams = new URLSearchParams(window.location.search);

    // Try hash first (implicit flow), then query params as fallback
    const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
    const expiresIn = hashParams.get('expires_in') || queryParams.get('expires_in');
    const error = hashParams.get('error') || queryParams.get('error');
    const errorDescription = hashParams.get('error_description') || queryParams.get('error_description');
    
    // Check for PKCE authorization code (should NOT happen with implicit flow)
    const authCode = queryParams.get('code');

    console.log('🔐 Token extraction:', {
      hasAccessToken: !!accessToken,
      hasRefreshToken: !!refreshToken,
      hasAuthCode: !!authCode,
      expiresIn,
      error,
      tokenSource: hashParams.get('access_token') ? 'hash' : queryParams.get('access_token') ? 'query' : 'none'
    });
    
    // Warn if PKCE code received instead of tokens
    if (authCode && !accessToken) {
      console.error('❌ NativeCallback: PKCE authorization code received but implicit flow expected!');
      console.error('❌ This means Supabase is using PKCE flow. Check Supabase OAuth configuration.');
    }

    /**
     * Multi-method deeplink trigger for Chrome Custom Tabs
     * Chrome Custom Tabs don't handle custom URL schemes via window.location.href
     * We use multiple methods to maximize success rate
     */
    const triggerDeeplink = (url: string) => {
      console.log('🔗 Triggering deeplink with multi-method approach:', url);
      
      // Method 1: Android Intent URL (works better in Custom Tabs)
      // Package name from assetlinks.json: com.nicholasabt.despia
      const intentUrl = url.replace(`${deeplinkScheme}://`, 'intent://') 
        + '#Intent;scheme=' + deeplinkScheme + ';package=com.nicholasabt.despia;end';
      console.log('🔗 Intent URL:', intentUrl);
      
      // Method 2: Meta refresh tag (some browsers follow this)
      try {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'refresh';
        meta.content = `0;url=${url}`;
        document.head.appendChild(meta);
        console.log('🔗 Meta refresh tag added');
      } catch (e) {
        console.log('🔗 Meta refresh failed:', e);
      }
      
      // Method 3: window.location.replace (more aggressive than .href)
      try {
        window.location.replace(url);
        console.log('🔗 location.replace called');
      } catch (e) {
        console.log('🔗 location.replace failed:', e);
      }
      
      // Method 4: Fallback with Intent URL after timeout
      setTimeout(() => {
        console.log('🔗 Fallback: Trying Intent URL...');
        try {
          window.location.replace(intentUrl);
        } catch (e) {
          console.log('🔗 Intent URL failed:', e);
          // Last resort: try regular href
          window.location.href = url;
        }
      }, 500);
      
      // Method 5: Second fallback - try opening in new context
      setTimeout(() => {
        console.log('🔗 Second fallback: window.open...');
        try {
          window.open(url, '_self');
        } catch (e) {
          console.log('🔗 window.open failed:', e);
        }
      }, 1000);
    };

    // Handle errors
    if (error) {
      console.error('❌ NativeCallback: OAuth error:', error, errorDescription);
      setStatus('error');
      setErrorMessage(errorDescription || error);
      
      const errorUrl = `${deeplinkScheme}://oauth?success=false&error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`;
      console.log('🔗 Redirecting to app with error:', errorUrl);
      
      setTimeout(() => {
        triggerDeeplink(errorUrl);
      }, 1500);
      return;
    }

    // Check if we have tokens
    if (!accessToken) {
      console.error('❌ NativeCallback: No access token found');
      setStatus('error');
      setErrorMessage('Keine Zugangstokens in der URL gefunden');
      
      const errorUrl = `${deeplinkScheme}://oauth?success=false&error=no_token`;
      setTimeout(() => {
        triggerDeeplink(errorUrl);
      }, 1500);
      return;
    }

    // Success - build deeplink with tokens
    setStatus('success');

    const params = new URLSearchParams();
    params.set('success', 'true');
    params.set('access_token', accessToken);
    if (refreshToken) {
      params.set('refresh_token', refreshToken);
    }
    if (expiresIn) {
      const expiresAt = Math.floor(Date.now() / 1000) + parseInt(expiresIn, 10);
      params.set('expires_at', expiresAt.toString());
    }

    const deeplinkUrl = `${deeplinkScheme}://oauth?${params.toString()}`;
    
    console.log('🔗🔗🔗 NativeCallback DEEPLINK DEBUG 🔗🔗🔗');
    console.log('🔗 Deeplink scheme:', deeplinkScheme);
    console.log('🔗 Access token length:', accessToken?.length);
    console.log('🔗 Refresh token length:', refreshToken?.length);
    console.log('🔗 FULL DEEPLINK URL:', deeplinkUrl);
    console.log('🔗 Deeplink URL length:', deeplinkUrl.length);

    // Trigger multi-method deeplink redirect
    setTimeout(() => {
      console.log('🔗 Executing multi-method redirect now...');
      triggerDeeplink(deeplinkUrl);
    }, 500);
  }, [deeplinkScheme]);

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-100 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/ditax-logo-new.png" 
            alt="Ditax" 
            className="w-auto h-10 object-contain" 
          />
        </div>

        {/* Status Icon */}
        <div className="flex justify-center">
          {status === 'processing' && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-[#1D64FF]/20 blur-xl" />
              <Loader2 className="w-16 h-16 text-[#1D64FF] animate-spin relative z-10" />
            </div>
          )}
          {status === 'success' && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl" />
              <CheckCircle2 className="w-16 h-16 text-green-500 relative z-10" />
            </div>
          )}
          {status === 'error' && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/20 blur-xl" />
              <XCircle className="w-16 h-16 text-red-500 relative z-10" />
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          <h1 className="text-xl font-medium font-jakarta">
            {status === 'processing' && 'Anmeldung wird verarbeitet...'}
            {status === 'success' && 'Erfolgreich angemeldet!'}
            {status === 'error' && 'Anmeldung fehlgeschlagen'}
          </h1>
          <p className="text-sm text-zinc-500 font-jakarta">
            {status === 'processing' && 'Bitte warten, du wirst gleich weitergeleitet.'}
            {status === 'success' && 'Du wirst zur App weitergeleitet...'}
            {status === 'error' && errorMessage}
          </p>
        </div>

        {/* Error retry hint */}
        {status === 'error' && (
          <p className="text-xs text-zinc-600 font-jakarta mt-4">
            Du wirst automatisch zur App zurückgeleitet...
          </p>
        )}
      </div>
    </div>
  );
};

export default NativeCallback;
