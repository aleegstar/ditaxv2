import { useEffect, useState, useRef } from "react";
import { useSearchParams, useParams, useNavigate } from "react-router-dom";
import { DEEPLINK_SCHEME, isDespiaNative } from "@/lib/despia";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";

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

        // If deeplinkScheme came from URL path, this is a native OAuth flow.
        // Don't use isDespiaNative() - system browsers (ASWebAuthenticationSession,
        // Chrome Custom Tabs) don't have Despia's user agent.
        const isNativeOAuthFlow = !!pathScheme;
        console.log('🔗 Is native OAuth flow:', isNativeOAuthFlow, '(pathScheme:', pathScheme, ')');

        if (isNativeOAuthFlow) {
          // Pass tokens directly in deeplink so the WebView can set the session
          // (ASWebAuthenticationSession on iOS has isolated storage)
          const deeplinkParams = new URLSearchParams();
          deeplinkParams.set('access_token', accessToken);
          if (refreshToken) deeplinkParams.set('refresh_token', refreshToken);
          const deeplinkUrl = `${deeplinkScheme}://oauth/auth?${deeplinkParams.toString()}`;
          console.log('🔗 Triggering deeplink with tokens:', deeplinkUrl);
          
          // Trigger immediately
          window.location.href = deeplinkUrl;
          
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
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-6 bg-transparent">
      {/* Clean white background */}

      {/* Glass card */}
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div className="bg-white/75 backdrop-blur-xl rounded-3xl border border-white/60 shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] p-8 text-center space-y-7">
          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="flex justify-center"
          >
            <img 
              src="/ditax-logo-new.svg" 
              alt="Ditax" 
              className="w-auto h-9 object-contain" 
            />
          </motion.div>

          {/* Status Icon */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex justify-center"
            >
              {status === 'processing' && (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-primary/10 blur-2xl scale-[1.8]" />
                  <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-primary/12 to-primary/5 border border-primary/10 flex items-center justify-center relative z-10">
                    <Loader2 className="w-8 h-8 text-primary animate-spin" />
                  </div>
                </div>
              )}
              {status === 'success' && (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/10 blur-2xl scale-[1.8]" />
                  <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-emerald-500/12 to-emerald-500/5 border border-emerald-500/10 flex items-center justify-center relative z-10">
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
                    >
                      <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                    </motion.div>
                  </div>
                </div>
              )}
              {status === 'error' && (
                <div className="relative">
                  <div className="absolute inset-0 rounded-full bg-red-500/10 blur-2xl scale-[1.8]" />
                  <div className="w-[72px] h-[72px] rounded-full bg-gradient-to-br from-red-500/12 to-red-500/5 border border-red-500/10 flex items-center justify-center relative z-10">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    >
                      <XCircle className="w-8 h-8 text-red-500" />
                    </motion.div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Status Text */}
          <AnimatePresence mode="wait">
            <motion.div
              key={status}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="space-y-2"
            >
              <h1 className="text-xl font-semibold text-foreground tracking-tight">
                {status === 'processing' && 'Anmeldung wird verarbeitet'}
                {status === 'success' && 'Erfolgreich angemeldet!'}
                {status === 'error' && 'Anmeldung fehlgeschlagen'}
              </h1>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {status === 'processing' && 'Einen Moment bitte...'}
                {status === 'success' && 'Du wirst weitergeleitet...'}
                {status === 'error' && errorMessage}
              </p>
            </motion.div>
          </AnimatePresence>

          {/* Progress dots */}
          {status === 'processing' && (
            <div className="flex justify-center gap-2 pt-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-primary/40"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.85, 1.1, 0.85] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}

          {/* Error hint */}
          {status === 'error' && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-xs text-muted-foreground/50 pt-1"
            >
              Du wirst zur Anmeldeseite zurückgeleitet...
            </motion.p>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default NativeCallback;
