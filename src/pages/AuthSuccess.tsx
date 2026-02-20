import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { isDespiaNative } from "@/lib/despia";
import { motion } from "framer-motion";
import { Check } from "lucide-react";

const AuthSuccess = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleAuthCallback = async () => {
      const url = new URL(window.location.href);
      const despiaParam = url.searchParams.get('despia') === 'true';
      const isDespia = isDespiaNative() || despiaParam;

      console.log('🔗 AuthSuccess: Starting auth callback handling...');
      console.log('🔗 AuthSuccess: URL:', window.location.href);
      console.log('🔗 AuthSuccess: Is Despia?', isDespia, '(param:', despiaParam, ', native:', isDespiaNative(), ')');

      const hashParams = new URLSearchParams(url.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');

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
              setTimeout(() => {
              if (isDespia) {
                console.log('🔗 AuthSuccess: Triggering deeplink for Despia...');
                const deeplinkUrl = `ditax://oauth/auth?success=true&at=${finalAccessToken}&rt=${finalRefreshToken}`;
                window.location.href = deeplinkUrl;
              } else {
                console.log('🔗 AuthSuccess: Soft-navigating to home...');
                navigate('/', { replace: true });
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
              console.log('🔗 AuthSuccess: Triggering deeplink with existing session...');
              const deeplinkUrl = `ditax://oauth/auth?success=true&at=${session.access_token}&rt=${session.refresh_token}`;
              window.location.href = deeplinkUrl;
            } else {
              navigate('/', { replace: true });
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
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6 relative overflow-hidden">
      {/* Subtle animated background orbs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-emerald-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className="relative z-10 w-full max-w-sm flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-16"
        >
          <img
            src="/ditax-logo-new.svg"
            alt="Ditax Logo"
            className="h-10 w-auto"
          />
        </motion.div>

        {status === 'loading' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-primary/10 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-white/80 backdrop-blur-sm border border-white/60 shadow-lg flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            </div>
            <p className="text-muted-foreground text-base font-light">
              Anmeldung wird verarbeitet...
            </p>
          </motion.div>
        )}

        {status === 'success' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-8"
          >
            {/* Success icon with glow */}
            <div className="relative">
              <div className="absolute inset-0 w-24 h-24 rounded-full bg-emerald-400/20 blur-2xl animate-pulse" />
              <div className="absolute inset-2 w-20 h-20 rounded-full bg-emerald-400/10 blur-xl" />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.15 }}
                className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-xl shadow-emerald-500/20"
              >
                <motion.div
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.4, duration: 0.3 }}
                >
                  <Check className="w-11 h-11 text-white stroke-[2.5]" />
                </motion.div>
              </motion.div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                Erfolgreich angemeldet!
              </h1>
              <p className="text-muted-foreground text-base font-light">
                Du wirst weitergeleitet...
              </p>
            </div>
          </motion.div>
        )}

        {status === 'error' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col items-center gap-8"
          >
            <div className="relative">
              <div className="absolute inset-0 w-20 h-20 rounded-full bg-destructive/10 blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-white/80 backdrop-blur-sm border border-destructive/20 shadow-lg flex items-center justify-center">
                <span className="text-2xl text-destructive font-light">✕</span>
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-xl font-semibold text-foreground">
                Anmeldung fehlgeschlagen
              </h1>
              {errorMessage && (
                <p className="text-muted-foreground text-sm break-words max-w-xs">
                  {errorMessage}
                </p>
              )}
            </div>

            <button
              onClick={() => window.location.href = '/auth'}
              className="h-12 px-8 rounded-full bg-white/80 backdrop-blur-sm border border-border text-foreground text-sm font-medium shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              Zurück zur Anmeldung
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default AuthSuccess;
