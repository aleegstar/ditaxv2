/**
 * AG payload inspector — diff/inspection helpers used by /dev/ag-export.
 *
 * Pure utilities — no I/O.
 */
import { stableStringify } from '../hashing';
import type { AGExportPayload } from './types';

export interface PayloadFieldRow {
  path: string;
  value: string;
}

/** Flatten payload to dot-paths for table view. Stable ordering via stableStringify. */
export function flattenPayload(payload: AGExportPayload): PayloadFieldRow[] {
  const rows: PayloadFieldRow[] = [];
  const walk = (v: unknown, path: string) => {
    if (v === null || v === undefined) return;
    if (typeof v !== 'object') {
      rows.push({ path, value: String(v) });
      return;
    }
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    for (const k of Object.keys(v as Record<string, unknown>).sort()) {
      walk((v as Record<string, unknown>)[k], path ? `${path}.${k}` : k);
    }
  };
  walk(payload, '');
  return rows;
}

export interface PayloadDiff {
  added: PayloadFieldRow[];
  removed: PayloadFieldRow[];
  changed: Array<{ path: string; before: string; after: string }>;
  identical: boolean;
}

/** Diff two AG payloads field-by-field. */
export function diffPayloads(a: AGExportPayload, b: AGExportPayload): PayloadDiff {
  const ra = new Map(flattenPayload(a).map((r) => [r.path, r.value]));
  const rb = new Map(flattenPayload(b).map((r) => [r.path, r.value]));
  const added: PayloadFieldRow[] = [];
  const removed: PayloadFieldRow[] = [];
  const changed: Array<{ path: string; before: string; after: string }> = [];
  for (const [path, value] of rb) {
    if (!ra.has(path)) added.push({ path, value });
    else if (ra.get(path) !== value) changed.push({ path, before: ra.get(path)!, after: value });
  }
  for (const [path, value] of ra) {
    if (!rb.has(path)) removed.push({ path, value });
  }
  return { added, removed, changed, identical: !added.length && !removed.length && !changed.length };
}

export const stringifyPayload = (p: AGExportPayload) => stableStringify(p);
