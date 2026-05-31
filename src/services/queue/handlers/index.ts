/**
 * Handler registry for offline queue jobs.
 *
 * Each handler runs ONE job to completion or throws — the drainer is
 * responsible for backoff, persistence, and status transitions.
 */
import type { QueueJob } from '../types';
import { runDocumentUploadJob } from './documentUpload';

export async function runJob(job: QueueJob): Promise<void> {
  switch (job.type) {
    case 'document.upload':
      return runDocumentUploadJob(job);
    default: {
      // Exhaustive check — TypeScript will complain if a new job type is
      // added without a handler.
      const _exhaustive: never = job.type;
      throw new Error(`Unknown queue job type: ${String(_exhaustive)}`);
    }
  }
}
