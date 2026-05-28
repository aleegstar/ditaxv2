import { supabase } from '@/integrations/supabase/client';

export interface LohnausweisFields {
  employer_name?: string;
  employer_address?: string;
  employee_name?: string;
  employee_ahv?: string;
  period_from?: string;
  period_to?: string;
  gross_salary?: number;
  company_car?: number;
  other_fringe_benefits?: number;
  irregular_pay?: number;
  capital_payments?: number;
  employee_participation?: number;
  board_compensation?: number;
  other_benefits?: number;
  gross_total?: number;
  ahv_iv_eo_alv_nbuv?: number;
  bvg_ordinary?: number;
  bvg_purchase?: number;
  net_salary?: number;
  withholding_tax?: number;
  meal_allowance?: number;
  flat_expenses?: number;
  further_education?: number;
  free_meals?: boolean;
  free_transport?: boolean;
  shift_days?: number;
  notes?: string;
  currency?: string;
  confidence?: number;
}

/**
 * Send a (decrypted) Lohnausweis file to the OCR edge function and receive
 * structured fields. Bytes are kept transient end-to-end (no storage).
 */
export async function extractLohnausweisFromFile(
  file: File | Blob,
): Promise<LohnausweisFields> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  // chunked base64 to avoid stack issues on large files
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(bytes.subarray(i, i + chunkSize)),
    );
  }
  const fileBase64 = btoa(binary);
  const mimeType =
    (file as File).type ||
    (file instanceof Blob ? file.type : '') ||
    'application/pdf';

  const { buildDeviceHeaders } = await import('@/lib/deviceVault');
  const deviceHeaders = await buildDeviceHeaders();
  const { data, error } = await supabase.functions.invoke('extract-lohnausweis', {
    body: { fileBase64, mimeType },
    headers: deviceHeaders,
  });
  if (error) {
    // Versuch, Body aus FunctionsHttpError zu lesen für freundliche Fehlermeldungen
    try {
      const ctx: any = (error as any)?.context;
      if (typeof ctx?.json === 'function') {
        const body = await ctx.json();
        if (ctx.status === 429 && (body?.reason === 'daily_limit' || body?.reason === 'daily_limit_device')) {
          throw new Error(
            'Die KI-Analyse für Lohnausweise ist heute aufgebraucht. Bitte morgen erneut versuchen oder Felder manuell ausfüllen.',
          );
        }
        if (ctx.status === 413 && body?.error === 'too_many_pages') {
          throw new Error(
            `Das PDF hat zu viele Seiten (${body.pages}/${body.max}). Bitte lade nur den Lohnausweis (max. 80 Seiten) hoch.`,
          );
        }
        if (ctx.status === 413 && body?.error === 'file_too_large') {
          throw new Error('Die Datei ist zu gross (max. 20 MB).');
        }
      }
    } catch (e) {
      if (e instanceof Error && (e.message.includes('KI-Analyse') || e.message.includes('Seiten') || e.message.includes('zu gross'))) throw e;
    }
    throw error;
  }
  if (!data || (data as any).error) {
    if ((data as any)?.error === 'rate_limited') {
      throw new Error(
        'Die KI-Analyse für Lohnausweise ist heute aufgebraucht. Bitte morgen erneut versuchen oder Felder manuell ausfüllen.',
      );
    }
    throw new Error((data as any)?.error || 'OCR fehlgeschlagen');
  }
  return ((data as any).fields ?? {}) as LohnausweisFields;
}
