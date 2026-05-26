import { CheckCircle, AlertCircle, Sparkles, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import paymentSuccessHero from "@/assets/payment-success-hero.png";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxYear, setTaxYear] = useState<number | null>(null);
  const [storedTaxReturnId, setStoredTaxReturnId] = useState<string | null>(null);
  const [heroLoaded, setHeroLoaded] = useState(false);
  const hasConfettiFired = useRef(false);
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const waitForAuth = async (maxRetries = 5): Promise<any> => {
      for (let i = 0; i < maxRetries; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) return session.user;
        await new Promise(r => setTimeout(r, 1000));
      }
      return null;
    };

    const sessionId = searchParams.get('session_id');
    const year = searchParams.get('tax_year');
    const taxReturnId = searchParams.get('tax_return_id');
    const taxFilerId = searchParams.get('tax_filer_id');

    const updatePaymentStatus = async () => {
      try {
        if (!sessionId) throw new Error("Keine Sitzungs-ID gefunden");
        if (!year) throw new Error("Steuerjahr nicht gefunden");

        const user = await waitForAuth();
        if (!user) {
          setError('Sitzung nicht gefunden. Bitte kehre zur Übersicht zurück.');
          setLoading(false);
          return;
        }

        const updatePayload = {
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          status: 'processing',
          workflow_step: 'in_creation'
        };

        if (taxReturnId && taxReturnId.trim().length > 0) {
          setStoredTaxReturnId(taxReturnId);
          const { data: updateData, error: updateError } = await supabase
            .from('tax_returns')
            .update(updatePayload)
            .eq('id', taxReturnId)
            .eq('user_id', user.id)
            .select('id');

          if (updateError) throw new Error(`Fehler beim Aktualisieren: ${updateError.message}`);

          if (!updateData || updateData.length === 0) {
            let fallbackQuery = supabase
              .from('tax_returns')
              .update(updatePayload)
              .eq('user_id', user.id)
              .eq('tax_year', year);
            if (taxFilerId) fallbackQuery = fallbackQuery.eq('tax_filer_id', taxFilerId);
            const { data: fallbackData, error: fallbackError } = await fallbackQuery.select('id');
            if (fallbackError) throw new Error(`Fehler beim Aktualisieren: ${fallbackError.message}`);
            if (fallbackData && fallbackData.length > 0) setStoredTaxReturnId(fallbackData[0].id);
          }
        } else {
          let noIdQuery = supabase
            .from('tax_returns')
            .update(updatePayload)
            .eq('user_id', user.id)
            .eq('tax_year', year);
          if (taxFilerId) noIdQuery = noIdQuery.eq('tax_filer_id', taxFilerId);
          const { data: updateData, error: updateError } = await noIdQuery.select('id');
          if (updateError) throw new Error(`Fehler beim Aktualisieren: ${updateError.message}`);
          if (updateData && updateData.length > 0) setStoredTaxReturnId(updateData[0].id);
        }

        setTaxYear(parseInt(year));
        setLoading(false);

        if (taxFilerId) {
          sessionStorage.setItem('ditax_selected_tax_filer', taxFilerId);
        }

        toast.success("Zahlung erfolgreich verarbeitet!");
      } catch (error: any) {
        setError(error.message || "Fehler beim Verarbeiten der Zahlung");
        setLoading(false);
      }
    };

    updatePaymentStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fire confetti only once content + hero are visible
  useEffect(() => {
    if (loading || error || !heroLoaded || hasConfettiFired.current) return;
    hasConfettiFired.current = true;
    const t = setTimeout(() => {
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
      setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 } }), 250);
    }, 200);
    return () => clearTimeout(t);
  }, [loading, error, heroLoaded]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 sm:py-12">
        <div className="w-full max-w-md">
          <div className="mb-8 flex justify-center">
            <img src="/ditax-logo-new.svg" alt="Ditax" className="h-7 w-auto" />
          </div>
          <div className="bg-card rounded-3xl border border-border shadow-[0_20px_60px_-20px_rgba(15,27,61,0.15)] p-8 sm:p-10 text-center">
            <div className="relative mx-auto w-16 h-16 mb-6">
              <div className="absolute inset-0 rounded-full bg-destructive/10 blur-2xl" />
              <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center shadow-lg shadow-red-500/20">
                <AlertCircle className="h-9 w-9 text-white stroke-[2.5]" />
              </div>
            </div>
            <h1 className="text-2xl font-semibold text-foreground tracking-tight mb-2">
              Zahlungsverarbeitung fehlgeschlagen
            </h1>
            <p className="text-sm text-muted-foreground break-words mb-8">{error}</p>
            <div className="space-y-3">
              <Button onClick={() => navigate('/payment')} className="w-full h-12 rounded-2xl">
                Erneut versuchen
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full h-12 rounded-2xl">
                Zurück zur Startseite
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const showContent = !loading;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8 sm:py-12">
      <div className="w-full max-w-5xl">
        <div className="mb-8 flex justify-center lg:hidden">
          <img src="/ditax-logo-new.svg" alt="Ditax" className="h-8 w-auto" />
        </div>

        <div className="bg-card rounded-3xl border border-border shadow-[0_20px_60px_-20px_rgba(15,27,61,0.15)] overflow-hidden grid lg:grid-cols-2">
          {/* Hero image side */}
          <div className="relative h-64 lg:h-auto lg:min-h-[560px] overflow-hidden bg-muted/40">
            {/* Skeleton shimmer while image loads */}
            {!heroLoaded && (
              <div className="absolute inset-0 bg-gradient-to-br from-muted/60 via-muted/30 to-muted/60 animate-pulse" />
            )}

            <img
              src={paymentSuccessHero}
              alt="Glückliches Paar"
              onLoad={() => setHeroLoaded(true)}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
            <div className={`absolute inset-0 bg-gradient-to-t from-[#0F1B3D]/80 via-[#0F1B3D]/20 to-transparent lg:bg-gradient-to-t lg:from-[#0F1B3D]/85 lg:via-[#0F1B3D]/10 lg:to-transparent transition-opacity duration-500 ${heroLoaded ? 'opacity-100' : 'opacity-0'}`} />

            {showContent && heroLoaded && (
              <>
                <div className="absolute top-5 left-5 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 backdrop-blur-md shadow-lg animate-in fade-in duration-300">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-xs font-semibold text-foreground">Bestätigt</span>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-8 text-white animate-in fade-in duration-500">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/70 mb-2">Steuerjahr {taxYear}</p>
                  <h2 className="text-2xl lg:text-3xl font-semibold leading-tight">
                    Zurücklehnen,<br />wir übernehmen.
                  </h2>
                </div>
              </>
            )}
          </div>

          {/* Content side */}
          <div className="p-6 sm:p-10 lg:p-12 flex flex-col relative">
            <div className="hidden lg:flex mb-8 items-center justify-between">
              <img src="/ditax-logo-new.svg" alt="Ditax" className="h-7 w-auto" />
              {!showContent && (
                <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin" />
              )}
            </div>

            <div
              className={`transition-opacity duration-300 ${showContent ? 'opacity-100' : 'opacity-0'}`}
              aria-hidden={!showContent}
            >
              {/* Success icon */}
              <div className="relative w-16 h-16 mb-6">
                <div className="absolute inset-0 rounded-full bg-emerald-400/30 blur-2xl animate-pulse" />
                <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle className="w-9 h-9 text-white stroke-[2.5]" />
                </div>
              </div>

              <h1 className="text-3xl lg:text-4xl font-semibold text-foreground tracking-tight mb-3">
                Zahlung erfolgreich!
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed mb-8">
                Vielen Dank für deine Zahlung. Deine Steuererklärung für {taxYear} wurde erfolgreich bezahlt und wird jetzt von unserem Team bearbeitet.
              </p>

              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3 p-4 rounded-2xl bg-background border border-border">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">In Bearbeitung</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Unser Steuer-Team beginnt mit deiner Erklärung.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-2xl bg-background border border-border">
                  <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">Bestätigung per E-Mail</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Du erhältst in Kürze alle Details in dein Postfach.</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 mt-auto">
                <Button
                  onClick={() => storedTaxReturnId ? navigate(`/tax-return-tracking/${storedTaxReturnId}`) : navigate('/')}
                  className="w-full h-12 rounded-2xl"
                >
                  Steuererklärung anzeigen
                </Button>
                <Button
                  onClick={() => navigate('/')}
                  variant="outline"
                  className="w-full h-12 rounded-2xl"
                >
                  Zurück zur Übersicht
                </Button>
              </div>
            </div>

            {/* Skeleton overlay while loading */}
            {!showContent && (
              <div className="absolute inset-0 p-6 sm:p-10 lg:p-12 lg:pt-24 flex flex-col gap-6 pointer-events-none">
                <div className="w-16 h-16 rounded-2xl bg-muted/60 animate-pulse" />
                <div className="space-y-3">
                  <div className="h-8 w-2/3 rounded-lg bg-muted/60 animate-pulse" />
                  <div className="h-4 w-full rounded bg-muted/50 animate-pulse" />
                  <div className="h-4 w-5/6 rounded bg-muted/50 animate-pulse" />
                </div>
                <div className="space-y-3">
                  <div className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
                  <div className="h-16 rounded-2xl bg-muted/40 animate-pulse" />
                </div>
                <div className="mt-auto space-y-3">
                  <div className="h-12 rounded-2xl bg-muted/60 animate-pulse" />
                  <div className="h-12 rounded-2xl bg-muted/40 animate-pulse" />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
