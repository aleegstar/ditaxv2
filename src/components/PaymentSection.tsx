import React, { useState, useEffect } from 'react';
import paymentVisa from '@/assets/payment-visa.png';
import paymentMastercard from '@/assets/payment-mastercard.png';
import paymentTwint from '@/assets/payment-twint.png';
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
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { isDespiaNative, triggerDespiaOAuth } from '@/lib/despia';
import { useAuth } from '@/contexts/AuthContext';
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
  const { isValid, isLoading: authLoading, refreshAuth } = useAuth();
  const navigate = useNavigate();
  const year = taxYear || (new Date().getFullYear() - 1).toString();
  const [isLoading, setIsLoading] = useState(false);
  const [priceBreakdown, setPriceBreakdown] = useState<PriceBreakdown | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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

  // Auto-recovery: refresh session or redirect if invalid
  useEffect(() => {
    if (authLoading) return;
    if (isValid) return;

    const sessionKey = 'payment_auth_retry';
    const hasRetried = sessionStorage.getItem(sessionKey);

    if (!hasRetried) {
      sessionStorage.setItem(sessionKey, 'true');
      refreshAuth().then(success => {
        if (!success) {
          window.location.reload();
        }
      });
    } else {
      sessionStorage.removeItem(sessionKey);
      navigate('/auth');
    }
  }, [authLoading, isValid, refreshAuth, navigate]);

  // Clear retry flag on successful auth
  useEffect(() => {
    if (isValid) {
      sessionStorage.removeItem('payment_auth_retry');
    }
  }, [isValid]);

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
    if (!isValid) {
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
        items: priceBreakdown.items,
        expressService,
        taxReturnId: taxReturnId,
        taxFilerId: activeTaxFilerId,
        origin: window.location.origin,
        promoCodeId: manualPromoResult?.promoCodeId || activePromo?.promoId,
        isDespia: isDespiaNative()
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

      if (isDespiaNative()) {
        // Despia native: open Stripe via oauth:// protocol
        // The payment-redirect edge function will redirect to ditax://oauth/payment-success
        // which automatically closes the browser and navigates the WebView
        toast.info("Zahlung wird geöffnet...");
        triggerDespiaOAuth(paymentUrl);

        // Polling as fallback in case deeplink doesn't work
        let pollingStopped = false;
        const pollInterval = setInterval(async () => {
          if (pollingStopped || !taxReturnId) return;
          try {
            const { data: taxReturn } = await supabase
              .from('tax_returns')
              .select('payment_status')
              .eq('id', taxReturnId)
              .maybeSingle();

            if (taxReturn?.payment_status === 'paid') {
              pollingStopped = true;
              clearInterval(pollInterval);
              navigate(`/payment-success?session_id=polling&tax_year=${year}&tax_return_id=${taxReturnId}${activeTaxFilerId ? `&tax_filer_id=${activeTaxFilerId}` : ''}`);
            }
          } catch (err) {
            console.error('Polling error:', err);
          }
        }, 3000);

        // Stop polling after 5 minutes
        setTimeout(() => {
          pollingStopped = true;
          clearInterval(pollInterval);
        }, 300000);
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
    return <div className="min-h-screen" />;
  }

  const finalPrice = priceBreakdown.totalPrice;
  const manualPercentOff = manualPromoResult?.percentOff || 0;
  const manualAmountOff = manualPromoResult?.amountOff || 0;
  const manualDiscount = manualPercentOff > 0 ? Math.round(finalPrice * manualPercentOff / 100) : manualAmountOff;
  const totalDiscount = promoDiscount + manualDiscount;
  const priceAfterDiscount = Math.max(0, finalPrice - totalDiscount);
  const hasAnyPromo = !!activePromo || !!manualPromoResult;

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      {/* Header */}
      <SubpageHeader
        title="Zahlung"
        onBack={() => navigate(-1)}
      />

      <main className="flex-grow pt-4 sm:pt-8 pb-16 px-3 sm:px-6">
        <div className="max-w-[640px] mx-auto">

          {/* Main Card Container */}
          <div className="bg-gradient-to-br from-white/70 to-white/30 backdrop-blur-2xl backdrop-saturate-200 rounded-[1.5rem] sm:rounded-[2rem] border border-white/60 p-1 sm:p-2 shadow-[0_24px_48px_-12px_rgba(0,0,0,0.08)]">
            <div className="p-4 sm:p-8 space-y-5 sm:space-y-8">

              {/* Express Service Toggle */}
              {!isUpgrade && (
                <button
                  type="button"
                  onClick={() => setExpressService(!expressService)}
                  className={`relative w-full overflow-hidden rounded-2xl border-2 p-3.5 sm:p-5 transition-all active:scale-[0.99] ${
                    expressService
                      ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10'
                      : 'border-white/60 bg-white/40 hover:border-white/80 hover:bg-white/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex flex-col items-start text-left min-w-0">
                        <span className="px-1.5 py-0.5 rounded-full bg-primary text-white text-[9px] sm:text-[10px] font-bold tracking-wide uppercase mb-1">Empfohlen</span>
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900 tracking-tight">Express-Service</h3>
                        <p className="text-xs sm:text-sm text-slate-500 font-normal mt-0.5">Bearbeitung in 10 Arbeitstagen</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
                      <span className="text-sm sm:text-base font-semibold text-slate-900 tabular-nums whitespace-nowrap">+100.00</span>
                      <div className={`w-11 sm:w-12 h-6 sm:h-7 rounded-full transition-all relative ${
                        expressService ? 'bg-primary' : 'bg-slate-200'
                      }`}>
                        <div className={`absolute top-0.5 w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-white shadow-md transition-all ${
                          expressService ? 'left-[calc(100%-1.375rem)] sm:left-[calc(100%-1.625rem)]' : 'left-0.5'
                        }`} />
                      </div>
                    </div>
                  </div>
                </button>
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



              {/* Cost Breakdown */}
              <div className="rounded-2xl border border-white/60 bg-white/30 overflow-hidden">
                <div className="px-3 sm:px-6 py-3 sm:py-4 border-b border-white/40 bg-white/20">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Kostenaufstellung</h4>
                </div>
                <div className="bg-white/20 divide-y divide-white/30">
                  {priceBreakdown.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center px-3 sm:px-6 py-3 sm:py-4 hover:bg-white/20 transition-colors gap-2">
                      <span className="text-foreground/70 font-normal text-sm sm:text-base truncate min-w-0">{item.label}</span>
                      <span className="text-foreground font-medium tabular-nums text-sm sm:text-base whitespace-nowrap shrink-0">CHF {formatPrice(item.amount)}</span>
                    </div>
                  ))}
                </div>
                {/* Total */}
                <div className="bg-white/20 px-3 sm:px-6 py-4 sm:py-5 border-t border-white/40">
                  {hasAnyPromo && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-muted-foreground">Zwischensumme</span>
                      <span className="text-xs text-muted-foreground line-through tabular-nums">CHF {formatPrice(finalPrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                      <span className="text-foreground font-semibold text-base tracking-tight">
                        {hasAnyPromo ? 'Nach Rabatt' : 'Total'}
                      </span>
                      <span className="text-[11px] text-muted-foreground font-normal uppercase tracking-wide">inkl. MwSt.</span>
                    </div>
                    <span className="text-foreground font-semibold text-xl tracking-tight tabular-nums">
                      CHF {formatPrice(priceAfterDiscount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-3">
                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1">Zahlungsmethoden</h4>
                <div className="flex gap-2.5 flex-wrap">
                  {/* TWINT */}
                  <div className="h-11 sm:h-12 px-3.5 bg-white/50 border border-white/60 rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:bg-white/70 transition-colors cursor-pointer">
                    <img src={paymentTwint} alt="TWINT" className="h-5 object-contain" loading="lazy" />
                  </div>
                  {/* VISA */}
                  <div className="h-11 sm:h-12 px-3.5 bg-white/50 border border-white/60 rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:bg-white/70 transition-colors cursor-pointer">
                    <img src={paymentVisa} alt="Visa" className="h-5 object-contain" loading="lazy" />
                  </div>
                  {/* Mastercard */}
                  <div className="h-11 sm:h-12 px-3.5 bg-white/50 border border-white/60 rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:bg-white/70 transition-colors cursor-pointer">
                    <img src={paymentMastercard} alt="Mastercard" className="h-7 object-contain" loading="lazy" />
                  </div>
                  {/* Klarna */}
                  <div className="h-11 sm:h-12 px-3.5 bg-white/50 border border-white/60 rounded-xl flex items-center justify-center shrink-0 shadow-sm hover:bg-white/70 transition-colors cursor-pointer">
                    <span className="font-bold text-[#FFB3C7] text-sm tracking-tight">Klarna.</span>
                  </div>
                </div>
              </div>

              {/* Primary Action */}
              <div className="pt-2">
                <button
                  onClick={handlePayment}
                  disabled={isLoading || !priceBreakdown || !isValid || authLoading}
                  className="flex w-full items-center justify-center rounded-full bg-gradient-to-b from-[hsl(222,100%,60%)] to-[hsl(222,100%,47%)] px-6 py-3.5 font-semibold text-sm text-primary-foreground transition-all shadow-[0_4px_16px_-4px_hsl(222,100%,50%/0.4),inset_0_1px_0_hsl(0,0%,100%/0.2)] hover:shadow-[0_6px_24px_-4px_hsl(222,100%,50%/0.5)] hover:scale-[1.02] active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isLoading ? 'Lädt…' : authLoading ? 'Sitzung wird geprüft…' : !isValid ? 'Bitte anmelden' : 'Jetzt bezahlen'}
                </button>
              </div>

              {/* Trust Badge */}
              <div className="flex justify-center pb-2">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/30 rounded-full border border-white/40">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm text-muted-foreground font-normal">Sichere Zahlung mit Stripe</span>
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