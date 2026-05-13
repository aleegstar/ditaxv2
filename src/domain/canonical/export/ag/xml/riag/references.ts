/**
 * Stable local id allocator. Produces ref-NNN identifiers from a sorted key
 * list, so the same logical content always yields the same id.
 *
 * Allocation is content-derived: callers feed an ordered list of stable keys
 * (typically `${kind}:${index}`) and receive a Map<key, id>.
 */

export type LocalRef = string; // e.g. 'ref-001'

export interface ReferenceTable {
  refs: Record<string, LocalRef>;
  /** Inverse lookup, ordered by id. */
  list: Array<{ id: LocalRef; key: string }>;
}

export function allocateReferences(keys: string[]): ReferenceTable {
  const sorted = [...new Set(keys)].sort();
  const refs: Record<string, LocalRef> = {};
  const list: Array<{ id: LocalRef; key: string }> = [];
  sorted.forEach((key, i) => {
    const id = `ref-${String(i + 1).padStart(3, '0')}`;
    refs[key] = id;
    list.push({ id, key });
  });
  return { refs, list };
}
