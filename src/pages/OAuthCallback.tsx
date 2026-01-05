import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

/**
 * OAuthCallback - Handles tokens received via Despia deeplink
 * 
 * When Despia receives deeplink `ditax://oauth?tokens...`, it navigates
 * the WebView to `/oauth?tokens...`. This page processes those tokens
 * and sets up the session.
 */
const OAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const processTokens = async () => {
      console.log('🔐🔐🔐 OAuthCallback: Processing tokens from Despia deeplink 🔐🔐🔐');
      console.log('🔐 URL:', window.location.href);
      console.log('🔐 Search params:', window.location.search);
      
      // Check for success/error from deeplink
      const success = searchParams.get('success');
      const error = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');
      
      // Token params (from NativeCallback deeplink)
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      
      // Also check short form (from AuthSuccess)
      const atToken = searchParams.get('at');
      const rtToken = searchParams.get('rt');
      
      const finalAccessToken = accessToken || atToken;
      const finalRefreshToken = refreshToken || rtToken;
      
      console.log('🔐 Token extraction:', {
        hasSuccess: success,
        hasError: error,
        hasAccessToken: !!finalAccessToken,
        hasRefreshToken: !!finalRefreshToken,
        accessTokenLength: finalAccessToken?.length,
        refreshTokenLength: finalRefreshToken?.length
      });

      // Handle explicit error
      if (success === 'false' || error) {
        console.error('❌ OAuthCallback: Error from deeplink:', error, errorDescription);
        setStatus('error');
        setErrorMessage(errorDescription || error || 'Authentifizierung fehlgeschlagen');
        
        setTimeout(() => {
          navigate('/auth', { replace: true });
        }, 2000);
        return;
      }

      // Process tokens
      if (finalAccessToken && finalRefreshToken) {
        console.log('🔐 OAuthCallback: Setting session with tokens...');
        
        try {
          const { data, error: sessionError } = await supabase.auth.setSession({
            access_token: decodeURIComponent(finalAccessToken),
            refresh_token: decodeURIComponent(finalRefreshToken)
          });
          
          if (sessionError) {
            console.error('❌ OAuthCallback: Session error:', sessionError);
            setStatus('error');
            setErrorMessage(sessionError.message);
            
            setTimeout(() => {
              navigate('/auth', { replace: true });
            }, 2000);
            return;
          }
          
          if (data?.session) {
            console.log('✅ OAuthCallback: Session set successfully!');
            console.log('✅ User:', data.session.user?.email);
            setStatus('success');
            
            // Clean URL and navigate to home
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 500);
          } else {
            console.error('❌ OAuthCallback: No session data returned');
            setStatus('error');
            setErrorMessage('Keine Session-Daten erhalten');
            
            setTimeout(() => {
              navigate('/auth', { replace: true });
            }, 2000);
          }
        } catch (err) {
          console.error('❌ OAuthCallback: Exception:', err);
          setStatus('error');
          setErrorMessage(String(err));
          
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 2000);
        }
      } else {
        // No tokens - check if we already have a session
        console.log('⚠️ OAuthCallback: No tokens in URL, checking existing session...');
        
        try {
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            console.log('✅ OAuthCallback: Existing session found');
            setStatus('success');
            
            setTimeout(() => {
              navigate('/', { replace: true });
            }, 500);
          } else {
            console.log('❌ OAuthCallback: No session found');
            setStatus('error');
            setErrorMessage('Keine Anmeldedaten gefunden');
            
            setTimeout(() => {
              navigate('/auth', { replace: true });
            }, 2000);
          }
        } catch (err) {
          console.error('❌ OAuthCallback: Session check failed:', err);
          setStatus('error');
          setErrorMessage(String(err));
          
          setTimeout(() => {
            navigate('/auth', { replace: true });
          }, 2000);
        }
      }
    };

    processTokens();
  }, [searchParams, navigate]);

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
            {status === 'processing' && 'Anmeldung wird abgeschlossen...'}
            {status === 'success' && 'Erfolgreich angemeldet!'}
            {status === 'error' && 'Anmeldung fehlgeschlagen'}
          </h1>
          <p className="text-sm text-zinc-500 font-jakarta">
            {status === 'processing' && 'Bitte warten...'}
            {status === 'success' && 'Du wirst weitergeleitet...'}
            {status === 'error' && errorMessage}
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
