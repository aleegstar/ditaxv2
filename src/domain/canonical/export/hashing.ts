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

/**
 * Deterministic hash of a canonical dossier's logical content.
 * Excludes id/revision/updated_at so identical content yields identical hash.
 */
export async function hashCanonicalDossier(d: import('../types').Dossier): Promise<string> {
  const subset = {
    user_id: d.user_id,
    tax_filer_id: d.tax_filer_id,
    tax_year: d.tax_year,
    canton: d.canton,
    schema_version: d.schema_version,
    currency: d.currency,
    persons: d.persons,
    household: d.household,
    employment_incomes: d.employment_incomes,
    self_employment_incomes: d.self_employment_incomes,
    pension_incomes: d.pension_incomes,
    assets: d.assets,
    debts: d.debts,
    real_estate: d.real_estate,
    deductions: d.deductions,
    attachments: d.attachments,
  };
  return hashPayload(subset);
}

export const hashExportPayload = (payload: unknown): Promise<string> => hashPayload(payload);
