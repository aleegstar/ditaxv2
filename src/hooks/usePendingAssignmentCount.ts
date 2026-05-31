import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { OfflineQueueService } from '@/services/OfflineQueueService';

/**
 * Live count of `uploaded_documents` rows with `pending_assignment=true`
 * for the current user. Refreshes on auth change, when the offline queue
 * snapshot changes (drain finished → new pending rows arrived), and when
 * the browser comes back online.
 */
export function usePendingAssignmentCount(): { count: number; refetch: () => void } {
  const { userId } = useAuth();
  const [count, setCount] = useState(0);

  const refetch = useCallback(async () => {
    if (!userId) {
      setCount(0);
      return;
    }
    try {
      const { count: c } = await supabase
        .from('uploaded_documents')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('pending_assignment', true);
      setCount(c ?? 0);
    } catch {
      // silent — banner is a hint, not critical
    }
  }, [userId]);

  useEffect(() => {
    void refetch();
    if (typeof window === 'undefined') return;
    const onOnline = () => void refetch();
    const onVisible = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    const unsub = OfflineQueueService.subscribe(() => void refetch());
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
      unsub();
    };
  }, [refetch]);

  return { count, refetch };
}
