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
import { CheckCircle, Clock, Zap, ShieldCheck, Gift, Tag, Loader2, X, FileText, Columns, Bitcoin, Home, Briefcase, Calculator, Receipt, Sparkles, Lock, Check } from "lucide-react";
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
  const [selectedMethod, setSelectedMethod] = useState<'twint' | 'visa' | 'mastercard' | 'klarna'>('twint');
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

  const getItemIcon = (label: string) => {
    const l = label.toLowerCase();
    if (l.includes('grund') || l.includes('basis')) return FileText;
    if (l.includes('säule') || l.includes('saule') || l.includes('3a') || l.includes('vorsorge')) return Columns;
    if (l.includes('krypto') || l.includes('bitcoin')) return Bitcoin;
    if (l.includes('immo') || l.includes('liegenschaft') || l.includes('haus') || l.includes('wohn')) return Home;
    if (l.includes('selbst') || l.includes('gewerb') || l.includes('beruf')) return Briefcase;
    if (l.includes('express')) return Zap;
    if (l.includes('abzug') || l.includes('rabatt')) return Tag;
    return Calculator;
  };

  const methods: Array<{ id: 'twint' | 'visa' | 'mastercard' | 'klarna'; render: React.ReactNode }> = [
    { id: 'twint', render: <img src={paymentTwint} alt="TWINT" className="h-5 object-contain" loading="lazy" /> },
    { id: 'visa', render: <img src={paymentVisa} alt="Visa" className="h-5 object-contain" loading="lazy" /> },
    { id: 'mastercard', render: <img src={paymentMastercard} alt="Mastercard" className="h-7 object-contain" loading="lazy" /> },
    { id: 'klarna', render: <span className="font-bold text-[#FFB3C7] text-sm tracking-tight">Klarna.</span> },
  ];

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <SubpageHeader title="Zahlung" onBack={() => navigate(-1)} />

      <main className="flex-grow pt-2 sm:pt-6 pb-16 px-4 sm:px-6">
        <div className="max-w-[640px] mx-auto space-y-4">

          {/* Express Service Card */}
          {!isUpgrade && (
            <button
              type="button"
              onClick={() => setExpressService(!expressService)}
              className="relative w-full overflow-hidden rounded-3xl bg-white border border-slate-100 p-5 text-left shadow-sm transition-all active:scale-[0.99]"
            >
              {/* decorative blob */}
              <div className="pointer-events-none absolute -right-10 -top-10 w-40 h-40 rounded-full bg-primary/5" />
              <div className="relative flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold tracking-wider uppercase mb-3">
                    <Sparkles className="w-3 h-3" strokeWidth={2.5} />
                    Empfohlen
                  </span>
                  <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Express-Service</h3>
                  <p className="text-sm text-slate-500 mt-1">Bearbeitung in 10 Arbeitstagen</p>
                </div>
                <div className="flex items-center gap-3 shrink-0 pt-1">
                  <span className="text-base font-semibold text-primary tabular-nums whitespace-nowrap">+100.00</span>
                  <div className={`w-12 h-7 rounded-full transition-all relative ${expressService ? 'bg-primary' : 'bg-slate-200'}`}>
                    <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all ${expressService ? 'left-[calc(100%-1.625rem)]' : 'left-0.5'}`} />
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

          {/* Cost Breakdown Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Kostenaufstellung</h4>
            <div className="divide-y divide-slate-100">
              {priceBreakdown.items.map((item, idx) => {
                const Icon = getItemIcon(item.label);
                return (
                  <div key={idx} className="flex items-center justify-between py-3.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-primary" strokeWidth={2} />
                      </div>
                      <span className="text-slate-900 font-medium text-base truncate">{item.label}</span>
                    </div>
                    <span className="text-slate-900 font-medium tabular-nums text-base whitespace-nowrap shrink-0">
                      CHF {formatPrice(item.amount)}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Dotted divider */}
            <div className="border-t border-dashed border-slate-200 my-4" />

            {hasAnyPromo && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-slate-400">Zwischensumme</span>
                <span className="text-xs text-slate-400 line-through tabular-nums">CHF {formatPrice(finalPrice)}</span>
              </div>
            )}
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-slate-900 font-semibold text-2xl tracking-tight leading-none">
                  {hasAnyPromo ? 'Nach Rabatt' : 'Total'}
                </span>
                <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-1">inkl. MwSt.</span>
              </div>
              <span className="text-slate-900 font-semibold text-3xl tracking-tight tabular-nums leading-none">
                CHF {formatPrice(priceAfterDiscount)}
              </span>
            </div>
          </div>

          {/* Payment Methods Card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-5 sm:p-6">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">Zahlungsmethoden</h4>
            <div className="grid grid-cols-4 gap-2.5">
              {methods.map((m) => {
                const active = selectedMethod === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`relative h-14 rounded-2xl flex items-center justify-center transition-all ${
                      m.id === 'klarna'
                        ? 'bg-[#FFE0EC]'
                        : 'bg-white border'
                    } ${active && m.id !== 'klarna' ? 'border-primary border-2' : 'border-slate-200'} ${active && m.id === 'klarna' ? 'ring-2 ring-primary' : ''}`}
                  >
                    {m.render}
                    {active && (
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow">
                        <Check className="w-3 h-3 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Action */}
          <div className="pt-2">
            <Button
              type="button"
              onClick={handlePayment}
              disabled={isLoading || !priceBreakdown || !isValid || authLoading}
              className="w-full"
            >
              {isLoading ? 'Lädt…' : authLoading ? 'Sitzung wird geprüft…' : !isValid ? 'Bitte anmelden' : 'Jetzt bezahlen'}
            </Button>
          </div>

          {/* Trust Badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-slate-500 font-normal">Sichere Zahlung mit Stripe</span>
            </div>
          </div>

          {errorMessage && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-sm">
              {errorMessage}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default PaymentSection;