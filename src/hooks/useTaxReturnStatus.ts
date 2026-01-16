import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface TaxReturnStatus {
  isLocked: boolean;
  paymentStatus: string | null;
  status: string | null;
  loading: boolean;
}

export const useTaxReturnStatus = (taxYear: string): TaxReturnStatus => {
  const [status, setStatus] = useState<TaxReturnStatus>({
    isLocked: false,
    paymentStatus: null,
    status: null,
    loading: true
  });

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setStatus(prev => ({ ...prev, loading: false }));
          return;
        }

        const { data } = await supabase
          .from('tax_returns')
          .select('payment_status, status')
          .eq('user_id', user.id)
          .eq('tax_year', taxYear)
          .maybeSingle();

        const isLocked = data?.payment_status === 'paid' || 
                         data?.status === 'completed' ||
                         data?.status === 'success';

        setStatus({
          isLocked,
          paymentStatus: data?.payment_status || null,
          status: data?.status || null,
          loading: false
        });
      } catch (error) {
        console.error('Error checking tax return status:', error);
        setStatus(prev => ({ ...prev, loading: false }));
      }
    };

    checkStatus();
  }, [taxYear]);

  return status;
};
