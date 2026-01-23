import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReferralCode {
  code: string;
  successful_referrals: number;
  max_referrals: number;
  is_active: boolean;
}

interface ReferralRedemption {
  id: string;
  referred_at: string;
  referrer_promo_used: boolean;
  referred_promo_used: boolean;
}

export const useReferralCode = () => {
  const [referralCode, setReferralCode] = useState<ReferralCode | null>(null);
  const [redemptions, setRedemptions] = useState<ReferralRedemption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReferralCode = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase.functions.invoke('generate-referral-code', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (fetchError) {
        throw fetchError;
      }

      if (data.error) {
        throw new Error(data.error);
      }

      setReferralCode(data);
    } catch (err) {
      console.error('Error fetching referral code:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden des Empfehlungscodes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchRedemptions = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch redemptions where user is the referrer using type assertion
      const { data, error } = await supabase
        .from('referral_redemptions' as any)
        .select('id, referred_at, referrer_promo_used, referred_promo_used')
        .eq('referrer_user_id', user.id);

      if (error) {
        console.error('Error fetching redemptions:', error);
        return;
      }

      setRedemptions((data || []) as unknown as ReferralRedemption[]);
    } catch (err) {
      console.error('Error fetching redemptions:', err);
    }
  }, []);

  const applyReferralCode = useCallback(async (code: string): Promise<{ success: boolean; promoCode?: string; message?: string }> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return { success: false, message: 'Bitte melde dich an' };
      }

      const { data, error: invokeError } = await supabase.functions.invoke('apply-referral-code', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
        body: { referralCode: code },
      });

      if (invokeError) {
        throw invokeError;
      }

      if (data.error) {
        return { success: false, message: data.error };
      }

      return { 
        success: true, 
        promoCode: data.promoCode,
        message: data.message 
      };
    } catch (err) {
      console.error('Error applying referral code:', err);
      return { 
        success: false, 
        message: err instanceof Error ? err.message : 'Fehler beim Einlösen des Codes' 
      };
    }
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!referralCode?.code) return false;

    try {
      await navigator.clipboard.writeText(referralCode.code);
      toast.success('Code kopiert!');
      return true;
    } catch (err) {
      console.error('Error copying to clipboard:', err);
      toast.error('Kopieren fehlgeschlagen');
      return false;
    }
  }, [referralCode?.code]);

  const getShareUrl = useCallback(() => {
    if (!referralCode?.code) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/auth?ref=${referralCode.code}`;
  }, [referralCode?.code]);

  const shareViaWhatsApp = useCallback(() => {
    const url = getShareUrl();
    const text = `Erstelle deine Steuererklärung mit DiTax und spare CHF 20.-! Nutze meinen Code: ${referralCode?.code}\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }, [referralCode?.code, getShareUrl]);

  const shareViaEmail = useCallback(() => {
    const url = getShareUrl();
    const subject = 'CHF 20.- Rabatt für deine Steuererklärung';
    const body = `Hallo!\n\nIch nutze DiTax für meine Steuererklärung und möchte dir einen CHF 20.- Rabatt teilen.\n\nNutze meinen Code: ${referralCode?.code}\n\nHier gehts zur Registrierung: ${url}\n\nViele Grüße`;
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`, '_blank');
  }, [referralCode?.code, getShareUrl]);

  useEffect(() => {
    fetchReferralCode();
    fetchRedemptions();
  }, [fetchReferralCode, fetchRedemptions]);

  return {
    referralCode,
    redemptions,
    isLoading,
    error,
    fetchReferralCode,
    applyReferralCode,
    copyToClipboard,
    getShareUrl,
    shareViaWhatsApp,
    shareViaEmail,
  };
};
