/**
 * Bulk Classification Service
 *
 * Classifies many uploaded files at once by running each through the existing
 * DocumentValidator and proposing the most likely checklist item.
 *
 * PRIVACY: Uses the existing local-first OCR pipeline. No file content
 * leaves the device.
 */

import DocumentValidator from './DocumentValidator';
import { getDocumentProfile } from '@/config/documentProfiles';
import type { ChecklistItem } from '@/types';
import type { ValidationResult } from '@/types/documentProfile';

export interface ClassificationCandidate {
  checklistItemId: string;
  label: string;
  confidence: number;
}

export interface ClassifiedFile {
  id: string;
  file: File;
  status: 'pending' | 'analyzing' | 'done' | 'error';
  suggestedChecklistItemId: string | null;
  suggestedLabel: string | null;
  confidence: number;
  alternatives: ClassificationCandidate[];
  validation?: ValidationResult;
  error?: string;
}

const validator = DocumentValidator.getInstance();

/**
 * Pick the best checklist item out of the validator's top candidates.
 * A profile only counts when it maps to a checklist item that is part
 * of the user's current required list.
 */
function pickBestForChecklist(
  result: ValidationResult,
  checklistIds: Set<string>,
): { id: string | null; label: string | null; confidence: number; alternatives: ClassificationCandidate[] } {
  const alts: ClassificationCandidate[] = [];
  for (const c of result.candidates) {
    const profile = getDocumentProfile(c.docTypeId);
    if (!profile) continue;
    if (!checklistIds.has(c.docTypeId)) continue;
    alts.push({
      checklistItemId: c.docTypeId,
      label: profile.label,
      confidence: c.confidence,
    });
  }

  // Fallback: if no candidate is in the checklist, propose the very best
  // raw profile so the user still sees what we think it is.
  if (alts.length === 0) {
    const top = result.candidates[0];
    const profile = top ? getDocumentProfile(top.docTypeId) : null;
    return {
      id: null,
      label: profile?.label ?? null,
      confidence: top?.confidence ?? 0,
      alternatives: [],
    };
  }

  alts.sort((a, b) => b.confidence - a.confidence);
  const best = alts[0];
  return {
    id: best.checklistItemId,
    label: best.label,
    confidence: best.confidence,
    alternatives: alts.slice(0, 5),
  };
}

/**
 * Classify a list of files in parallel with a concurrency limit.
 * Calls `onUpdate` whenever a single file's status changes so the UI
 * can render progressive results.
 */
export async function classifyFiles(
  initial: ClassifiedFile[],
  checklistItems: ChecklistItem[],
  onUpdate: (next: ClassifiedFile[]) => void,
  concurrency = 2,
): Promise<ClassifiedFile[]> {
  const checklistIds = new Set(checklistItems.map((i) => i.id));
  const items = initial.map((f) => ({ ...f }));

  const emit = () => onUpdate(items.map((i) => ({ ...i })));

  let cursor = 0;
  const runOne = async (): Promise<void> => {
    while (cursor < items.length) {
      const idx = cursor++;
      const entry = items[idx];
      entry.status = 'analyzing';
      emit();
      try {
        const result = await validator.validate(entry.file);
        const pick = pickBestForChecklist(result, checklistIds);
        entry.validation = result;
        entry.suggestedChecklistItemId = pick.id;
        entry.suggestedLabel = pick.label;
        entry.confidence = pick.confidence;
        entry.alternatives = pick.alternatives;
        entry.status = 'done';
      } catch (e: any) {
        console.error('[BulkClassification] failed for', entry.file.name, e);
        entry.status = 'error';
        entry.error = e?.message ?? 'Analyse fehlgeschlagen';
      }
      emit();
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, runOne);
  await Promise.all(workers);
  return items;
}
