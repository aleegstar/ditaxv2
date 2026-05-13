/**
 * localStorage-backed registry of AG eTax import test cases. No DB this phase.
 */

export type ImportStatus = 'failed' | 'partial' | 'successful';

export interface ImportTestCase {
  id: string;                  // stable, locally allocated
  createdAt: string;           // ISO
  name: string;                // e.g. "single-employee, AG eTax 2024 v3"
  fixtureOrDossier: string;    // free-text source description
  generatedXmlHash?: string;
  generatedZipHash?: string;
  status: ImportStatus;
  errorMessage?: string;
  notes?: string;
  agSchemaVersion?: string;
}

const KEY = 'ditax.dev.agImportRegistry.v1';

function read(): ImportTestCase[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ImportTestCase[]) : [];
  } catch { return []; }
}

function write(list: ImportTestCase[]): void {
  localStorage.setItem(KEY, JSON.stringify(list));
}

export function listImportTests(): ImportTestCase[] {
  return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function upsertImportTest(tc: Omit<ImportTestCase, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): ImportTestCase {
  const list = read();
  const id = tc.id ?? `it-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
  const createdAt = tc.createdAt ?? new Date().toISOString();
  const next: ImportTestCase = { ...tc, id, createdAt };
  const idx = list.findIndex((x) => x.id === id);
  if (idx >= 0) list[idx] = next; else list.push(next);
  write(list);
  return next;
}

export function deleteImportTest(id: string): void {
  write(read().filter((x) => x.id !== id));
}

export function clearImportTests(): void {
  write([]);
}
