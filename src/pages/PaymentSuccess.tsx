import { CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSearchParams, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { Confetti, ConfettiRef } from "@/components/ui/confetti";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [taxYear, setTaxYear] = useState<number | null>(null);
  const [storedTaxReturnId, setStoredTaxReturnId] = useState<string | null>(null);
  const confettiRef = useRef<ConfettiRef>(null);

  useEffect(() => {
    const waitForAuth = async (maxRetries = 3): Promise<any> => {
      for (let i = 0; i < maxRetries; i++) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) return user;
        console.log(`Auth retry ${i + 1}/${maxRetries}, waiting 1s...`);
        await new Promise(r => setTimeout(r, 1000));
      }
      return null;
    };

    const updatePaymentStatus = async () => {
      try {
        const sessionId = searchParams.get('session_id');
        const year = searchParams.get('tax_year');
        const taxReturnId = searchParams.get('tax_return_id');

        if (!sessionId) {
          throw new Error("Keine Sitzungs-ID gefunden");
        }

        if (!year) {
          throw new Error("Steuerjahr nicht gefunden");
        }

        const user = await waitForAuth();
        
        if (!user) {
          navigate('/auth');
          return;
        }

        const updatePayload = {
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          status: 'processing',
          workflow_step: 'in_creation'
        };

        // Update the specific tax return by ID if available
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
            console.warn('Update by taxReturnId matched 0 rows, trying fallback by user_id + tax_year');
            // Fallback to user_id + tax_year
            const { data: fallbackData, error: fallbackError } = await supabase
              .from('tax_returns')
              .update(updatePayload)
              .eq('user_id', user.id)
              .eq('tax_year', year)
              .select('id');

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
          // Fallback: Update by user_id + tax_year
          const { data: updateData, error: updateError } = await supabase
            .from('tax_returns')
            .update(updatePayload)
            .eq('user_id', user.id)
            .eq('tax_year', year)
            .select('id');

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
        toast.success("Zahlung erfolgreich verarbeitet!");
        
        // Trigger confetti
        setTimeout(() => {
          confettiRef.current?.fire({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
        }, 300);
      } catch (error: any) {
        setError(error.message || "Fehler beim Verarbeiten der Zahlung");
        setLoading(false);
      }
    };

    updatePaymentStatus();
  }, [searchParams, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-[40px]">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center">
            <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-10 w-auto" />
          </div>
          
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white px-[40px]">
        <div className="w-full max-w-md space-y-6 text-center">
          <div className="flex justify-center mb-8">
            <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-10 w-auto" />
          </div>
          
          <div className="space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Zahlungsverarbeitung fehlgeschlagen</h1>
              <p className="text-black/70 font-light text-xl">{error}</p>
            </div>
            
            <Button 
              onClick={() => navigate('/payment')}
              className="w-full"
            >
              Erneut versuchen
            </Button>
            
            <Button 
              onClick={() => navigate('/')}
              variant="outline"
              className="w-full"
            >
              Zurück zur Startseite
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-[40px] relative">
      <Confetti
        ref={confettiRef}
        className="absolute left-0 top-0 z-0 size-full pointer-events-none"
        manualstart
      />
      
      <div className="w-full max-w-md space-y-6 text-center relative z-10">
        <div className="flex justify-center mb-8">
          <img src="/lovable-uploads/8eb6c82b-7b0b-4d51-a64f-6d3e8b5366fd.png" alt="Ditax Logo" className="h-10 w-auto" />
        </div>
        
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="space-y-2">
              <h1 className="font-bold leading-[1.1] tracking-tight text-black text-2xl">Zahlung erfolgreich!</h1>
              <p className="text-black/70 font-light text-xl">
                Vielen Dank für deine Zahlung. Deine Steuererklärung für {taxYear} wurde erfolgreich bezahlt.
              </p>
            </div>
          </div>

          <div className="pt-4 pb-4 px-6 bg-blue-50 rounded-2xl border border-blue-100">
            <p className="text-sm text-blue-900">
              <span className="font-semibold">Status:</span> In Bearbeitung
            </p>
            <p className="text-xs text-blue-700 mt-2">
              Du erhältst in Kürze eine Bestätigung per E-Mail.
            </p>
          </div>
          
          <Button 
            onClick={() => storedTaxReturnId ? navigate(`/tax-return-tracking/${storedTaxReturnId}`) : navigate('/')}
            className="w-full"
          >
            Steuererklärung anzeigen
          </Button>
          
          <Button 
            onClick={() => navigate('/')}
            variant="outline"
            className="w-full"
          >
            Zurück zur Übersicht
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
