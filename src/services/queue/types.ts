/**
 * Offline write-queue types — Phase 3 of Despia offline support.
 *
 * Every job is fully self-contained: payloads are already encrypted and
 * carry their own routing keys (tax_filer_id, user_id) so the drainer
 * doesn't need to re-derive crypto material at replay time.
 */

/** Job lifecycle states. Persisted as-is in IndexedDB. */
export type QueueJobStatus = 'pending' | 'running' | 'failed';

interface BaseJob {
  id: string;
  createdAt: number;
  /** Last error message for surfacing to the user. */
  lastError?: string;
  attempts: number;
  status: QueueJobStatus;
  /** Strict isolation — must match an existing tax filer the user owns. */
  taxFilerId: string | null;
  userId: string;
  /** Human-readable label for the UI sheet (e.g. file name). */
  label: string;
}

/**
 * Replay an already-encrypted document upload. The encrypted bytes are
 * stored alongside the job to survive app restarts; we never re-derive
 * the encryption key at replay time.
 */
export interface DocumentUploadJob extends BaseJob {
  type: 'document.upload';
  payload: {
    fileId: string;
    filePath: string;
    /** Encrypted bytes ready to push to Supabase Storage. */
    encryptedData: Blob;
    /** Row to insert into `uploaded_documents` once the upload succeeds. */
    dbRow: {
      id: string;
      user_id: string;
      tax_filer_id: string | null;
      checklist_item_id: string | null;
      file_name: string;
      file_type: string;
      file_path: string;
      tax_year: string | null;
      is_assigned_to_checklist: boolean;
      assigned_date: string | null;
      metadata: Record<string, unknown>;
      /** True for offline-collected docs awaiting later user assignment. */
      pending_assignment?: boolean;
    };
  };
}

export type QueueJob = DocumentUploadJob;

export type QueueJobType = QueueJob['type'];

export interface QueueSnapshot {
  jobs: QueueJob[];
  /** Total non-failed jobs awaiting drain. Updated on every change. */
  pendingCount: number;
  /** Jobs that hit max attempts and need user action. */
  failedCount: number;
  /** Whether a drain pass is currently running. */
  draining: boolean;
}

export type QueueListener = (snapshot: QueueSnapshot) => void;
