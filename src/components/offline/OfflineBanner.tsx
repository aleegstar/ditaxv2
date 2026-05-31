import { useEffect, useRef } from 'react';
import { CloudOff } from 'lucide-react';
import { toast } from 'sonner';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

/**
 * Global offline indicator. Mounted once at the top of the app shell.
 *  - Shows a slim, non-blocking banner while offline.
 *  - Fires a single sonner toast on reconnect (no toast on initial mount).
 *  - Respects safe-area-inset-top so it sits below the iOS status bar in Despia.
 */
export const OfflineBanner = () => {
  const online = useOnlineStatus();
  const wasOffline = useRef(false);

  useEffect(() => {
    if (!online) {
      wasOffline.current = true;
      return;
    }
    if (wasOffline.current) {
      wasOffline.current = false;
      toast.success('Wieder online', {
        description: 'Deine Verbindung ist zurück.',
      });
    }
  }, [online]);

  if (online) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="sticky top-0 z-40 w-full bg-muted text-foreground border-b border-border"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
    >
      <div className="flex items-center justify-center gap-2 px-4 py-2 text-sm">
        <CloudOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <span>
          Du bist offline – Änderungen werden gespeichert und später
          synchronisiert.
        </span>
      </div>
    </div>
  );
};

export default OfflineBanner;
