import { useEffect, useState } from 'react';
import { OfflineQueueService } from '@/services/OfflineQueueService';
import type { QueueSnapshot } from '@/services/queue/types';

const EMPTY: QueueSnapshot = {
  jobs: [],
  pendingCount: 0,
  failedCount: 0,
  draining: false,
};

/**
 * Subscribe to the offline queue. Returns a live snapshot suitable for
 * rendering UI badges, lists, and retry controls.
 */
export function useOfflineQueue(): QueueSnapshot {
  const [snap, setSnap] = useState<QueueSnapshot>(EMPTY);
  useEffect(() => OfflineQueueService.subscribe(setSnap), []);
  return snap;
}
