/**
 * Hashing helpers for AG exports.
 *
 * Re-exports stable serialization from the parent module and adds typed
 * helpers for canonical dossier + AG payload hashing so callers can pin
 * reproducibility expectations.
 */
import type { Dossier } from '../types';
import { hashPayload, sha256Hex, stableStringify } from './hashing.base';

export { sha256Hex, stableStringify, hashPayload };

/**
 * Hash a canonical dossier deterministically. Excludes runtime-only fields
 * (id may differ on re-upsert; revision changes; updated_at drifts).
 *
 * The intent is "given the same logical content, produce the same hash".
 */
export function hashCanonicalDossier(d: Dossier): Promise<string> {
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

export function hashExportPayload(payload: unknown): Promise<string> {
  return hashPayload(payload);
}
