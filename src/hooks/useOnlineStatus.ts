import { useEffect, useState } from 'react';

/**
 * Tracks the browser online status with a short debounce so flickering
 * connections don't spam UI re-renders. Returns `true` while online.
 *
 * Notes:
 *  - `navigator.onLine` is a hint, not a guarantee. We trust it for UI
 *    indication only; actual fetches still drive the source of truth.
 *  - We treat the absence of `navigator` (SSR safety) as online.
 */
export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let debounce: ReturnType<typeof setTimeout> | null = null;
    const apply = (next: boolean) => {
      if (debounce) clearTimeout(debounce);
      // Slight delay smooths the iOS Despia WebView's noisy online events.
      debounce = setTimeout(() => setOnline(next), 250);
    };

    const handleOnline = () => apply(true);
    const handleOffline = () => apply(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (debounce) clearTimeout(debounce);
    };
  }, []);

  return online;
}
