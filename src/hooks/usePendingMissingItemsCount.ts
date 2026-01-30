import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const usePendingMissingItemsCount = (userId?: string, taxFilerId?: string | null) => {
  const [pendingCount, setPendingCount] = useState(0);
  const [pendingDocuments, setPendingDocuments] = useState(0);
  const [pendingInformation, setPendingInformation] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchPendingCount = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let query = supabase
        .from('missing_item_requests')
        .select('id, request_type')
        .eq('user_id', userId)
        .in('status', ['pending', 'rejected']);

      if (taxFilerId) {
        query = query.eq('tax_filer_id', taxFilerId);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.length || 0;
      const docs = data?.filter(r => r.request_type === 'document').length || 0;
      const info = data?.filter(r => r.request_type === 'information').length || 0;

      setPendingCount(total);
      setPendingDocuments(docs);
      setPendingInformation(info);
    } catch (err) {
      console.error('Error fetching pending missing items count:', err);
    } finally {
      setLoading(false);
    }
  }, [userId, taxFilerId]);

  useEffect(() => {
    fetchPendingCount();
  }, [fetchPendingCount]);

  // Set up real-time subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`missing_items_count_${userId}_${taxFilerId || 'all'}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'missing_item_requests',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, taxFilerId, fetchPendingCount]);

  return {
    pendingCount,
    pendingDocuments,
    pendingInformation,
    loading,
    refetch: fetchPendingCount,
  };
};
