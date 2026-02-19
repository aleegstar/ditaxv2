import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import confetti from "canvas-confetti";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxYear, setTaxYear] = useState<number | null>(null);
  const [storedTaxReturnId, setStoredTaxReturnId] = useState<string | null>(null);
  const hasConfettiFired = useRef(false);
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent re-execution on re-renders (searchParams reference can change)
    if (hasRun.current) return;
    hasRun.current = true;

    const waitForAuth = async (maxRetries = 8): Promise<any> => {
      for (let i = 0; i < maxRetries; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) return session.user;
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
        console.log(`Auth retry ${i + 1}/${maxRetries}, waiting ${i < 3 ? 1 : 2}s...`);
        await new Promise(r => setTimeout(r, i < 3 ? 1000 : 2000));
      }
      return null;
    };

    const sessionId = searchParams.get('session_id');
    const year = searchParams.get('tax_year');
    const taxReturnId = searchParams.get('tax_return_id');
    const taxFilerId = searchParams.get('tax_filer_id');

    const updatePaymentStatus = async () => {
      try {
        if (!sessionId) {
          throw new Error("Keine Sitzungs-ID gefunden");
        }

        if (!year) {
          throw new Error("Steuerjahr nicht gefunden");
        }

        const user = await waitForAuth();
        
        if (!user) {
          console.error('PaymentSuccess: No auth session found after retries');
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

          if (updateError) {
            throw new Error(`Fehler beim Aktualisieren: ${updateError.message}`);
          }

          if (!updateData || updateData.length === 0) {
            console.warn('Update by taxReturnId matched 0 rows, trying fallback by user_id + tax_year + tax_filer_id');
            let fallbackQuery = supabase
              .from('tax_returns')
              .update(updatePayload)
              .eq('user_id', user.id)
              .eq('tax_year', year);
            if (taxFilerId) fallbackQuery = fallbackQuery.eq('tax_filer_id', taxFilerId);
            const { data: fallbackData, error: fallbackError } = await fallbackQuery.select('id');

            if (fallbackError) {
              throw new Error(`Fehler beim Aktualisieren: ${fallbackError.message}`);
            }

            if (fallbackData && fallbackData.length > 0) {
              setStoredTaxReturnId(fallbackData[0].id);
            } else {
              console.warn('Fallback update also matched 0 rows');
            }
          }
        } else {
          let noIdQuery = supabase
            .from('tax_returns')
            .update(updatePayload)
            .eq('user_id', user.id)
            .eq('tax_year', year);
          if (taxFilerId) noIdQuery = noIdQuery.eq('tax_filer_id', taxFilerId);
          const { data: updateData, error: updateError } = await noIdQuery.select('id');

          if (updateError) {
            throw new Error(`Fehler beim Aktualisieren: ${updateError.message}`);
          }

          if (updateData && updateData.length > 0) {
            setStoredTaxReturnId(updateData[0].id);
          } else {
            console.warn('No tax return found to update for user_id + tax_year');
          }
        }
        
        setLoading(false);
        setTaxYear(parseInt(year));
        
        // Set active tax filer in sessionStorage so dashboard shows the correct person
        if (taxFilerId) {
          sessionStorage.setItem('ditax_selected_tax_filer', taxFilerId);
        }
        
        toast.success("Zahlung erfolgreich verarbeitet!");
        
        if (!hasConfettiFired.current) {
          hasConfettiFired.current = true;
          setTimeout(() => {
            confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
            setTimeout(() => confetti({ particleCount: 60, spread: 100, origin: { y: 0.4 } }), 250);
          }, 400);
        }
      } catch (error: any) {
        setError(error.message || "Fehler beim Verarbeiten der Zahlung");
        setLoading(false);
      }
    };

    updatePaymentStatus();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-white to-blue-50/50 px-6 will-change-auto">
        <div className="w-full max-w-sm text-center">
          <div className="mb-12">
            <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-8 w-auto mx-auto opacity-90" />
          </div>
          <div className="space-y-6">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
            <p className="text-muted-foreground text-sm font-medium">Zahlung wird verarbeitet...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-white to-blue-50/50 px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mb-12">
            <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-8 w-auto mx-auto opacity-90" />
          </div>
          
          <div className="space-y-8">
            <div className="relative mx-auto w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-red-500/10 blur-xl" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-100 to-red-50 flex items-center justify-center shadow-lg shadow-red-500/10">
                <AlertCircle className="h-10 w-10 text-red-500" />
              </div>
            </div>
            
            <div className="space-y-3">
              <h1 className="text-xl font-semibold text-[#111827] tracking-tight">Zahlungsverarbeitung fehlgeschlagen</h1>
              <p className="text-sm text-[#6B7280] break-words max-w-xs mx-auto">{error}</p>
            </div>
            
            <div className="space-y-3">
              <Button onClick={() => navigate('/payment')} className="w-full h-12 rounded-xl">
                Erneut versuchen
              </Button>
              <Button onClick={() => navigate('/')} variant="outline" className="w-full h-12 rounded-xl">
                Zurück zur Startseite
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white via-white to-blue-50/50 px-6 relative animate-fade-in will-change-auto">
      
      <div className="w-full max-w-sm text-center relative z-10">
        <div className="mb-12">
          <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-8 w-auto mx-auto opacity-90" />
        </div>
        
        <div className="space-y-8">
          {/* Success icon with gradient glow */}
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-emerald-400/30 to-green-500/20 blur-2xl animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-emerald-500/10 blur-xl" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 via-emerald-500 to-green-600 flex items-center justify-center shadow-lg shadow-emerald-500/25 animate-in zoom-in-50 duration-500">
              <CheckCircle className="w-12 h-12 text-white stroke-[2.5]" />
            </div>
          </div>
          
          {/* Title & description */}
          <div className="space-y-3">
            <h1 className="text-2xl font-semibold text-[#111827] tracking-tight">
              Zahlung erfolgreich!
            </h1>
            <p className="text-sm text-[#6B7280] leading-relaxed">
              Vielen Dank für deine Zahlung. Deine Steuererklärung für {taxYear} wurde erfolgreich bezahlt.
            </p>
          </div>

          {/* Status card */}
          <div className="bg-white/75 backdrop-blur-lg rounded-2xl border border-slate-200/60 p-5 shadow-sm">
            <div className="flex items-center justify-center gap-2 mb-1.5">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <p className="text-sm font-semibold text-[#111827]">In Bearbeitung</p>
            </div>
            <p className="text-xs text-[#6B7280]">
              Du erhältst in Kürze eine Bestätigung per E-Mail.
            </p>
          </div>
          {/* Actions */}
          <div className="space-y-3 pt-2">
            <Button 
              onClick={() => storedTaxReturnId ? navigate(`/tax-return-tracking/${storedTaxReturnId}`) : navigate('/')}
              className="w-full h-12 rounded-xl"
            >
              Steuererklärung anzeigen
            </Button>
            
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full h-12 rounded-xl"
            >
              Zurück zur Übersicht
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
