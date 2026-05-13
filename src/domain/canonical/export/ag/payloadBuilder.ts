/**
 * AG payload builder — orchestrates context + mapper + hashing into a
 * deterministic `PreparedAGExport`. No I/O.
 */
import type { Dossier } from '../../types';
import { hashCanonicalDossier, hashExportPayload } from '../hashing';
import { mapDossierToAG } from './mapper';
import {
  AG_PAYLOAD_SCHEMA_VERSION, type AGExportMetadata, type AGExportPayload,
  type PreparedAGExport,
} from './types';

export interface BuildAGExportContext {
  dossier: Dossier;
  dossierRevision: number;
  snapshotId?: string;
  rulesVersion: string;
  /** Deterministic timestamp (ISO). Caller-provided to keep build pure. */
  generatedAt: string;
}

export async function buildAGExportPayload(ctx: BuildAGExportContext): Promise<PreparedAGExport> {
  const { dossier } = ctx;
  if (!dossier.id) throw new Error('Dossier must be persisted (id required) before AG export');

  const metadata: AGExportMetadata = {
    adapter_id: 'ag-etax',
    format: 'ag-etax-payload',
    payload_schema_version: AG_PAYLOAD_SCHEMA_VERSION,
    canton: 'AG',
    tax_year: dossier.tax_year,
    dossier_id: dossier.id,
    dossier_revision: ctx.dossierRevision,
    snapshot_id: ctx.snapshotId,
    rules_version: ctx.rulesVersion,
    generated_at: ctx.generatedAt,
    source_schema_version: dossier.schema_version,
  };

  const payload: AGExportPayload = mapDossierToAG(dossier, { metadata });
  const [inputs_hash, payload_hash] = await Promise.all([
    hashCanonicalDossier(dossier),
    hashExportPayload(payload),
  ]);
  return { payload, inputs_hash, payload_hash };
}
