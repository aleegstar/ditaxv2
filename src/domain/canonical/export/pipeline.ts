/**
 * Skeleton ExportPipeline. Resolves an adapter, runs validators, hashes the
 * prepared payload, and produces a deterministic byte output via the adapter's
 * serializer. Persistence into `canonical_exports` is the caller's responsibility
 * (snapshot creation + row insert) — the pipeline is pure.
 *
 * Real adapters (eCH-0119, AG eTax) are NOT shipped in this phase.
 */
import { validatorRegistry } from '../validation/registry';
import type { ValidationFinding, ValidationResult } from '../validation/types';
import { hashPayload, sha256Hex } from './hashing';
import type { CantonalAdapter, ExportContext, ExportPipeline, ExportRunResult } from './types';

export function createExportPipeline(): ExportPipeline {
  const adapters = new Map<string, CantonalAdapter>();

  return {
    register(adapter) { adapters.set(adapter.id, adapter); },

    async run(ctx: ExportContext): Promise<ExportRunResult> {
      const adapter = Array.from(adapters.values()).find((a) => a.supports(ctx));
      if (!adapter) {
        return {
          status: 'failed',
          adapter_id: 'none',
          format: ctx.format,
          inputs_hash: '',
          validation: [],
          error: `No adapter registered for format=${ctx.format} canton=${ctx.canton}`,
        };
      }

      // 1. Validate
      const validators = validatorRegistry.resolve(ctx.dossier);
      const validation: ValidationResult[] = [];
      for (const v of validators) validation.push(await v.validate(ctx.dossier));
      const errors: ValidationFinding[] = validation.flatMap((r) => r.findings.filter((f) => f.severity === 'error'));
      if (errors.length) {
        return {
          status: 'failed',
          adapter_id: adapter.id,
          format: ctx.format,
          inputs_hash: '',
          validation,
          error: `Validation failed: ${errors.length} error(s)`,
        };
      }

      // 2. Prepare payload + hash inputs
      const prepared = await adapter.prepare(ctx);
      const inputs_hash = prepared.inputs_hash || (await hashPayload(prepared.payload));

      if (!ctx.allowWarnings && prepared.warnings.length) {
        return {
          status: 'prepared',
          adapter_id: adapter.id,
          format: ctx.format,
          inputs_hash,
          validation,
          error: `Prepared with ${prepared.warnings.length} warning(s); set allowWarnings=true to serialize`,
        };
      }

      // 3. Serialize deterministically
      const bytes = await adapter.serialize(prepared, ctx);
      const output_hash = await sha256Hex(bytes);

      return {
        status: 'exported',
        adapter_id: adapter.id,
        format: ctx.format,
        inputs_hash,
        output_hash,
        output_bytes: bytes,
        validation,
      };
    },
  };
}
