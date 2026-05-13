/**
 * Dual-write integration point.
 *
 * Called from form save paths (e.g. FormContext.saveSection) to mirror
 * legacy form_data into the canonical model. Failures are logged but
 * never thrown — the legacy write must remain authoritative this phase.
 */
import { assembleDossier } from './mappers/fromFormData';
import { canonicalRepository } from './repository';
import { canonicalLogger } from './logger';
import type { Canton } from './types';

interface SyncArgs {
  user_id: string;
  tax_filer_id: string;
  tax_year: string;
  canton?: Canton;
  formData: Record<string, unknown> | null | undefined;
}

export interface SyncStatus {
  ok: boolean;
  dossier_id?: string;
  revision?: number;
  duration_ms: number;
  entity_counts?: Record<string, number>;
  error?: string;
}

/** Best-effort. Never throws. */
export async function syncDossierFromFormData(args: SyncArgs): Promise<SyncStatus> {
  const t0 = performance.now();
  try {
    if (!args.user_id || !args.tax_filer_id || !args.tax_year) {
      return { ok: false, duration_ms: 0, error: 'missing identifiers' };
    }
    const dossier = assembleDossier(args);
    const counts = {
      persons: dossier.persons.length,
      employment_incomes: dossier.employment_incomes.length,
      self_employment_incomes: dossier.self_employment_incomes.length,
      pension_incomes: dossier.pension_incomes.length,
      real_estate: dossier.real_estate.length,
      attachments: dossier.attachments.length,
    };
    const { dossier_id, revision } = await canonicalRepository.upsertDossier(dossier);
    const duration_ms = Math.round(performance.now() - t0);
    canonicalLogger.info({
      event: 'dual_write.success',
      dossier_id, revision, duration_ms,
      tax_filer_id: args.tax_filer_id, tax_year: args.tax_year,
      entity_counts: counts,
    });
    return { ok: true, dossier_id, revision, duration_ms, entity_counts: counts };
  } catch (err) {
    const duration_ms = Math.round(performance.now() - t0);
    const message = err instanceof Error ? err.message : String(err);
    canonicalLogger.warn({
      event: 'dual_write.failed',
      tax_filer_id: args.tax_filer_id, tax_year: args.tax_year,
      duration_ms, error: message,
    });
    return { ok: false, duration_ms, error: message };
  }
}
