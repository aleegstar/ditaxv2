import React, { useState, useEffect } from 'react';
import paymentVisa from '@/assets/payment-visa.png';
import paymentMastercard from '@/assets/payment-mastercard.png';
import paymentTwint from '@/assets/payment-twint.png';
import paymentHero from '@/assets/payment-hero.webp';
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useFormContext } from '../contexts/FormContext';
import { calculatePrice, PriceBreakdown } from '@/utils/priceCalculator';
import { isPromoWeekActive, PROMO_WEEK_BASE_PRICE, PROMO_WEEK_EXPRESS_PRICE } from '@/config/promoWeek';
import { mapPriorYearToFormFlags } from '@/components/intake/priorYearMapping';
import type { ChecklistItem } from '@/hooks/usePriorYearChecklist';
import { CheckCircle, Clock, Zap, ShieldCheck, Gift, Tag, Loader2, X, FileText, Columns, Bitcoin, Home, Briefcase, Calculator, Receipt, Sparkles, Lock, Check } from "lucide-react";
import { SubpageHeader } from '@/components/ui/subpage-header';
import { useNavigate } from "react-router-dom";
import { usePromoCodes } from '@/hooks/usePromoCodes';
import { useTaxFiler } from '@/contexts/TaxFilerContext';
import { isDespiaNative, triggerDespiaStripePaymentSheet, type StripePaymentSheetEvent } from '@/lib/despia';
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
  const [isNativeCompletionPending, setIsNativeCompletionPending] = useState(false);
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

  // Cleanup native Stripe sheet listener on unmount
  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.stripeEvent = undefined;
      }
    };
  }, []);


  const [checklistFlags, setChecklistFlags] = useState<ReturnType<typeof mapPriorYearToFormFlags> | null>(null);

  // Load prior-year checklist and derive flags so price always orients on the checklist
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!activeTaxFilerId || !year) { setChecklistFlags(null); return; }
      try {
        const { data: cl } = await supabase
          .from('prior_year_checklists')
          .select('id')
          .eq('tax_filer_id', activeTaxFilerId)
          .eq('tax_year', year)
          .maybeSingle();
        if (!cl?.id) { if (!cancelled) setChecklistFlags(null); return; }
        const { data: its } = await supabase
          .from('prior_year_checklist_items')
          .select('*')
          .eq('checklist_id', cl.id);
        if (cancelled) return;
        const flags = mapPriorYearToFormFlags((its ?? []) as ChecklistItem[]);
        setChecklistFlags(flags);
      } catch {
        if (!cancelled) setChecklistFlags(null);
      }
    })();
    return () => { cancelled = true; };
  }, [activeTaxFilerId, year]);

  useEffect(() => {
    if (isUpgrade) {
      const promo = isPromoWeekActive();
      const expressAmount = promo ? PROMO_WEEK_EXPRESS_PRICE : 10000;
      setPriceBreakdown({
        basePrice: 0,
        incomeAdditional: 0,
        deductionsDiscount: 0,
        assetsAdditional: 0,
        expressService: expressAmount,
        totalPrice: expressAmount,
        items: [{
          label: promo ? 'Express-Service Upgrade (Aktionswoche)' : 'Express-Service Upgrade',
          amount: expressAmount
        }]
      });
    } else {
      // Merge checklist-derived flags into formData so the price reflects
      // the confirmed prior-year checklist (source of truth), not only saved formData.
      const merged: any = {
        ...formData,
        income: { ...(formData?.income ?? {}), ...(checklistFlags?.income ?? {}) },
        assets: { ...(formData?.assets ?? {}), ...(checklistFlags?.assets ?? {}) },
        deductions: { ...(formData?.deductions ?? {}), ...(checklistFlags?.deductions ?? {}) },
      };
      const breakdown = calculatePrice(merged, expressService);
      setPriceBreakdown(breakdown);
    }
  }, [formData, expressService, isUpgrade, checklistFlags]);

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

  // Polling helper: warte bis stripe-webhook tax_returns auf 'paid' setzt
  const pollPaymentStatus = (taxReturnId: string, onPaid: () => void) => {
    let stopped = false;
    const interval = setInterval(async () => {
      if (stopped) return;
      try {
        const { data: tr } = await supabase
          .from('tax_returns')
          .select('payment_status')
          .eq('id', taxReturnId)
          .maybeSingle();
        if (tr?.payment_status === 'paid') {
          stopped = true;
          clearInterval(interval);
          onPaid();
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, 3000);
    setTimeout(() => {
      stopped = true;
      clearInterval(interval);
    }, 300000);
  };

  const createCheckoutPaymentUrl = async (taxReturnId: string, totalInCents: number) => {
    const requestPayload = {
      taxYear: year,
      amount: totalInCents,
      items: priceBreakdown?.items ?? [],
      expressService,
      taxReturnId,
      taxFilerId: activeTaxFilerId,
      origin: window.location.origin,
      promoCodeId: manualPromoResult?.promoCodeId || activePromo?.promoId,
      isDespia: isDespiaNative(),
      isUpgrade,
    };

    console.log('💳 Creating payment session:', requestPayload);
    const { data, error } = await supabase.functions.invoke('create-payment', {
      body: requestPayload,
    });

    if (error) {
      console.error('❌ Payment creation error:', error);
      throw error;
    }

    if (!data?.url) {
      throw new Error('Keine Zahlungs-URL erhalten');
    }

    const parsed = new URL(data.url);
    const allowedHosts = ['checkout.stripe.com', 'pay.stripe.com'];
    if (!allowedHosts.some(host => parsed.hostname.endsWith(host))) {
      throw new Error('Unbekannte Zahlungs-URL');
    }
    if (parsed.protocol !== 'https:') {
      throw new Error('Unsichere Zahlungs-URL');
    }

    return data.url as string;
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

      // === DESPIA NATIVE: Stripe Payment Sheet ===
      if (isDespiaNative()) {
        const { data: piData, error: piError } = await supabase.functions.invoke('create-payment-intent', {
          body: {
            taxYear: year,
            amount: totalInCents,
            expressService,
            taxReturnId,
            taxFilerId: activeTaxFilerId,
            promoCodeId: manualPromoResult?.promoCodeId || activePromo?.promoId,
            isUpgrade,
          }
        });
        if (piError || piData?.fallback) {
          console.warn('⚠️ Native payment intent unavailable, falling back to Stripe Checkout', {
            error: piError?.message || piData?.error,
            fallback: piData?.fallback,
          });
          toast.info('Native Zahlung ist gerade nicht verfügbar – Checkout wird geöffnet.');
          const paymentUrl = await createCheckoutPaymentUrl(taxReturnId, totalInCents);
          window.location.href = paymentUrl;
          return;
        }
        if (!piData?.client_secret || !piData?.publishable_key) {
          throw new Error('Stripe-Konfiguration unvollständig');
        }

        // Listener VOR dem Aufruf setzen (Despia feuert einmalig)
        window.stripeEvent = (event: StripePaymentSheetEvent) => {
          if (event.method !== 'paymentSheet') return;
          console.log('💳 stripeEvent:', event);
          if (event.status === 'completed') {
            setIsNativeCompletionPending(true);
            navigate(`/payment-success?session_id=native&tax_year=${year}&tax_return_id=${taxReturnId}${activeTaxFilerId ? `&tax_filer_id=${activeTaxFilerId}` : ''}`, { replace: true });
          } else if (event.status === 'canceled') {
            setIsNativeCompletionPending(false);
            toast.info('Zahlung abgebrochen');
            setIsLoading(false);
          } else {
            setIsNativeCompletionPending(false);
            toast.error(event.error || 'Zahlung fehlgeschlagen');
            setErrorMessage(event.error || 'Zahlung fehlgeschlagen');
            setIsLoading(false);
          }
        };

        triggerDespiaStripePaymentSheet({
          publishableKey: piData.publishable_key,
          clientSecret: piData.client_secret,
          customerId: piData.customer_id,
          ephemeralKeySecret: piData.ephemeral_key_secret,
          theme: 'light',
          accentColor: '1E3A5F',
          cornerRadius: 16,
          actionCornerRadius: 16,
        });
        return;
      }

      // === WEB: Stripe Checkout (unverändert) ===
      const paymentUrl = await createCheckoutPaymentUrl(taxReturnId, totalInCents);
      window.location.href = paymentUrl;
    } catch (error: any) {
      console.error('❌ Payment error:', error);
      setErrorMessage(error.message || 'Ein Fehler ist aufgetreten');
      toast.error(error.message || 'Zahlung fehlgeschlagen. Bitte versuche es erneut.');
    } finally {
      // Im Despia-Flow setzen Event-Handler isLoading selbst zurück
      if (!isDespiaNative()) setIsLoading(false);
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

  const cardClass =
    "rounded-2xl bg-card border border-border shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)]";

  if (isNativeCompletionPending) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center shadow-[0_10px_24px_-12px_rgba(15,27,61,0.18)]">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
          <div className="space-y-1.5">
            <p className="text-base font-semibold text-foreground">Zahlung wird abgeschlossen</p>
            <p className="text-sm text-muted-foreground">Einen Moment bitte…</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col text-foreground">
      <SubpageHeader title="Zahlung" onBack={() => navigate(-1)} />

      <main className="flex-grow pt-2 sm:pt-6 pb-20 px-5 sm:px-8">
        <div className="max-w-xl mx-auto space-y-5">

          {/* Hero card — matches main design (dashboard mode switcher) */}
          <div className={`relative overflow-hidden ${cardClass}`}>
            <div className="relative h-32 w-full overflow-hidden bg-muted">
              <img
                src={paymentHero}
                alt="Lächelnde Person mit Tablet"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-card/90 backdrop-blur-sm border border-border/60">
                <ShieldCheck className="w-3.5 h-3.5 text-primary" strokeWidth={1.75} />
                <span className="text-[11px] font-medium text-foreground">Sichere Zahlung</span>
              </div>
            </div>
            <div className="p-4">
              <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
                {isUpgrade ? 'Express-Service freischalten' : `Steuererklärung ${year} abschließen`}
              </h2>
              <p className="text-[12.5px] text-muted-foreground mt-1 leading-relaxed">
                Wähle deine Zahlungsmethode – verschlüsselt und sicher über Stripe.
              </p>
            </div>
          </div>

          {/* Aktionswoche Banner */}
          {isPromoWeekActive() && (
            <div className="rounded-2xl p-4 bg-gradient-to-r from-[#2563FF]/10 to-[#7C3AED]/10 border border-primary/20 backdrop-blur-xl">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-full bg-primary/15 shrink-0">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold text-slate-900">Aktionswoche bis 17.05.2026</p>
                  <p className="text-[12px] text-slate-600 mt-0.5 leading-snug">
                    Pauschalpreis CHF 99 für deine Steuererklärung · Express-Service nur CHF 29.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Express Service Card */}
          {!isUpgrade && (
            <button
              type="button"
              onClick={() => setExpressService(!expressService)}
              className={`relative w-full overflow-hidden p-4 text-left transition-all active:scale-[0.995] ${cardClass}`}
            >
              <div className="relative flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-primary/[0.07] border border-primary/15 flex items-center justify-center shrink-0">
                  <Zap className="w-5 h-5 text-primary" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[14.5px] leading-tight font-semibold text-foreground tracking-tight">
                    Express-Service
                  </h3>
                  <p className="text-[12px] text-muted-foreground mt-0.5 leading-snug">
                    Innert 10 Tagen · +CHF {isPromoWeekActive() ? '29.00' : '100.00'}
                  </p>
                </div>
                <div
                  className={`w-11 h-[26px] rounded-full transition-colors relative shadow-inner shrink-0 ${
                    expressService ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <div
                    className={`absolute top-[3px] w-5 h-5 rounded-full bg-white shadow-[0_2px_6px_rgba(15,23,42,0.18)] transition-all ${
                      expressService ? 'left-[calc(100%-1.4rem)]' : 'left-[3px]'
                    }`}
                  />
                </div>
              </div>
            </button>
          )}

          {/* Promo Code Display (referral) */}
          {activePromo && (
            <div className="bg-emerald-50/80 backdrop-blur border border-emerald-100 rounded-2xl p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 bg-emerald-100 rounded-full">
                    <Gift className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-emerald-700 text-[13px]">Rabattcode aktiv</p>
                    <p className="text-[11px] text-emerald-600">
                      Code <span className="font-mono">{activePromo.code}</span>
                    </p>
                  </div>
                </div>
                <span className="text-[15px] font-semibold text-emerald-600 tabular-nums">
                  -{formatPrice(promoDiscount)}
                </span>
              </div>
            </div>
          )}

          {/* Manual Promo Code Input */}
          {!activePromo && (
            <div className={`p-4 sm:p-5 ${cardClass}`}>
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-3.5 h-3.5 text-slate-500" strokeWidth={2} />
                <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em]">
                  Rabattcode
                </h4>
              </div>
              {manualPromoResult ? (
                <div className="flex items-center justify-between bg-emerald-50/80 border border-emerald-100 rounded-xl p-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="p-1.5 bg-emerald-100 rounded-full shrink-0">
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-emerald-700 text-[13px] truncate">
                        Code <span className="font-mono">{manualPromoCode.toUpperCase()}</span> aktiv
                      </p>
                      <p className="text-[11px] text-emerald-600">
                        {manualPromoResult.percentOff
                          ? `${manualPromoResult.percentOff}% Rabatt`
                          : manualPromoResult.amountOff
                            ? `-CHF ${(manualPromoResult.amountOff / 100).toFixed(2)} Rabatt`
                            : 'Rabatt aktiv'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={clearManualPromo}
                    className="p-1.5 rounded-full hover:bg-emerald-100/60 transition-colors shrink-0"
                    aria-label="Rabattcode entfernen"
                  >
                    <X className="w-3.5 h-3.5 text-emerald-700" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={manualPromoCode}
                      onChange={(e) => {
                        setManualPromoCode(e.target.value);
                        setManualPromoError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleValidatePromoCode();
                        }
                      }}
                      placeholder="Code eingeben"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      disabled={manualPromoValidating}
                      className="flex-1 h-11 px-3 rounded-xl border border-slate-200 bg-white text-[14px] font-mono uppercase tracking-wider text-slate-900 placeholder:text-slate-400 placeholder:font-sans placeholder:normal-case placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 transition-all"
                    />
                    <Button
                      type="button"
                      onClick={handleValidatePromoCode}
                      disabled={!manualPromoCode.trim() || manualPromoValidating}
                      className="h-11 px-4 rounded-xl"
                    >
                      {manualPromoValidating ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Anwenden'
                      )}
                    </Button>
                  </div>
                  {manualPromoError && (
                    <p className="text-[12px] text-red-600 mt-2">{manualPromoError}</p>
                  )}
                </>
              )}
            </div>
          )}



          {/* Cost Breakdown Card */}
          <div className={`p-4 sm:p-5 ${cardClass}`}>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em] mb-3">
              Kostenaufstellung
            </h4>
            <div className="divide-y divide-slate-100/80">
              {priceBreakdown.items.map((item, idx) => {
                const Icon = getItemIcon(item.label);
                return (
                  <div key={idx} className="flex items-center justify-between py-2.5 gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-xl bg-primary/[0.08] flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-primary" strokeWidth={2} />
                      </div>
                      <span className="text-slate-900 font-medium text-[13px] truncate">
                        {item.label}
                      </span>
                    </div>
                    <span className="text-slate-900 font-medium tabular-nums text-[13px] whitespace-nowrap shrink-0">
                      CHF {formatPrice(item.amount)}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-slate-200 my-3" />

            {hasAnyPromo && (
              <div className="flex justify-between items-center mb-1.5">
                <span className="text-[11px] text-slate-400">Zwischensumme</span>
                <span className="text-[11px] text-slate-400 line-through tabular-nums">
                  CHF {formatPrice(finalPrice)}
                </span>
              </div>
            )}
            <div className="flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-slate-900 font-semibold text-[16px] tracking-tight leading-none">
                  {hasAnyPromo ? 'Nach Rabatt' : 'Total'}
                </span>
                <span className="text-[9px] text-slate-400 font-medium uppercase tracking-[0.14em] mt-1.5">
                  inkl. MwSt.
                </span>
              </div>
              <span className="text-slate-900 font-bold text-[26px] tracking-[-0.02em] tabular-nums leading-none">
                CHF {formatPrice(priceAfterDiscount)}
              </span>
            </div>
          </div>

          {/* Payment Methods Card */}
          <div className={`p-4 sm:p-5 ${cardClass}`}>
            <h4 className="text-[10px] font-semibold text-slate-400 uppercase tracking-[0.14em] mb-3">
              Zahlungsmethoden
            </h4>
            <div className="grid grid-cols-4 gap-2">
              {methods.map((m) => {
                const active = selectedMethod === m.id;
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setSelectedMethod(m.id)}
                    className={`relative h-12 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-[0.97] ${
                      m.id === 'klarna' ? 'bg-[#FFE0EC]' : 'bg-white'
                    } ${
                      active
                        ? 'shadow-[0_0_0_1.5px_#2563FF,0_6px_18px_-8px_rgba(37,99,255,0.45)]'
                        : 'shadow-[0_2px_6px_rgba(15,23,42,0.05),inset_0_0_0_1px_rgba(15,23,42,0.04)] hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]'
                    }`}
                  >
                    <div className="scale-[0.85]">{m.render}</div>
                    {active && (
                      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary flex items-center justify-center shadow-[0_4px_10px_rgba(37,99,255,0.5)] ring-2 ring-white">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Action */}
          <div className="pt-0.5">
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
            <div className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-[13px] text-slate-400 font-normal">
                Sichere Zahlung mit Stripe
              </span>
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