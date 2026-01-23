import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PromoCode {
  code: string;
  promoId: string;
  type: 'earned' | 'received';
  used: boolean;
  amount: number;
  currency: string;
}

export const usePromoCodes = () => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPromoCodes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase.functions.invoke('get-referral-promo-codes', {
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

      setPromoCodes(data.promoCodes || []);
    } catch (err) {
      console.error('Error fetching promo codes:', err);
      setError(err instanceof Error ? err.message : 'Fehler beim Laden der Rabattcodes');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getActivePromoCode = useCallback(() => {
    return promoCodes.find(pc => !pc.used);
  }, [promoCodes]);

  const getTotalSavings = useCallback(() => {
    return promoCodes.reduce((total, pc) => {
      if (!pc.used) {
        return total + pc.amount;
      }
      return total;
    }, 0);
  }, [promoCodes]);

  useEffect(() => {
    fetchPromoCodes();
  }, [fetchPromoCodes]);

  return {
    promoCodes,
    isLoading,
    error,
    fetchPromoCodes,
    getActivePromoCode,
    getTotalSavings,
  };
};
