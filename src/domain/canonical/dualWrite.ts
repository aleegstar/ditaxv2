/**
 * Dual-write integration point.
 *
 * Called from form save paths (e.g. FormContext.saveSection) to mirror
 * legacy form_data into the canonical model. Failures are logged but
 * never thrown — the legacy write must remain authoritative this phase.
 */
import { assembleDossier } from './mappers/fromFormData';
import { canonicalRepository } from './repository';
import type { Canton } from './types';

interface SyncArgs {
  user_id: string;
  tax_filer_id: string;
  tax_year: string;
  canton?: Canton;
  formData: Record<string, unknown> | null | undefined;
}

/** Best-effort. Never throws. */
export async function syncDossierFromFormData(args: SyncArgs): Promise<void> {
  try {
    if (!args.user_id || !args.tax_filer_id || !args.tax_year) return;
    const dossier = assembleDossier(args);
    await canonicalRepository.upsertDossier(dossier);
  } catch (err) {
    console.warn('[canonical] dual-write failed (non-fatal):', err);
  }
}
