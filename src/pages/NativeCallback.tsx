import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { buildDeeplinkUrl } from "@/lib/despia";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

/**
 * NativeCallback - Proxy page for Despia Easy OAuth
 * 
 * This page receives OAuth tokens in the URL hash (Implicit Flow),
 * validates the session with Supabase, and redirects back to the
 * native app via deeplink.
 */
const NativeCallback = () => {
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleTokens = async () => {
      try {
        console.log('🔐 NativeCallback: Processing OAuth tokens...');
        console.log('🔗 Full URL:', window.location.href);
        console.log('🔗 Hash:', window.location.hash);

        // Extract tokens from URL hash (Implicit Flow)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const expiresIn = hashParams.get('expires_in');
        const tokenType = hashParams.get('token_type');

        console.log('🔐 Token extraction:', {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          expiresIn,
          tokenType
        });

        if (!accessToken) {
          // Check if there's an error in the hash
          const error = hashParams.get('error');
          const errorDescription = hashParams.get('error_description');
          
          if (error) {
            throw new Error(errorDescription || error);
          }
          
          throw new Error('Keine Zugangstokens in der URL gefunden');
        }

        // Set the session with Supabase
        console.log('🔐 NativeCallback: Setting Supabase session...');
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || '',
        });

        if (error) {
          console.error('❌ NativeCallback: Session error:', error);
          throw error;
        }

        console.log('✅ NativeCallback: Session set successfully', {
          userId: data.user?.id,
          email: data.user?.email
        });

        setStatus('success');

        // Calculate expires_at timestamp
        const expiresAt = expiresIn 
          ? Math.floor(Date.now() / 1000) + parseInt(expiresIn, 10)
          : Math.floor(Date.now() / 1000) + 3600; // Default 1 hour

        // Build deeplink URL to redirect back to native app
        const deeplinkUrl = buildDeeplinkUrl('oauth/auth', {
          success: 'true',
          access_token: accessToken,
          refresh_token: refreshToken || '',
          expires_at: expiresAt.toString(),
        });

        console.log('🔗 NativeCallback: Redirecting to app via deeplink:', deeplinkUrl);

        // Small delay to show success state, then redirect
        setTimeout(() => {
          window.location.href = deeplinkUrl;
        }, 500);

      } catch (error: any) {
        console.error('❌ NativeCallback: Error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Unbekannter Fehler bei der Authentifizierung');

        // Still try to redirect back to app with error
        setTimeout(() => {
          const errorDeeplink = buildDeeplinkUrl('oauth/auth', {
            success: 'false',
            error: error.message || 'auth_failed',
          });
          window.location.href = errorDeeplink;
        }, 2000);
      }
    };

    handleTokens();
  }, []);

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
