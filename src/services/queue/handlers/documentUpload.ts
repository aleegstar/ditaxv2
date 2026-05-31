/**
 * Document upload replay handler.
 *
 * Invariants:
 *  - The payload is ALREADY encrypted (mandatory E2E rule). We never
 *    re-encrypt at replay time, so a job created on device A and drained
 *    on device B would still need the user's key — but in practice jobs
 *    live in the same browser/profile that enqueued them.
 *  - The DB insert is the source of truth. If the storage upload succeeds
 *    but the DB insert fails (RLS, FK conflict), we delete the orphaned
 *    storage object before failing the job, so a retry won't double-insert.
 */
import { supabase } from '@/integrations/supabase/client';
import { validateStoragePath } from '@/utils/fileValidation';
import type { DocumentUploadJob } from '../types';

export async function runDocumentUploadJob(job: DocumentUploadJob): Promise<void> {
  const { filePath, encryptedData, dbRow } = job.payload;
  if (!validateStoragePath(filePath)) {
    throw new Error('Unsicherer Speicherpfad');
  }

  // Idempotency: storage upload uses `upsert: true` so a retry after a
  // partial success doesn't fail with a duplicate-key error.
  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(filePath, encryptedData, {
      contentType: 'application/octet-stream',
      upsert: true,
    });
  if (uploadError) throw uploadError;

  // DB insert — if this fails we tear down the storage object to avoid
  // accumulating orphaned encrypted blobs.
  const { error: dbError } = await supabase
    .from('uploaded_documents')
    .insert(dbRow);

  if (dbError) {
    // Conflict on the primary key means a previous drain pass already
    // inserted the row — treat as success and let storage be (idempotent).
    if (dbError.code === '23505') return;
    try {
      await supabase.storage.from('documents').remove([filePath]);
    } catch {
      /* best effort */
    }
    throw dbError;
  }
}
