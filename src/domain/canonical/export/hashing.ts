/**
 * Canonical hashing helpers for deterministic export reproducibility.
 *
 * - stableStringify: stable key-sorted JSON serialization (no library deps).
 * - sha256Hex: browser-side SHA-256 via Web Crypto.
 *
 * Adapters MUST hash both inputs (snapshot-derived payload) and outputs
 * (serialized bytes) using these helpers so re-running an export against
 * the same snapshot yields identical hashes.
 */

export function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  const walk = (v: unknown): unknown => {
    if (v === null || typeof v !== 'object') return v;
    if (seen.has(v as object)) throw new Error('Circular reference in canonical payload');
    seen.add(v as object);
    if (Array.isArray(v)) return v.map(walk);
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      out[k] = walk((v as Record<string, unknown>)[k]);
    }
    return out;
  };
  return JSON.stringify(walk(value));
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const data = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest('SHA-256', data as BufferSource);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export const hashPayload = async (payload: unknown): Promise<string> =>
  sha256Hex(stableStringify(payload));
