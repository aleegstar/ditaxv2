/**
 * Lightweight per-key snapshot store for read-only data that we want to
 * keep around for offline rendering. Uses the same IndexedDB backend as
 * the React Query persister, but in a separate object store so the keys
 * never collide.
 *
 * Rules:
 *  - Never store decrypted document bodies or chat message contents.
 *  - Metadata listings only.
 *  - Scoped per user (caller passes a stable user-id-derived key).
 */
import { get, set, del, createStore } from 'idb-keyval';

const store = createStore('ditax-cache', 'offline-snapshots');

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg =
    err instanceof Error
      ? err.message
      : typeof err === 'string'
        ? err
        : (err as { message?: string } | null)?.message ?? '';
  return /failed to fetch|networkerror|load failed|network request failed|fetch failed|timeout/i.test(
    msg ?? '',
  );
}

export async function readSnapshot<T>(key: string): Promise<T | null> {
  try {
    const v = await get<T>(key, store);
    return v ?? null;
  } catch {
    return null;
  }
}

export async function writeSnapshot<T>(key: string, value: T): Promise<void> {
  try {
    await set(key, value, store);
  } catch {
    /* swallow — snapshot is best-effort */
  }
}

export async function clearSnapshot(key: string): Promise<void> {
  try {
    await del(key, store);
  } catch {
    /* noop */
  }
}
