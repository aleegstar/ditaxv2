/**
 * AG export persistence — writes a `canonical_exports` row referencing a
 * snapshot and storing inputs/payload hashes for reproducibility.
 *
 * NO file output. NO storage upload. status='prepared' only.
 */
import { supabase } from '@/integrations/supabase/client';
import { canonicalLogger } from '../../logger';
import type { PreparedAGExport } from './types';

export interface RecordAGExportArgs {
  dossier_id: string;
  dossier_revision: number;
  snapshot_id?: string;
  prepared: PreparedAGExport;
  validation_summary?: Record<string, unknown>;
  user_id?: string;
}

export interface RecordedExport {
  id: string;
  status: 'prepared';
  inputs_hash: string;
  output_hash: string;
}

export async function recordAGExport(args: RecordAGExportArgs): Promise<RecordedExport | null> {
  const m = args.prepared.payload.metadata;
  const row = {
    dossier_id: args.dossier_id,
    dossier_revision: args.dossier_revision,
    snapshot_id: args.snapshot_id ?? null,
    adapter_id: m.adapter_id,
    format: m.format,
    canton: m.canton,
    rules_version: m.rules_version,
    generated_at: m.generated_at,
    inputs_hash: args.prepared.inputs_hash,
    output_hash: args.prepared.payload_hash,
    status: 'prepared',
    validation_summary: args.validation_summary ?? {},
    schema_version: m.payload_schema_version,
    created_by: args.user_id ?? null,
    updated_by: args.user_id ?? null,
  };

  const { data, error } = await supabase
    .from('canonical_exports' as never)
    .insert(row as never)
    .select('id')
    .single();

  if (error) {
    canonicalLogger.warn({ event: 'ag_export.record_failed', dossier_id: args.dossier_id, error: error.message });
    return null;
  }
  const id = (data as { id: string }).id;
  canonicalLogger.info({
    event: 'ag_export.recorded',
    dossier_id: args.dossier_id,
    revision: args.dossier_revision,
    reason: 'prepared',
  });
  return { id, status: 'prepared', inputs_hash: row.inputs_hash, output_hash: row.output_hash };
}

export async function listAGExports(dossierId: string) {
  const { data } = await supabase
    .from('canonical_exports' as never)
    .select('id, dossier_revision, snapshot_id, adapter_id, format, rules_version, generated_at, inputs_hash, output_hash, status, created_at')
    .eq('dossier_id', dossierId)
    .eq('adapter_id', 'ag-etax')
    .order('created_at', { ascending: false });
  return (data as Array<Record<string, unknown>>) ?? [];
}
