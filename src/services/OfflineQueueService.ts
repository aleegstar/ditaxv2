/**
 * OfflineQueueService — persistent write-queue (Phase 3).
 *
 * Stores enqueued jobs in IndexedDB so they survive process kills and
 * device reboots. The drainer runs sequentially per tax filer to avoid
 * race conditions in dependent operations (e.g. upload → checklist
 * association). Triggers:
 *
 *  - `online` browser event
 *  - `visibilitychange` (app resume in Despia)
 *  - Successful auth token refresh
 *  - Manual `flush()` call from the UI sheet
 *
 * Security:
 *  - Encrypted-only payloads (mandatory E2E rule). Handlers never
 *    re-derive keys at replay time.
 *  - On Supabase `SIGNED_OUT` the entire queue is wiped — a different
 *    user on the same device must never inherit pending writes.
 *  - Login, MFA, passkey, payments and sign-tax-return are NEVER
 *    queued; they fail loudly when offline.
 */
import { get, set, del, createStore } from 'idb-keyval';
import { supabase } from '@/integrations/supabase/client';
import { runJob } from './queue/handlers';
import type {
  QueueJob,
  QueueJobType,
  QueueListener,
  QueueSnapshot,
} from './queue/types';

// Own DB — must NOT share `ditax-cache` with reactQueryPersist, because
// idb-keyval.createStore opens a DB with a single object store and the
// second caller would inherit a schema without its store (NotFoundError).
const DB_NAME = 'ditax-offline-queue';
const STORE_NAME = 'jobs';
const QUEUE_KEY = 'jobs-v1';
const MAX_ATTEMPTS = 6;
const BACKOFF_MS = [1_000, 5_000, 15_000, 30_000, 60_000, 60_000];

const store = createStore(DB_NAME, STORE_NAME);

class OfflineQueueServiceImpl {
  private jobs: QueueJob[] = [];
  private hydrated = false;
  private hydrationPromise: Promise<void> | null = null;
  private draining = false;
  private listeners = new Set<QueueListener>();
  private started = false;
  private nextDrainTimer: ReturnType<typeof setTimeout> | null = null;

  /** Read jobs from IndexedDB into memory. Safe to call multiple times. */
  private hydrate(): Promise<void> {
    if (this.hydrated) return Promise.resolve();
    if (this.hydrationPromise) return this.hydrationPromise;
    this.hydrationPromise = (async () => {
      try {
        const raw = await get<unknown>(QUEUE_KEY, store);
        if (Array.isArray(raw)) {
          // Reset any `running` flags from a previous, possibly crashed,
          // session so the drainer can pick them up again.
          this.jobs = (raw as QueueJob[]).map((j) =>
            j.status === 'running' ? { ...j, status: 'pending' } : j,
          );
        }
      } catch (err) {
        console.error('[OfflineQueue] hydrate failed', err);
        this.jobs = [];
      } finally {
        this.hydrated = true;
      }
    })();
    return this.hydrationPromise;
  }

  private async persist(): Promise<void> {
    try {
      if (this.jobs.length === 0) {
        await del(QUEUE_KEY, store);
      } else {
        // idb-keyval handles Blob serialisation natively via structured clone.
        await set(QUEUE_KEY, this.jobs, store);
      }
    } catch (err) {
      console.error('[OfflineQueue] persist failed', err);
    }
  }

  private snapshot(): QueueSnapshot {
    let pending = 0;
    let failed = 0;
    for (const j of this.jobs) {
      if (j.status === 'failed') failed += 1;
      else pending += 1;
    }
    return {
      jobs: [...this.jobs],
      pendingCount: pending,
      failedCount: failed,
      draining: this.draining,
    };
  }

  private emit(): void {
    const snap = this.snapshot();
    for (const l of this.listeners) {
      try {
        l(snap);
      } catch (err) {
        console.error('[OfflineQueue] listener threw', err);
      }
    }
  }

  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    // Fire current state immediately (after hydration).
    void this.hydrate().then(() => listener(this.snapshot()));
    return () => {
      this.listeners.delete(listener);
    };
  }

  async getSnapshot(): Promise<QueueSnapshot> {
    await this.hydrate();
    return this.snapshot();
  }

  /**
   * Enqueue a new job. Returns the assigned id. Triggers an immediate
   * drain attempt — if the network is up, the caller experiences a
   * latency similar to a direct call.
   */
  async enqueue(
    type: QueueJobType,
    init: Omit<Extract<QueueJob, { type: typeof type }>, 'id' | 'createdAt' | 'attempts' | 'status' | 'type'>,
  ): Promise<string> {
    await this.hydrate();
    const id = (typeof crypto !== 'undefined' && 'randomUUID' in crypto)
      ? crypto.randomUUID()
      : `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const job = {
      ...init,
      id,
      type,
      createdAt: Date.now(),
      attempts: 0,
      status: 'pending' as const,
    } as QueueJob;
    this.jobs.push(job);
    await this.persist();
    this.emit();
    void this.drain();
    return id;
  }

  /** Retry a previously-failed job. */
  async retry(jobId: string): Promise<void> {
    await this.hydrate();
    const j = this.jobs.find((j) => j.id === jobId);
    if (!j) return;
    j.status = 'pending';
    j.attempts = 0;
    j.lastError = undefined;
    await this.persist();
    this.emit();
    void this.drain();
  }

  /** Permanently discard a job (used for failed ones the user gives up on). */
  async discard(jobId: string): Promise<void> {
    await this.hydrate();
    const idx = this.jobs.findIndex((j) => j.id === jobId);
    if (idx === -1) return;
    this.jobs.splice(idx, 1);
    await this.persist();
    this.emit();
  }

  /** Wipe everything — called on sign-out for security. */
  async clear(): Promise<void> {
    this.jobs = [];
    this.hydrated = true;
    await this.persist();
    this.emit();
  }

  /** Manual trigger from the UI. */
  flush(): void {
    void this.drain();
  }

  private scheduleNextDrain(delayMs: number): void {
    if (this.nextDrainTimer) clearTimeout(this.nextDrainTimer);
    this.nextDrainTimer = setTimeout(() => {
      this.nextDrainTimer = null;
      void this.drain();
    }, delayMs);
  }

  /**
   * Drain pending jobs sequentially. Bails out immediately when offline.
   * Re-entrant: only one drain pass runs at a time.
   */
  private async drain(): Promise<void> {
    await this.hydrate();
    if (this.draining) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    this.draining = true;
    this.emit();
    let nextRetryDelay: number | null = null;

    try {
      // Sort so we drain oldest first within each tax filer.
      const order = [...this.jobs]
        .filter((j) => j.status !== 'failed')
        .sort((a, b) => a.createdAt - b.createdAt);

      for (const job of order) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) break;

        job.status = 'running';
        this.emit();

        try {
          await runJob(job);
          // Success → remove from queue.
          const idx = this.jobs.findIndex((j) => j.id === job.id);
          if (idx !== -1) this.jobs.splice(idx, 1);
          await this.persist();
          this.emit();
        } catch (err: unknown) {
          job.attempts += 1;
          job.lastError = err instanceof Error ? err.message : String(err);
          if (job.attempts >= MAX_ATTEMPTS) {
            job.status = 'failed';
          } else {
            job.status = 'pending';
            const delay = BACKOFF_MS[Math.min(job.attempts - 1, BACKOFF_MS.length - 1)];
            nextRetryDelay = nextRetryDelay == null ? delay : Math.min(nextRetryDelay, delay);
          }
          await this.persist();
          this.emit();
          // Stop draining further jobs on the first failure to avoid
          // cascading errors on a flaky connection.
          break;
        }
      }
    } finally {
      this.draining = false;
      this.emit();
      if (nextRetryDelay != null) {
        this.scheduleNextDrain(nextRetryDelay);
      }
    }
  }

  /** Wire up lifecycle triggers. Safe to call multiple times. */
  start(): void {
    if (this.started) return;
    this.started = true;
    void this.hydrate();

    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => this.flush());
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) this.flush();
    });

    supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        void this.clear();
        return;
      }
      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        this.flush();
      }
    });

    // First-shot drain in case we boot online with pending work.
    this.flush();
  }
}

export const OfflineQueueService = new OfflineQueueServiceImpl();
