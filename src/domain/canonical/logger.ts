/**
 * Structured logging for canonical domain operations.
 * Lightweight wrapper around console with consistent shape.
 */
type Level = 'debug' | 'info' | 'warn' | 'error';

interface LogPayload {
  event: string;
  dossier_id?: string;
  tax_filer_id?: string;
  tax_year?: string;
  revision?: number;
  duration_ms?: number;
  entity_counts?: Record<string, number>;
  reason?: string;
  error?: unknown;
  [k: string]: unknown;
}

const isDev = typeof process !== 'undefined' && process.env?.NODE_ENV === 'development';

function emit(level: Level, payload: LogPayload) {
  const line = { ts: new Date().toISOString(), scope: 'canonical', level, ...payload };
  // Always log warn/error; debug only in dev
  if (level === 'debug' && !isDev) return;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn('[canonical]', line);
}

export const canonicalLogger = {
  debug: (p: LogPayload) => emit('debug', p),
  info: (p: LogPayload) => emit('info', p),
  warn: (p: LogPayload) => emit('warn', p),
  error: (p: LogPayload) => emit('error', p),
};
