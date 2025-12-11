import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFormContext } from '../contexts/FormContext';
import { calculatePrice, PriceBreakdown } from '@/utils/priceCalculator';
import { CheckCircle, Clock, Zap, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
interface PaymentSectionProps {
  isUpgrade?: boolean;
  upgradeReturnId?: string;
}
const PaymentSection: React.FC<PaymentSectionProps> = ({
  isUpgrade = false,
  upgradeReturnId
}) => {
  const {
    formData,
    taxYear
  } = useFormContext();
  const navigate = useNavigate();
  const year = taxYear || (new Date().getFullYear() - 1).toString();
  const [isLoading, setIsLoading] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expressService, setExpressService] = useState(isUpgrade);
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    // Check auth status
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

    // Listen for auth changes
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setIsLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, []);
  useEffect(() => {
    // For upgrades, only charge CHF 100.00
    if (isUpgrade) {
      setPriceBreakdown({
        basePrice: 0,
        incomeAdditional: 0,
        deductionsDiscount: 0,
        assetsAdditional: 0,
        expressService: 10000,
        totalPrice: 10000,
        items: [{
          label: 'Express-Service Upgrade',
          amount: 10000
        }]
      });
    } else {
      const breakdown = calculatePrice(formData, expressService);
      setPriceBreakdown(breakdown);
    }
  }, [formData, expressService, isUpgrade]);

  // Load user data
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: {
          user: currentUser
        }
      } = await supabase.auth.getUser();
      if (currentUser) {
        const {
          data: profile
        } = await supabase.from('profiles').select('*').eq('id', currentUser.id).single();
        const fullName = profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : 'Alexander Parkinson';
        setUser({
          name: fullName,
          address: profile?.address || '2438 6th Ave, Arizona, United States',
          email: currentUser.email || 'alex@example.com',
          phone: profile?.phone || '(+1) 098 643 9424'
        });
      }
    };
    fetchUser();
  }, []);
  const handlePayment = async () => {
    if (!isLoggedIn) {
      toast.error("Bitte melde dich an, um die Zahlung abzuschließen.");
      navigate('/auth');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    try {
      if (!priceBreakdown) {
        throw new Error("Der Preis konnte nicht berechnet werden. Bitte lade die Seite neu.");
      }

      // Get or create tax_return record
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Benutzer nicht gefunden");
      }

      // For upgrades, use the provided tax return ID
      let taxReturnId;
      if (isUpgrade && upgradeReturnId) {
        taxReturnId = upgradeReturnId;
      } else {
        // First try to find existing tax_return
        let {
          data: taxReturn,
          error: fetchError
        } = await supabase.from('tax_returns').select('id').eq('user_id', user.id).eq('tax_year', year).maybeSingle();

        // If not found, create one
        if (!taxReturn) {
          const {
            data: newTaxReturn,
            error: insertError
          } = await supabase.from('tax_returns').insert({
            user_id: user.id,
            tax_year: year,
            payment_status: 'pending'
          }).select('id').single();
          if (insertError) {
            throw new Error(`Fehler beim Erstellen des Steuereintrags: ${insertError.message}`);
          }
          taxReturn = newTaxReturn;
        }
        taxReturnId = taxReturn.id;
      }
      const totalInCents = Math.round(priceBreakdown.totalPrice * 100);
      const requestPayload = {
        taxYear: year,
        amount: totalInCents,
        items: [{
          label: 'Grundpreis',
          amount: totalInCents
        }],
        expressService,
        taxReturnId: taxReturnId,
        origin: window.location.origin
      };
      console.log('💳 Creating payment session:', requestPayload);
      const {
        data,
        error
      } = await supabase.functions.invoke('create-payment', {
        body: requestPayload
      });
      if (error) {
        console.error('❌ Payment creation error:', error);
        throw error;
      }
      if (!data?.url) {
        throw new Error('Keine Zahlungs-URL erhalten');
      }
      console.log('✅ Payment session created:', {
        sessionId: data.sessionId,
        url: data.url
      });

      // Open payment URL
      if (Capacitor.isNativePlatform()) {
        toast.info("Zahlung wird im Browser geöffnet...");
        await Browser.open({
          url: data.url,
          presentationStyle: 'fullscreen',
          toolbarColor: '#2563eb'
        });
      } else {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      setErrorMessage(error.message || 'Ein Fehler ist aufgetreten');
      toast.error(error.message || 'Zahlung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      setIsLoading(false);
    }
  };
  const formatPrice = (cents: number) => {
    return (cents / 100).toFixed(2);
  };
  if (!priceBreakdown) {
    return <div className="min-h-screen bg-white" />;
  }
  const finalPrice = isUpgrade ? priceBreakdown.totalPrice : expressService ? priceBreakdown.totalPrice + 10000 : priceBreakdown.totalPrice;
  return <div className="min-h-screen bg-white flex items-center justify-center py-12 px-4 sm:px-6">
      <div className="w-full max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl text-slate-900 tracking-tight font-semibold">
            Deine Kostenübersicht
          </h1>
          <p className="text-lg text-slate-500 font-medium">
            Transparente Preisgestaltung ohne versteckte Kosten
          </p>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.06)] border border-slate-100 overflow-hidden relative">
          <div className="p-6 sm:p-10 space-y-8">
            {/* Express Service Toggle - Only show for non-upgrades */}
            {!isUpgrade && <div className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 bg-gradient-to-br from-blue-50 to-white border border-blue-200 shadow-sm transition-all duration-300 hover:shadow-md hover:border-blue-300 gap-4 sm:gap-0 rounded-[2rem]">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white rounded-xl text-blue-600 shrink-0 shadow-sm ring-1 ring-blue-100">
                    <Zap className="w-6 h-6 fill-blue-100" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-lg font-bold text-slate-900">
                        Express-Service
                      </p>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white uppercase tracking-wider shadow-sm">
                        Empfohlen
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-600 mt-1">
                      Bearbeitung in 10 Arbeitstagen
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-4 pl-16 sm:pl-0">
                  <span className="text-base font-bold text-slate-900">
                    +100.00 CHF
                  </span>
                  <Switch checked={expressService} onCheckedChange={setExpressService} />
                </div>
              </div>}

            {/* Cost Breakdown */}
            <div className="bg-slate-50 rounded-2xl p-6 sm:p-8 border border-slate-100">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-6">
                Kostenaufschlüsselung
              </h3>

              <div className="space-y-4 mb-6">
                {priceBreakdown.items.map((item, index) => <div key={index} className="flex justify-between items-center text-slate-700">
                    <span className="font-medium">{item.label}</span>
                    <span className="font-semibold text-slate-900">CHF {formatPrice(item.amount)}</span>
                  </div>)}
                
                {!isUpgrade && expressService && <div className="flex justify-between items-center text-slate-700">
                    <span className="font-medium">Express-Service</span>
                    <span className="font-semibold text-slate-900">CHF 100.00</span>
                  </div>}
              </div>

              <div className="pt-6 border-t border-slate-200 flex justify-between items-center">
                <span className="text-lg font-semibold text-slate-900">
                  Gesamtpreis
                </span>
                <div className="text-right">
                  <span className="block text-3xl font-semibold text-slate-900 tracking-tight">
                    CHF {formatPrice(finalPrice)}
                  </span>
                  <span className="block text-xs text-slate-500 font-medium mt-1">
                    inkl. MwSt.
                  </span>
                </div>
              </div>
            </div>

            {/* CTA Button */}
            <button onClick={handlePayment} disabled={isLoading || !priceBreakdown || !isLoggedIn} className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg font-medium py-4 px-6 shadow-[0_20px_40px_-12px_rgba(37,99,235,0.4)] transition-all transform active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-blue-600/20 rounded-full disabled:opacity-50 disabled:cursor-not-allowed">
              {isLoading ? 'Lädt…' : !isLoggedIn ? 'Bitte anmelden' : 'Jetzt bezahlen'}
            </button>

            {/* Trust Badge */}
            <div className="flex justify-center">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white rounded-full border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.08)]">
                <ShieldCheck className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-medium text-slate-500">
                  Sichere Zahlung mit Stripe
                </span>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && <div className="mt-4">
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {errorMessage}
            </div>
          </div>}
      </div>
    </div>;
};
export default PaymentSection;