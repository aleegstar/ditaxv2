import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const MfaVerify = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [code, setCode] = useState('');
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);

  useEffect(() => {
    const initMfa = async () => {
      let fId = (location.state as any)?.factorId;

      if (!fId) {
        const { data: mfaData } = await supabase.auth.mfa.listFactors();
        const verifiedFactors = mfaData?.totp?.filter(f => f.status === 'verified') || [];

        if (verifiedFactors.length === 0) {
          navigate('/', { replace: true });
          return;
        }

        fId = verifiedFactors[0].id;
      }

      setFactorId(fId);

      try {
        const { data, error } = await supabase.auth.mfa.challenge({ factorId: fId });
        if (error) throw error;
        setChallengeId(data.id);
      } catch (err) {
        console.error('Error creating MFA challenge:', err);
        setError('Fehler beim Erstellen der Herausforderung');
      }
    };

    initMfa();
  }, [location.state, navigate]);

  const handleVerify = async (otpCode?: string) => {
    const finalCode = otpCode ?? code;
    if (!challengeId || !finalCode || !factorId) return;

    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: finalCode,
      });

      if (error) throw error;

      toast.success('Erfolgreich angemeldet!');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('MFA verification error:', err);
      setError('Ungültiger Code. Bitte versuche es erneut.');
      setCode('');

      try {
        const { data } = await supabase.auth.mfa.challenge({ factorId: factorId! });
        if (data) setChallengeId(data.id);
      } catch (challengeErr) {
        console.error('Error creating new challenge:', challengeErr);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCodeChange = (value: string) => {
    setCode(value);
    if (value.length === 6) {
      handleVerify(value);
    }
  };

  const handleCancel = async () => {
    await supabase.auth.signOut();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="min-h-screen text-foreground antialiased overflow-hidden relative bg-white sm:bg-[#FAFAF8]">
      {/* Subtle grain background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div
          className="absolute inset-0 opacity-[0.018]"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center p-0 sm:p-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="w-full min-h-screen sm:min-h-0 flex flex-col justify-start sm:justify-center sm:block sm:max-w-[420px] relative sm:rounded-2xl sm:bg-white sm:border sm:border-black/[0.06] sm:shadow-[0_1px_2px_rgba(15,27,61,0.04),0_8px_24px_-12px_rgba(15,27,61,0.08)] sm:overflow-hidden"
        >
          <div className="relative z-10 px-7 py-12 sm:px-9 sm:py-11">
            {/* Logo */}
            <div className="flex items-center justify-center gap-3 mb-10">
              <img
                src="/lovable-uploads/3691c98c-9243-4894-b562-0ecf0e208722.png"
                alt="Ditax"
                className="w-auto h-8 object-contain"
              />
            </div>

            {/* Header */}
            <div className="text-center mb-8 space-y-2">
              <h1 className="text-[24px] font-bold tracking-[-0.03em] text-foreground">
                Zwei-Faktor-Authentifizierung
              </h1>
              <p className="text-[13px] text-muted-foreground/60 font-light max-w-[85%] mx-auto leading-relaxed">
                Gib den 6-stelligen Code aus deiner Authenticator-App ein.
              </p>
            </div>

            {error && (
              <Alert variant="destructive" className="mb-5">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* OTP Form */}
            <div className="space-y-5">
              <div className="flex justify-between gap-2">
                <InputOTP
                  value={code}
                  onChange={handleCodeChange}
                  maxLength={6}
                  disabled={!challengeId}
                  autoFocus
                >
                  <InputOTPGroup className="flex justify-between gap-2 w-full">
                    {[0, 1, 2, 3, 4, 5].map((i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="w-full h-[52px] text-center text-lg font-semibold rounded-2xl transition-all text-foreground border"
                        style={{
                          background: 'rgba(255,255,255,0.85)',
                          borderColor: 'rgba(0,0,0,0.07)',
                          boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                onClick={() => handleVerify()}
                disabled={isLoading || code.length !== 6 || !challengeId}
                className="w-full"
              >
                {isLoading ? 'Wird verifiziert…' : 'Bestätigen'}
              </Button>
            </div>

            {/* Footer */}
            <div className="mt-8 flex flex-col items-center gap-3 text-center">
              <p className="text-[13px] text-muted-foreground/60 font-light">
                Probleme beim Anmelden? Kontaktiere den Support.
              </p>
              <button
                onClick={handleCancel}
                disabled={isLoading}
                className="flex items-center gap-1.5 text-[13px] text-muted-foreground/40 hover:text-foreground transition-colors mt-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Zurück zur Anmeldung
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MfaVerify;
