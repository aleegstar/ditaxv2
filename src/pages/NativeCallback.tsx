import { useEffect, useState, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { DEEPLINK_SCHEME, isDespiaNative } from "@/lib/despia";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * NativeCallback - Proxy page for Despia Easy OAuth
 * 
 * - Extracts tokens from URL
 * - Sets session using Supabase
 * - Sends short deeplink (success=true) to close Chrome Custom Tab
 * - Falls back to direct navigation if not in native environment
 */
const NativeCallback = () => {
  const { deeplinkScheme: pathScheme } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const hasRun = useRef(false);

  // Get deeplink_scheme from path params first, then query params, then default
  const deeplinkScheme = pathScheme || searchParams.get('deeplink_scheme') || DEEPLINK_SCHEME;

  useEffect(() => {
    // Prevent double execution
    if (hasRun.current) return;
    hasRun.current = true;

    const processAuth = async () => {
      console.log('🔐 NativeCallback: Processing auth...');
      console.log('🔐 URL:', window.location.href);

      // Parse tokens from multiple sources
      const hash = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const queryParams = new URLSearchParams(window.location.search);
      
      // Parse tokens from path if they ended up there (hash was lost during redirect)
      let pathParams = new URLSearchParams();
      const pathname = window.location.pathname;
      const tokenMatch = pathname.match(/access_token=(.+?)(?:&|$)/);
      if (tokenMatch) {
        const pathTokenIndex = pathname.indexOf('access_token=');
        if (pathTokenIndex !== -1) {
          const tokenString = pathname.substring(pathTokenIndex);
          pathParams = new URLSearchParams(tokenString);
          console.log('🔐 Tokens found in PATH');
        }
      }

      // Try multiple sources: hash first, then path, then query params
      const accessToken = hashParams.get('access_token') 
        || pathParams.get('access_token') 
        || queryParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token') 
        || pathParams.get('refresh_token') 
        || queryParams.get('refresh_token');
      const error = hashParams.get('error') 
        || pathParams.get('error') 
        || queryParams.get('error');
      const errorDescription = hashParams.get('error_description') 
        || pathParams.get('error_description') 
        || queryParams.get('error_description');

      console.log('🔐 Token extraction:', {
        hasAccessToken: !!accessToken,
        hasRefreshToken: !!refreshToken,
        error
      });

      // Handle errors
      if (error) {
        console.error('❌ OAuth error:', error, errorDescription);
        setStatus('error');
        setErrorMessage(errorDescription || error);
        
        // Redirect to auth page with error
        setTimeout(() => {
          navigate(`/auth?error=${encodeURIComponent(error)}`, { replace: true });
        }, 2000);
        return;
      }

      // Check if we have tokens
      if (!accessToken) {
        console.error('❌ No access token found');
        setStatus('error');
        setErrorMessage('Keine Zugangstokens gefunden');
        
        setTimeout(() => {
          navigate('/auth?error=no_token', { replace: true });
        }, 2000);
        return;
      }

      // Set session
      console.log('🔐 Setting session...');
      
      try {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
          setStatus('error');
          setErrorMessage('Session konnte nicht gesetzt werden');
          
          setTimeout(() => {
            navigate('/auth?error=session_error', { replace: true });
          }, 2000);
          return;
        }

        console.log('✅ Session set successfully!');
        setStatus('success');

        // Check if we're in Despia native environment
        const inDespiaNative = isDespiaNative();
        console.log('🔗 Is Despia native:', inDespiaNative);

        if (inDespiaNative) {
          // Send short deeplink to close Chrome Custom Tab
          const shortDeeplinkUrl = `${deeplinkScheme}://oauth/auth?success=true`;
          console.log('🔗 Triggering deeplink:', shortDeeplinkUrl);
          
          // Trigger immediately
          window.location.href = shortDeeplinkUrl;
          
          // Fallback: If deeplink doesn't work after 1.5 seconds, navigate directly
          setTimeout(() => {
            console.log('🔗 Deeplink fallback: navigating to home...');
            window.location.href = '/?success=true';
          }, 1500);
        } else {
          // Not in native - navigate to home immediately
          console.log('🔗 Not in native, navigating to home...');
          navigate('/', { replace: true });
        }

      } catch (err) {
        console.error('❌ Error:', err);
        setStatus('error');
        setErrorMessage('Unbekannter Fehler');
        
        setTimeout(() => {
          navigate('/auth?error=unknown', { replace: true });
        }, 2000);
      }
    };

    processAuth();
  }, [deeplinkScheme, navigate]);

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-6">
      <div className="text-center space-y-8 max-w-sm">
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
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-150" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center relative z-10">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            </div>
          )}
          {status === 'success' && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-green-500/10 blur-2xl scale-150" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-green-500/5 flex items-center justify-center relative z-10">
                <CheckCircle2 className="w-10 h-10 text-green-500" />
              </div>
            </div>
          )}
          {status === 'error' && (
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-2xl scale-150" />
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/10 to-red-500/5 flex items-center justify-center relative z-10">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
            </div>
          )}
        </div>

        {/* Status Text */}
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-foreground font-jakarta">
            {status === 'processing' && 'Anmeldung wird verarbeitet'}
            {status === 'success' && 'Erfolgreich angemeldet!'}
            {status === 'error' && 'Anmeldung fehlgeschlagen'}
          </h1>
          <p className="text-base text-muted-foreground font-jakarta">
            {status === 'processing' && 'Einen Moment bitte...'}
            {status === 'success' && 'Du wirst weitergeleitet...'}
            {status === 'error' && errorMessage}
          </p>
        </div>

        {/* Progress indicator for processing */}
        {status === 'processing' && (
          <div className="flex justify-center gap-1.5 pt-4">
            <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" style={{ animationDelay: '300ms' }} />
          </div>
        )}

        {/* Error hint */}
        {status === 'error' && (
          <p className="text-sm text-muted-foreground/60 font-jakarta pt-2">
            Du wirst zur Anmeldeseite zurückgeleitet...
          </p>
        )}
      </div>
    </div>
  );
};

export default NativeCallback;
