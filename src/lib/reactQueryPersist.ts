/**
 * React Query persistence — Phase 2 of Despia offline support.
 *
 * Stores query results in IndexedDB (via idb-keyval) so the app shows the
 * last-seen data instantly on cold start, even with no network. Designed to
 * be cautious by default:
 *
 *  - Only an explicit allowlist of query keys is persisted. Everything else
 *    stays memory-only.
 *  - Encryption-sensitive payloads (chat bodies, decrypted documents) are
 *    never persisted; we only cache list metadata / pointers.
 *  - On Supabase sign-out the persisted cache is wiped to prevent data
 *    leaking between user sessions on shared devices.
 *  - A `buster` derived from the build id invalidates the entire cache on
 *    each OTA update (Despia `deployed_at`), so schema drift can't surface
 *    stale shapes.
 */
import { QueryClient } from '@tanstack/react-query';
import { persistQueryClient } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { get, set, del, createStore } from 'idb-keyval';
import { supabase } from '@/integrations/supabase/client';

// Build identifier — re-bumped on every production build via vite `define`.
// Falls back to a date stamp in dev so HMR doesn't fight the persister.
declare const __DITAX_BUILD_ID__: string | undefined;
const BUILD_ID =
  typeof __DITAX_BUILD_ID__ === 'string' && __DITAX_BUILD_ID__.length > 0
    ? __DITAX_BUILD_ID__
    : `dev-${new Date().toISOString().slice(0, 10)}`;

const DB_NAME = 'ditax-cache';
const STORE_NAME = 'react-query';
const PERSIST_KEY = 'ditax-rq-cache-v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24h

/**
 * Allowlist of query-key first segments that may be persisted to disk.
 * Keep this list conservative — anything sensitive must stay memory-only.
 */
const PERSIST_ALLOWLIST = new Set<string>([
  'tax-filers',
  'tax_filers',
  'tax-returns',
  'tax-return-status',
  'tax-year-data',
  'documents',             // metadata listing only; encrypted bodies never cached
  'documents-meta',
  'prior-year-checklist',
  'missing-items',
  'pending-missing-items',
  'notifications',
  'profile',
  'invoices',
  'unread-messages',
]);

/**
 * Hard denylist — even if a key shares an allowlisted prefix, these strings
 * anywhere in the key block persistence (defense in depth against payloads
 * containing decrypted blobs).
 */
const PERSIST_DENY_TOKENS = ['encrypted', 'decrypted', 'binary', 'blob', 'chat-messages', 'master-key'];

function isAllowedKey(queryKey: readonly unknown[]): boolean {
  if (queryKey.length === 0) return false;
  const head = queryKey[0];
  if (typeof head !== 'string') return false;
  if (!PERSIST_ALLOWLIST.has(head)) return false;
  const flat = JSON.stringify(queryKey).toLowerCase();
  return !PERSIST_DENY_TOKENS.some((t) => flat.includes(t));
}

const idbStore = createStore(DB_NAME, STORE_NAME);

const asyncStorage = {
  getItem: async (key: string): Promise<string | null> => {
    const v = await get<string>(key, idbStore);
    return v ?? null;
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await set(key, value, idbStore);
  },
  removeItem: async (key: string): Promise<void> => {
    await del(key, idbStore);
  },
};

export const persister = createAsyncStoragePersister({
  storage: asyncStorage,
  key: PERSIST_KEY,
  throttleTime: 1000,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      // 5 minute staleTime so persisted data renders instantly without
      // immediately triggering a refetch storm on resume.
      staleTime: 5 * 60 * 1000,
      gcTime: MAX_AGE_MS,
    },
  },
});

let cleanupAuthListener: (() => void) | null = null;

/**
 * Wire the persister into the QueryClient. Idempotent.
 * Call once at app startup, before React tree renders.
 */
export function initQueryPersistence(): void {
  persistQueryClient({
    queryClient,
    persister,
    maxAge: MAX_AGE_MS,
    // Cache buster — bumping BUILD_ID nukes the persisted snapshot,
    // mirroring the Despia OTA `deployed_at` update semantics.
    buster: BUILD_ID,
    dehydrateOptions: {
      shouldDehydrateQuery: (query) =>
        query.state.status === 'success' && isAllowedKey(query.queryKey),
    },
  });

  // On sign-out / user switch, drop the persisted snapshot so a different
  // user on the same device can't see cached data via the IndexedDB store.
  if (cleanupAuthListener) cleanupAuthListener();
  const { data: sub } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      queryClient.clear();
      void asyncStorage.removeItem(PERSIST_KEY).catch(() => undefined);
    }
  });
  cleanupAuthListener = () => sub.subscription.unsubscribe();
}
