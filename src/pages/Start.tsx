import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { startAnonymousSession, canUseAnonymousFlow } from '@/services/AnonymousAuthService';

const Start = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Web users have no vault → send them to /auth directly.
  useEffect(() => {
    if (!canUseAnonymousFlow()) {
      navigate('/auth', { replace: true });
    }
  }, [navigate]);

  const handleQuickStart = async () => {
    setLoading(true);
    try {
      await startAnonymousSession();
      // Onboarding flow takes over from /welcome (consent + first_name).
      navigate('/welcome', { replace: true });
    } catch (err: any) {
      console.error('[Start] anonymous sign-in failed', err);
      toast.error(err?.message || 'Schnellstart fehlgeschlagen, bitte melde dich an.');
      navigate('/auth', { replace: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 antialiased">
      <motion.div
        className="mb-8 flex items-center justify-center md:hidden"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <img
          alt="ditax"
          src="/lovable-uploads/e9306e57-1198-4333-abcf-b510c9713e63.png"
          className="h-10 w-auto object-contain"
        />
      </motion.div>

      <motion.main
        className="w-full max-w-md bg-card border border-border rounded-2xl shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)] p-8 sm:p-10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex flex-col items-center text-center mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/15 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
            <span className="text-[11px] font-medium text-primary">Willkommen bei Ditax</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-3 leading-tight">
            Bereit für deine Steuererklärung?
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Leg in Sekunden los — ein vollwertiges Konto kannst du jederzeit später anlegen.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={handleQuickStart}
            disabled={loading}
            className="w-full"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Direkt starten'}
          </Button>

          <button
            type="button"
            onClick={() => navigate('/auth')}
            disabled={loading}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-3"
          >
            Ich habe bereits ein Konto
          </button>
        </div>
      </motion.main>
    </div>
  );
};

export default Start;
