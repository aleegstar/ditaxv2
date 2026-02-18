import React, { useState, useEffect } from 'react';
import paymentVisa from '@/assets/payment-visa.png';
import paymentMastercard from '@/assets/payment-mastercard.png';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFormContext } from '../contexts/FormContext';
import { calculatePrice, PriceBreakdown } from '@/utils/priceCalculator';
import { CheckCircle, Clock, Zap, ShieldCheck, Gift, Tag, Loader2, X } from "lucide-react";
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useNavigate } from "react-router-dom";
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
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
  const { activeTaxFilerId } = useTaxFiler();
  const navigate = useNavigate();
  const year = taxYear || (new Date().getFullYear() - 1).toString();
  const [isLoading, setIsLoading] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [expressService, setExpressService] = useState(isUpgrade);
  const [user, setUser] = useState<any>(null);
  const { promoCodes, getActivePromoCode } = usePromoCodes();
  const [manualPromoCode, setManualPromoCode] = useState('');
  const [manualPromoValidating, setManualPromoValidating] = useState(false);
  const [manualPromoResult, setManualPromoResult] = useState<{
    valid: boolean;
    promoCodeId: string;
    percentOff?: number;
    amountOff?: number;
    name?: string;
  } | null>(null);
  const [manualPromoError, setManualPromoError] = useState<string | null>(null);
  
  const activePromo = getActivePromoCode();
  const promoDiscount = activePromo ? activePromo.amount : 0;

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

  const handleValidatePromoCode = async () => {
    if (!manualPromoCode.trim()) return;
    setManualPromoValidating(true);
    setManualPromoError(null);
    setManualPromoResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('validate-promo-code', {
        body: { code: manualPromoCode.trim() }
      });
      if (error) throw error;
      if (data.valid) {
        setManualPromoResult(data);
        toast.success('Aktionscode angewendet!');
      } else {
        setManualPromoError(data.error || 'Ungültiger Code');
      }
    } catch (err: any) {
      setManualPromoError('Fehler bei der Validierung');
    } finally {
      setManualPromoValidating(false);
    }
  };

  const clearManualPromo = () => {
    setManualPromoCode('');
    setManualPromoResult(null);
    setManualPromoError(null);
  };

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
        } = await supabase.from('tax_returns').select('id').eq('user_id', user.id).eq('tax_year', year).eq('tax_filer_id', activeTaxFilerId).maybeSingle();

        if (!taxReturn) {
          const {
            data: newTaxReturn,
            error: insertError
          } = await supabase.from('tax_returns').insert({
            user_id: user.id,
            tax_filer_id: activeTaxFilerId,
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
        origin: window.location.origin,
        promoCodeId: manualPromoResult?.promoCodeId || activePromo?.promoId // Pass promo code ID to backend
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

      // Validate payment URL before redirect
      const paymentUrl = data.url;
      const parsed = new URL(paymentUrl);
      const allowedHosts = ['checkout.stripe.com', 'pay.stripe.com'];
      if (!allowedHosts.some(host => parsed.hostname.endsWith(host))) {
        throw new Error('Unbekannte Zahlungs-URL');
      }
      if (parsed.protocol !== 'https:') {
        throw new Error('Unsichere Zahlungs-URL');
      }

      if (Capacitor.isNativePlatform()) {
        toast.info("Zahlung wird im Browser geöffnet...");
        await Browser.open({
          url: paymentUrl,
          presentationStyle: 'fullscreen',
          toolbarColor: '#2563eb'
        });
      } else {
        window.location.href = paymentUrl;
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

  const finalPrice = priceBreakdown.totalPrice;
  const manualPercentOff = manualPromoResult?.percentOff || 0;
  const manualAmountOff = manualPromoResult?.amountOff || 0;
  const manualDiscount = manualPercentOff > 0 ? Math.round(finalPrice * manualPercentOff / 100) : manualAmountOff;
  const totalDiscount = promoDiscount + manualDiscount;
  const priceAfterDiscount = Math.max(0, finalPrice - totalDiscount);
  const hasAnyPromo = !!activePromo || !!manualPromoResult;

  return (
    <div className="min-h-screen bg-white flex flex-col text-slate-800">
      {/* Header */}
      <SubpageHeader
        title="Zahlung"
        onBack={() => navigate(-1)}
      />

      <main className="flex-grow pt-8 pb-16 px-4 sm:px-6">
        <div className="max-w-[640px] mx-auto">

          {/* Main Card Container */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 p-2 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.03)] ring-1 ring-slate-50">
            <div className="p-6 sm:p-8 space-y-8">

              {/* Express Service Toggle */}
              {!isUpgrade && (
                <div className="relative overflow-hidden rounded-2xl bg-blue-50/60 border border-blue-100/80 p-5 flex items-center justify-between transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
                      <Zap className="w-5 h-5 fill-current" />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-medium text-slate-900 tracking-tight">Express-Service</h3>
                        <span className="px-2.5 py-0.5 rounded-full bg-primary text-white text-[10px] font-semibold tracking-wide uppercase">Empfohlen</span>
                      </div>
                      <p className="text-sm text-slate-500 font-normal mt-0.5">Bearbeitung in 10 Arbeitstagen</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <span className="text-base font-medium text-slate-900 tracking-tight">+100.00</span>
                    <Switch checked={expressService} onCheckedChange={setExpressService} />
                  </div>
                </div>
              )}

              {/* Promo Code Display (referral) */}
              {activePromo && (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Gift className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700 text-sm">Rabattcode aktiv</p>
                        <p className="text-xs text-green-600">Code <span className="font-mono">{activePromo.code}</span></p>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-green-600">-{formatPrice(promoDiscount)}</span>
                  </div>
                </div>
              )}

              {/* Manual Promo Code Input */}
              {!manualPromoResult ? (
                <div className="space-y-2">
                  <div className="flex gap-3 h-14">
                    <div className="relative flex-grow h-full group">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Tag className="w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                      </div>
                      <input
                        type="text"
                        placeholder="Aktionscode eingeben"
                        value={manualPromoCode}
                        onChange={(e) => { setManualPromoCode(e.target.value); setManualPromoError(null); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleValidatePromoCode()}
                        className="w-full h-full pl-11 pr-4 bg-white border border-slate-200 text-slate-900 text-base rounded-2xl focus:ring-4 focus:ring-primary/10 focus:border-primary focus:outline-none transition-all placeholder:text-slate-400 placeholder:font-normal font-normal"
                      />
                    </div>
                    <button
                      onClick={handleValidatePromoCode}
                      disabled={!manualPromoCode.trim() || manualPromoValidating}
                      className="px-6 h-full bg-slate-100 hover:bg-slate-200/80 text-slate-600 font-medium rounded-2xl transition-colors text-sm tracking-tight border border-slate-200/50 disabled:opacity-50"
                    >
                      {manualPromoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anwenden'}
                    </button>
                  </div>
                  {manualPromoError && (
                    <p className="text-xs text-red-500 pl-1">{manualPromoError}</p>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-green-100 rounded-full">
                        <Tag className="w-4 h-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-green-700 text-sm">Aktionscode aktiv</p>
                        <p className="text-xs text-green-600">
                          {manualPromoResult.percentOff ? `${manualPromoResult.percentOff}% Rabatt` : `CHF ${formatPrice(manualPromoResult.amountOff || 0)} Rabatt`}
                        </p>
                      </div>
                    </div>
                    <button onClick={clearManualPromo} className="p-1 hover:bg-green-100 rounded-full transition-colors">
                      <X className="w-4 h-4 text-green-600" />
                    </button>
                  </div>
                </div>
              )}

              {/* Cost Breakdown */}
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80">
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Kostenaufstellung</h4>
                </div>
                <div className="bg-white divide-y divide-slate-50">
                  {priceBreakdown.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center px-6 py-4 hover:bg-slate-50/50 transition-colors">
                      <span className="text-slate-600 font-normal">{item.label}</span>
                      <span className="text-slate-900 font-medium tabular-nums">CHF {formatPrice(item.amount)}</span>
                    </div>
                  ))}
                </div>
                {/* Total */}
                <div className="bg-slate-50/80 px-6 py-5 border-t border-slate-100">
                  {hasAnyPromo && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500">Zwischensumme</span>
                      <span className="text-xs text-slate-400 line-through tabular-nums">CHF {formatPrice(finalPrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-slate-900 font-semibold text-base tracking-tight">
                        {hasAnyPromo ? 'Nach Rabatt' : 'Total'}
                      </span>
                      <span className="text-[11px] text-slate-400 font-normal uppercase tracking-wide">inkl. MwSt.</span>
                    </div>
                    <span className="text-slate-900 font-semibold text-xl tracking-tight tabular-nums">
                      CHF {formatPrice(priceAfterDiscount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-4">
                <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-1">Zahlungsmethoden</h4>
                <div className="flex gap-3">
                  {/* TWINT */}
                  <div className="h-12 px-4 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:border-slate-300 transition-colors cursor-pointer min-w-[80px]">
                    <span className="font-bold text-slate-900 text-sm italic tracking-tighter">TWINT</span>
                  </div>
                  {/* VISA */}
                  <div className="h-12 px-4 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:border-slate-300 transition-colors cursor-pointer min-w-[80px]">
                    <img src={paymentVisa} alt="Visa" className="h-5 object-contain" />
                  </div>
                  {/* Mastercard */}
                  <div className="h-12 px-4 bg-white border border-slate-200 rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:border-slate-300 transition-colors cursor-pointer min-w-[80px]">
                    <img src={paymentMastercard} alt="Mastercard" className="h-7 object-contain" />
                  </div>
                </div>
              </div>

              {/* Primary Action */}
              <div className="pt-2">
                <button
                  onClick={handlePayment}
                  disabled={isLoading || !priceBreakdown || !isLoggedIn}
                  className="w-full h-14 bg-primary hover:bg-primary/90 text-white rounded-2xl font-medium text-lg tracking-tight shadow-xl shadow-primary/20 transition-all hover:shadow-primary/30 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Lädt…' : !isLoggedIn ? 'Bitte anmelden' : 'Jetzt bezahlen'}
                </button>
              </div>

              {/* Trust Badge */}
              <div className="flex justify-center pb-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50/50 rounded-full border border-slate-100">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-slate-500 font-normal">Sichere Zahlung mit Stripe</span>
                </div>
              </div>

            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm mt-4">
              {errorMessage}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentSection;