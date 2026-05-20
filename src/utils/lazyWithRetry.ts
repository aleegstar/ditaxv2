import { lazy, ComponentType } from 'react';

/**
 * Wraps React.lazy with retry + one-time hard reload on chunk load failures.
 *
 * Fixes the "white screen on /admin until hard refresh" class of bug that happens
 * when a new deploy invalidates the previously cached JS chunks. The user's HTML
 * still references old chunk hashes, the dynamic import throws "Failed to fetch
 * dynamically imported module" / ChunkLoadError, and the lazy boundary renders
 * nothing.
 *
 * Strategy:
 *  1. Retry the import up to `retries` times with small backoff (handles transient
 *     network blips).
 *  2. If still failing, do exactly one hard reload (guarded via sessionStorage so
 *     we never loop) so the browser pulls the fresh index.html with new hashes.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  opts: { retries?: number; key?: string } = {}
) {
  const { retries = 2, key = factory.toString().slice(0, 64) } = opts;

  return lazy(async () => {
    let lastErr: unknown;
    for (let i = 0; i <= retries; i++) {
      try {
        return await factory();
      } catch (err) {
        lastErr = err;
        const msg = String((err as any)?.message || err);
        const isChunkErr =
          msg.includes('Failed to fetch dynamically imported module') ||
          msg.includes('Importing a module script failed') ||
          msg.includes('ChunkLoadError') ||
          msg.includes('error loading dynamically imported module');
        if (!isChunkErr) throw err;
        if (i < retries) {
          await new Promise((r) => setTimeout(r, 300 * (i + 1)));
        }
      }
    }

    // One-time hard reload to pick up the new deploy.
    try {
      const flag = `lazy-reload:${key}`;
      const alreadyReloaded = sessionStorage.getItem(flag);
      if (!alreadyReloaded) {
        sessionStorage.setItem(flag, String(Date.now()));
        window.location.reload();
        // Return a never-resolving promise so React keeps the fallback until reload kicks in.
        return new Promise<{ default: T }>(() => {});
      }
    } catch {
      // sessionStorage may be unavailable (private mode / SSR). Fall through.
    }

    throw lastErr;
  });
}
