/**
 * Field-level provenance.
 *
 * Wraps any extracted/imported canonical value with metadata about
 * its origin (manual, AI, imported, migrated), confidence, and review state.
 *
 * Used by:
 *  - mappers (default `manual()` for FormData-sourced values)
 *  - AI extraction pipelines (set source_type='ai' + confidence_score)
 *  - import adapters (e.g. eCH, prior-year)
 *  - future review UI (sets reviewed_by/reviewed_at)
 */

export type SourceType = 'manual' | 'ai' | 'imported' | 'migrated';

export interface Provenance {
  source_type: SourceType;
  source_document_id?: string;
  extraction_model?: string;
  /** 0..1 */
  confidence_score?: number;
  extracted_at?: string;
  reviewed_by?: string;
  reviewed_at?: string;
}

export interface Tracked<T> {
  value: T;
  provenance: Provenance;
}

export const track = <T>(value: T, p: Provenance): Tracked<T> => ({ value, provenance: p });

export const manual = <T>(value: T): Tracked<T> => track(value, { source_type: 'manual' });

export const ai = <T>(
  value: T,
  opts: { model: string; confidence?: number; sourceDocumentId?: string },
): Tracked<T> =>
  track(value, {
    source_type: 'ai',
    extraction_model: opts.model,
    confidence_score: opts.confidence,
    source_document_id: opts.sourceDocumentId,
    extracted_at: new Date().toISOString(),
  });

export const imported = <T>(value: T, sourceDocumentId?: string): Tracked<T> =>
  track(value, { source_type: 'imported', source_document_id: sourceDocumentId });

export const migrated = <T>(value: T): Tracked<T> => track(value, { source_type: 'migrated' });

/** Strip Tracked<> wrapper — used by mappers building DB rows. */
export const valueOf = <T>(t: Tracked<T> | undefined | null): T | undefined =>
  t == null ? undefined : t.value;

/** Provenance row shape persisted into canonical_field_provenance. */
export interface ProvenanceRow extends Provenance {
  dossier_id: string;
  entity_table: string;
  entity_id: string;
  field_path: string;
}
