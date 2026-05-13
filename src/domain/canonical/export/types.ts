/**
 * Export pipeline contracts. No XML/serialization implemented in this phase.
 *
 * Determinism rules for adapter authors:
 *  - No Date.now(), no Math.random(). Use ctx.generatedAt.
 *  - Use stableStringify for any JSON serialization.
 *  - For XML: fixed attribute order, fixed element order, no whitespace drift.
 *  - Re-running with the same snapshot + rulesVersion + generatedAt MUST
 *    produce a byte-identical output (and identical output_hash).
 */
import type { Canton, Dossier } from '../types';
import type { ValidationFinding, ValidationResult } from '../validation/types';

export type ExportFormat = 'ech-0119' | 'ag-etax' | 'json' | (string & {});

export interface ExportContext {
  dossier: Dossier;
  dossierRevision: number;
  canton: Canton;
  taxYear: string;
  format: ExportFormat;
  rulesVersion: string;
  /** Deterministic timestamp injected by the caller. */
  generatedAt: string;
  locale?: 'de-CH' | 'fr-CH' | 'it-CH';
  /** When true, allow serialization despite warnings. Errors still block. */
  allowWarnings?: boolean;
}

export interface PreparedExport<TPayload = unknown> {
  payload: TPayload;
  validation: ValidationResult[];
  warnings: ValidationFinding[];
  inputs_hash: string;
}

export interface CantonalAdapter<TPayload = unknown> {
  id: string;
  format: ExportFormat;
  supports(ctx: ExportContext): boolean;
  prepare(ctx: ExportContext): Promise<PreparedExport<TPayload>>;
  serialize(prepared: PreparedExport<TPayload>, ctx: ExportContext): Promise<Uint8Array>;
}

export interface ExportRunResult {
  status: 'prepared' | 'exported' | 'failed';
  adapter_id: string;
  format: ExportFormat;
  inputs_hash: string;
  output_hash?: string;
  output_bytes?: Uint8Array;
  validation: ValidationResult[];
  error?: string;
}

export interface ExportPipeline {
  register(adapter: CantonalAdapter): void;
  run(ctx: ExportContext): Promise<ExportRunResult>;
}
