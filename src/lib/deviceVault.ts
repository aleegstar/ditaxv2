/**
 * Despia Storage Vault — pseudonymous device id.
 *
 * Persists across app reinstall and account deletion via:
 *   - iOS: iCloud Key-Value Store
 *   - Android: Google Backup Key/Value API
 *
 * Used as a second axis (besides user_id) for AI rate-limiting on the server,
 * so that abusers can't reset Gemini quotas by deleting their account and
 * re-registering.
 *
 * Web users have no vault → returns null and the server falls back to
 * user_id-only rate limiting.
 */
import despia from 'despia-native';
import { isDespiaNative } from './despia';

const VAULT_KEY = 'ditax_did';
const ANON_UID_KEY = 'ditax_anon_uid';
const CACHE_KEY = 'ditax_did_cache';

let inflight: Promise<string | null> | null = null;
let cached: string | null | undefined = undefined;

function isUuid(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
}

async function readVault(): Promise<string | null> {
  try {
    const data: any = await despia(`readvault://?key=${VAULT_KEY}`, [VAULT_KEY]);
    const value = data?.[VAULT_KEY];
    return isUuid(value) ? value : null;
  } catch (e) {
    console.warn('[deviceVault] read failed', e);
    return null;
  }
}

async function writeVault(value: string): Promise<void> {
  try {
    await despia(`setvault://?key=${VAULT_KEY}&value=${encodeURIComponent(value)}&locked=false`);
  } catch (e) {
    console.warn('[deviceVault] write failed', e);
  }
}

/**
 * Get the persistent device id from the Despia vault.
 * Returns null on web or if the vault is unavailable.
 * Caches the value in-memory and in sessionStorage.
 */
export async function getOrCreateDeviceId(): Promise<string | null> {
  if (cached !== undefined) return cached;

  if (!isDespiaNative()) {
    cached = null;
    return null;
  }

  // session cache survives navigation but not app restart
  try {
    const sess = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(CACHE_KEY) : null;
    if (isUuid(sess)) {
      cached = sess;
      return sess;
    }
  } catch { /* ignore */ }

  if (inflight) return inflight;

  inflight = (async () => {
    let id = await readVault();
    if (!id) {
      id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
        ? crypto.randomUUID()
        : `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`;
      await writeVault(id);
    }
    cached = id;
    try { sessionStorage.setItem(CACHE_KEY, id); } catch { /* ignore */ }
    return id;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

/**
 * Build a headers object suitable to merge into fetch/supabase invoke calls.
 * Returns {} on web (no header sent).
 */
export async function buildDeviceHeaders(): Promise<Record<string, string>> {
  const id = await getOrCreateDeviceId().catch(() => null);
  return id ? { 'x-device-id': id } : {};
}

/**
 * Read/write the Supabase user.id of an anonymous session.
 * Used to detect that we already created an anonymous account on this device,
 * so a fresh app start with an expired session does not silently create a 2nd one.
 */
export async function readAnonUid(): Promise<string | null> {
  if (!isDespiaNative()) return null;
  try {
    const data: any = await despia(`readvault://?key=${ANON_UID_KEY}`, [ANON_UID_KEY]);
    const value = data?.[ANON_UID_KEY];
    return isUuid(value) ? value : null;
  } catch (e) {
    console.warn('[deviceVault] anon read failed', e);
    return null;
  }
}

export async function writeAnonUid(value: string): Promise<void> {
  if (!isDespiaNative()) return;
  try {
    await despia(`setvault://?key=${ANON_UID_KEY}&value=${encodeURIComponent(value)}&locked=false`);
  } catch (e) {
    console.warn('[deviceVault] anon write failed', e);
  }
}

export async function clearAnonUid(): Promise<void> {
  if (!isDespiaNative()) return;
  try {
    await despia(`setvault://?key=${ANON_UID_KEY}&value=&locked=false`);
  } catch (e) {
    console.warn('[deviceVault] anon clear failed', e);
  }
}
