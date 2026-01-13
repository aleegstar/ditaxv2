import { useEffect, useState, useRef } from "react";
import { useSearchParams, useParams } from "react-router-dom";
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
  const { deeplinkScheme: pathScheme } = useParams();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasRun = useRef(false);

  // Get deeplink_scheme from path params first, then query params, then default
  const deeplinkScheme = pathScheme || searchParams.get('deeplink_scheme') || DEEPLINK_SCHEME;

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
      console.log('🔗 Triggering deeplink:', url);
      
      // Method 1: Meta refresh tag
      try {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'refresh';
        meta.content = `0;url=${url}`;
        document.head.appendChild(meta);
        console.log('🔗 Meta refresh tag added');
      } catch (e) {
        console.log('🔗 Meta refresh failed:', e);
      }
      
      // Method 2: window.location.replace (primary method)
      try {
        window.location.replace(url);
        console.log('🔗 location.replace called');
      } catch (e) {
        console.log('🔗 location.replace failed:', e);
      }
      
      // Method 3: Fallback with window.open after timeout
      setTimeout(() => {
        console.log('🔗 Fallback: window.open...');
        try {
          window.open(url, '_self');
        } catch (e) {
          console.log('🔗 window.open failed:', e);
          // Last resort: try regular href
          window.location.href = url;
        }
      }, 500);
    };

    // Handle errors
    if (error) {
      console.error('❌ NativeCallback: OAuth error:', error, errorDescription);
      setStatus('error');
      setErrorMessage(errorDescription || error);
      
      // COMMENTED OUT FOR DEBUGGING - auto redirect disabled
      // const errorUrl = `${deeplinkScheme}://oauth/auth?success=false&error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || '')}`;
      // console.log('🔗 Redirecting to app with error:', errorUrl);
      // setTimeout(() => {
      //   triggerDeeplink(errorUrl);
      // }, 1500);
      return;
    }

    // Check if we have tokens
    if (!accessToken) {
      console.error('❌ NativeCallback: No access token found');
      setStatus('error');
      setErrorMessage('Keine Zugangstokens in der URL gefunden');
      
      // COMMENTED OUT FOR DEBUGGING - auto redirect disabled
      // const errorUrl = `${deeplinkScheme}://oauth/auth?success=false&error=no_token`;
      // setTimeout(() => {
      //   triggerDeeplink(errorUrl);
      // }, 1500);
      return;
    }

    // Success - build deeplink with tokens
    setStatus('success');

    // Build deeplink - only essential params
    const params = new URLSearchParams();
    params.set('access_token', accessToken);
    if (refreshToken) {
      params.set('refresh_token', refreshToken);
    }

    const deeplinkUrl = `${deeplinkScheme}://oauth/auth#${params.toString()}`;
    
    console.log('🔗🔗🔗 NativeCallback DEEPLINK DEBUG 🔗🔗🔗');
    console.log('🔗 Deeplink scheme:', deeplinkScheme);
    console.log('🔗 Access token length:', accessToken?.length);
    console.log('🔗 Refresh token length:', refreshToken?.length);
    console.log('🔗 FULL DEEPLINK URL:', deeplinkUrl);
    console.log('🔗 Deeplink URL length:', deeplinkUrl.length);

    // COMMENTED OUT FOR DEBUGGING - auto redirect disabled
    // Trigger multi-method deeplink redirect
    // setTimeout(() => {
    //   console.log('🔗 Executing multi-method redirect now...');
    //   triggerDeeplink(deeplinkUrl);
    // }, 500);
  }, [deeplinkScheme]);

  return (
    <div className="min-h-screen bg-[#020408] text-zinc-100 flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/ditax-logo-new.svg" 
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

      {/* Debug Section - Shows received URL for troubleshooting */}
      <div className="fixed bottom-4 left-4 right-4 bg-slate-800 border border-slate-600 rounded-xl p-4 z-50 max-w-md mx-auto">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-300">Debug Info</span>
          <button
            onClick={() => {
              const hashParams = new URLSearchParams(window.location.hash.substring(1));
              const debugInfo = {
                fullUrl: window.location.href,
                pathname: window.location.pathname,
                search: window.location.search,
                hash: window.location.hash,
                hashLength: window.location.hash.length,
                searchParams: Object.fromEntries(searchParams.entries()),
                hashParams: Object.fromEntries(hashParams.entries())
              };
              navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
            }}
            className="text-xs bg-[#1D64FF] text-white px-3 py-1 rounded-lg"
          >
            Copy All
          </button>
        </div>
        <textarea
          readOnly
          className="w-full h-32 text-xs font-mono bg-slate-900 text-zinc-300 border border-slate-700 rounded-lg p-2 resize-none"
          value={JSON.stringify({
            url: window.location.href,
            search: window.location.search,
            hash: window.location.hash,
            hashLength: window.location.hash.length,
            params: Object.fromEntries(searchParams.entries()),
            hashParams: Object.fromEntries(new URLSearchParams(window.location.hash.substring(1)).entries())
          }, null, 2)}
        />
      </div>
    </div>
  );
};

export default NativeCallback;
