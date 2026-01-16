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
import { SubpageHeader } from '@/components/ui/subpage-header';
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
    const checkAuth = async () => {
      const {
        data: {
          session
        }
      } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);
    };
    checkAuth();

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

      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Benutzer nicht gefunden");
      }

      let taxReturnId;
      if (isUpgrade && upgradeReturnId) {
        taxReturnId = upgradeReturnId;
      } else {
        let {
          data: taxReturn,
          error: fetchError
        } = await supabase.from('tax_returns').select('id').eq('user_id', user.id).eq('tax_year', year).maybeSingle();

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
      const totalInCents = priceBreakdown.totalPrice; // totalPrice is already in cents
      const requestPayload = {
        taxYear: year,
        amount: totalInCents,
        items: priceBreakdown.items, // Use actual breakdown items instead of single item
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

  return (
    <div className="min-h-screen bg-white flex flex-col text-slate-800">
      {/* Header */}
      <SubpageHeader
        title="Zahlung"
        onBack={() => navigate(-1)}
      />

      <div className="flex-1 flex items-center justify-center py-8 px-4 sm:px-6">
        <div className="w-full max-w-lg mx-auto space-y-6">
          {/* Content Card */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="p-6 space-y-6">
              {/* Express Service Toggle - Only show for non-upgrades */}
              {!isUpgrade && (
                <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-[#1D64FF]/20 rounded-lg text-[#1D64FF] shrink-0">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-slate-800 font-jakarta">
                          Express-Service
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#1D64FF] text-white uppercase tracking-wider">
                          Empfohlen
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 font-jakarta">
                        Bearbeitung in 10 Arbeitstagen
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-800 font-jakarta">
                      +100.00
                    </span>
                    <Switch checked={expressService} onCheckedChange={setExpressService} />
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
                <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-4 font-jakarta">
                  Kostenaufschlüsselung
                </h3>

                <div className="space-y-3 mb-4">
                  {priceBreakdown.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center text-slate-600">
                      <span className="text-sm font-medium font-jakarta">{item.label}</span>
                      <span className="text-sm font-semibold text-slate-800 font-jakarta">CHF {formatPrice(item.amount)}</span>
                    </div>
                  ))}
                  
                  {!isUpgrade && expressService && (
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="text-sm font-medium font-jakarta">Express-Service</span>
                      <span className="text-sm font-semibold text-slate-800 font-jakarta">CHF 100.00</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200 flex justify-between items-center">
                  <span className="text-sm font-semibold text-slate-800 font-jakarta">
                    Gesamtpreis
                  </span>
                  <div className="text-right">
                    <span className="block text-2xl font-semibold text-slate-800 tracking-tight font-jakarta">
                      CHF {formatPrice(finalPrice)}
                    </span>
                    <span className="block text-[10px] text-slate-500 font-medium mt-0.5 font-jakarta">
                      inkl. MwSt.
                    </span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <button 
                onClick={handlePayment} 
                disabled={isLoading || !priceBreakdown || !isLoggedIn} 
                className="w-full bg-[#1D64FF] hover:bg-[#1D64FF]/90 text-white text-base font-medium py-3.5 px-6 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed font-jakarta shadow-md"
              >
                {isLoading ? 'Lädt…' : !isLoggedIn ? 'Bitte anmelden' : 'Jetzt bezahlen'}
              </button>

              {/* Trust Badge */}
              <div className="flex justify-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-full border border-slate-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-medium text-slate-500 font-jakarta">
                    Sichere Zahlung mit Stripe
                  </span>
                </div>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl text-sm font-jakarta">
              {errorMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentSection;