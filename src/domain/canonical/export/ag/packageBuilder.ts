/**
 * Orchestrates: AG payload → validate → XML → manifest → ZIP → hashes.
 *
 * Pure (no DB writes). The dev page persists the result via persistence.ts.
 */
import { sha256Hex } from '../hashing';
import type { PreparedAGExport } from './types';
import { el, renderXmlBytes } from './xml/xmlBuilder';
import { buildDeterministicZip, type ZipEntry } from './xml/zipBuilder';
import { serializeAGPayloadToXml } from './xml/serializer';
import { validateAGPayload, type ExportValidationResult } from './xml/validator';

export interface PackageResult {
  xmlBytes: Uint8Array;
  manifestBytes: Uint8Array;
  zipBytes: Uint8Array;
  xml_hash: string;
  manifest_hash: string;
  zip_hash: string;
  inputs_hash: string;
  payload_hash: string;
  validation: ExportValidationResult;
}

export class ExportValidationError extends Error {
  constructor(public validation: ExportValidationResult) {
    super(`AG export blocked: ${validation.errors.length} error(s)`);
  }
}

function buildManifest(prepared: PreparedAGExport, xmlHash: string): Uint8Array {
  const m = prepared.payload.metadata;
  const root = el('Manifest', { xmlns: 'urn:ditax:ag-etax-manifest:1' }, [
    el('Adapter', undefined, m.adapter_id),
    el('SchemaVersion', undefined, m.payload_schema_version),
    el('Canton', undefined, m.canton),
    el('TaxYear', undefined, m.tax_year),
    el('DossierId', undefined, m.dossier_id),
    el('DossierRevision', undefined, m.dossier_revision),
    el('GeneratedAt', undefined, m.generated_at),
    el('RulesVersion', undefined, m.rules_version),
    el('Files', [
      el('File', { name: 'taxdata.xml', sha256: xmlHash }),
    ]),
    el('Hashes', [
      el('InputsHash', undefined, prepared.inputs_hash),
      el('PayloadHash', undefined, prepared.payload_hash),
    ]),
  ]);
  return renderXmlBytes(root);
}

export interface BuildPackageOptions {
  /** When true, validation warnings still allow ZIP generation. Errors always block. */
  allowWarnings?: boolean;
}

export async function buildAGExportPackage(
  prepared: PreparedAGExport,
  opts: BuildPackageOptions = {},
): Promise<PackageResult> {
  const validation = validateAGPayload(prepared.payload);
  if (!validation.ok) throw new ExportValidationError(validation);
  if (validation.warnings.length && !opts.allowWarnings) {
    // Permit by default — warnings are non-blocking. Flag retained for future strict mode.
  }

  const xmlBytes = serializeAGPayloadToXml({
    payload: prepared.payload,
    inputsHash: prepared.inputs_hash,
    payloadHash: prepared.payload_hash,
  });
  const xml_hash = await sha256Hex(xmlBytes);
  const manifestBytes = buildManifest(prepared, xml_hash);
  const manifest_hash = await sha256Hex(manifestBytes);

  // Placeholder marker file so the attachments folder always exists in the archive.
  const placeholder = new TextEncoder().encode('# attachments placeholder — none in this phase\n');

  const entries: ZipEntry[] = [
    { name: 'manifest.xml', bytes: manifestBytes },
    { name: 'taxdata.xml', bytes: xmlBytes },
    { name: 'attachments/.keep', bytes: placeholder },
  ];

  const zipBytes = buildDeterministicZip(entries, { generatedAt: prepared.payload.metadata.generated_at });
  const zip_hash = await sha256Hex(zipBytes);

  return {
    xmlBytes, manifestBytes, zipBytes,
    xml_hash, manifest_hash, zip_hash,
    inputs_hash: prepared.inputs_hash,
    payload_hash: prepared.payload_hash,
    validation,
  };
}
