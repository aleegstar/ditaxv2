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

      <div className="flex-1 py-8 px-4 sm:px-6">
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

              {/* Promo Code Display (referral) */}
              {activePromo && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
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
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Aktionscode eingeben"
                        value={manualPromoCode}
                        onChange={(e) => { setManualPromoCode(e.target.value); setManualPromoError(null); }}
                        onKeyDown={(e) => e.key === 'Enter' && handleValidatePromoCode()}
                        className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#1D64FF]/20 focus:border-[#1D64FF] font-jakarta"
                      />
                    </div>
                    <button
                      onClick={handleValidatePromoCode}
                      disabled={!manualPromoCode.trim() || manualPromoValidating}
                      className="px-4 py-2.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors disabled:opacity-50 font-jakarta"
                    >
                      {manualPromoValidating ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Anwenden'}
                    </button>
                  </div>
                  {manualPromoError && (
                    <p className="text-xs text-red-500 font-jakarta">{manualPromoError}</p>
                  )}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4">
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
              <div className="rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-jakarta">Kostenaufstellung</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {priceBreakdown.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center px-4 py-2.5">
                      <span className="text-sm text-slate-600 font-jakarta">{item.label}</span>
                      <span className="text-sm font-medium text-slate-800 font-jakarta tabular-nums">
                        CHF {formatPrice(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
                {/* Total */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                  {hasAnyPromo && (
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-500 font-jakarta">Zwischensumme</span>
                      <span className="text-xs text-slate-400 line-through font-jakarta tabular-nums">CHF {formatPrice(finalPrice)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-slate-800 font-jakarta">
                      {hasAnyPromo ? 'Nach Rabatt' : 'Total'}
                    </span>
                    <span className="text-lg font-bold text-slate-900 font-jakarta tabular-nums">
                      CHF {formatPrice(priceAfterDiscount)}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-jakarta">inkl. MwSt.</span>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider font-jakarta">Zahlungsmethoden</span>
                <div className="flex items-center gap-3">
                  {/* TWINT */}
                  <div className="flex items-center justify-center h-10 px-3 bg-white rounded-lg border border-slate-200">
                    <span className="text-sm font-bold text-black font-jakarta tracking-tight">TWINT</span>
                  </div>
                  {/* Visa */}
                  <div className="flex items-center justify-center h-10 px-3 bg-white rounded-lg border border-slate-200">
                    <img src={paymentVisa} alt="Visa" className="h-4 object-contain" />
                  </div>
                  {/* Mastercard */}
                  <div className="flex items-center justify-center h-10 px-3 bg-white rounded-lg border border-slate-200">
                    <img src={paymentMastercard} alt="Mastercard" className="h-6 object-contain" />
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