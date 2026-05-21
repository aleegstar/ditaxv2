// Lohnausweis OCR Extraction — Azure Document Intelligence (Switzerland North).
//
// - Auth-gated
// - Bytes transient im RAM, niemals persistiert
// - Liefert strukturierte Felder (CH Ziff. 1–15) via regelbasiertem Mapper
// - DSGVO/FADP: keine LLM-Aufrufe, kein Rohtext zurückgegeben

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  analyzeDocument,
  AzureDocIntelError,
  AzureAnalyzeResult,
  AzurePage,
  extractPlainText,
} from "../_shared/azure-doc-intel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LohnausweisFields {
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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth gate
  try {
    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } =
      await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  } catch (err) {
    console.error("[extract-lohnausweis] auth check failed", err);
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { fileBase64?: string; mimeType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { fileBase64, mimeType } = payload;
  if (!fileBase64 || typeof fileBase64 !== "string") {
    return json({ error: "fileBase64 required" }, 400);
  }

  let b64 = fileBase64;
  let mt = mimeType;
  if (b64.startsWith("data:")) {
    const m = b64.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      mt = mt || m[1];
      b64 = m[2];
    }
  }
  if (!mt) mt = "application/pdf";
  if (b64.length < 1000) return json({ error: "file_too_small" }, 400);
  if (b64.length > 7_500_000) return json({ error: "file_too_large" }, 413);

  const bytes = base64ToBytes(b64);

  try {
    const startedAt = Date.now();
    const result = await analyzeDocument(bytes, mt, "prebuilt-layout");
    console.log(`[extract-lohnausweis] azure-layout ms=${Date.now() - startedAt}`);

    const fields = mapLohnausweis(result);
    if (Object.keys(fields).length === 0) {
      return json({ error: "no_extraction" }, 422);
    }
    return json({ fields });
  } catch (err) {
    if (err instanceof AzureDocIntelError) {
      if (err.code === "rate_limited") return json({ error: "rate_limited" }, 429);
      if (err.code === "azure_unauthorized") return json({ error: "ocr_unauthorized" }, 502);
      if (err.code === "azure_timeout") return json({ error: "ocr_timeout" }, 504);
      if (err.code === "azure_not_configured") return json({ error: "ocr_not_configured" }, 500);
      return json({ error: "ocr_failed" }, 502);
    }
    console.error("[extract-lohnausweis] error", err);
    return json({ error: "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ============================================================================
// Lohnausweis-Mapper
// ============================================================================
//
// Strategie: Azure DI liefert pro Seite Lines (mit Polygon-Koordinaten).
// Wir suchen Zeilen mit Ziffer-Präfixen (z.B. "1.", "8.", "11.", "13.1.1")
// und extrahieren den letzten Geldbetrag aus derselben Zeile ODER der
// nächsten Zeile (rechts daneben, Spaltenlayout).

const CHF_AMOUNT_RX = /-?\d{1,3}(?:[' ]\d{3})*(?:\.\d{2})?|-?\d+\.\d{2}|-?\d+/;
// Match a number anywhere; we'll then pick the rightmost one in the relevant line(s).

function parseChfAmount(raw: string): number | undefined {
  if (!raw) return undefined;
  const cleaned = raw.replace(/['\s]/g, "").replace(",", ".");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

function lastAmountIn(text: string): number | undefined {
  if (!text) return undefined;
  const matches = text.match(/-?\d{1,3}(?:[' ]\d{3})+(?:\.\d{2})?|-?\d+\.\d{2}/g);
  if (!matches?.length) return undefined;
  return parseChfAmount(matches[matches.length - 1]);
}

function parseSwissDate(raw: string): string | undefined {
  const m = raw.match(/(\d{1,2})\.(\d{1,2})\.((?:19|20)\d{2})/);
  if (!m) return undefined;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  return `${m[3]}-${mm}-${dd}`;
}

interface LineRef {
  page: number;
  lineIndex: number;
  content: string;
  yCenter: number;
  xMin: number;
}

function buildLineIndex(pages: AzurePage[]): LineRef[] {
  const out: LineRef[] = [];
  for (const page of pages) {
    const lines = page.lines ?? [];
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      const poly = l.polygon ?? [];
      // polygon: [x0,y0, x1,y1, x2,y2, x3,y3] in inches
      let yCenter = 0;
      let xMin = 0;
      if (poly.length >= 8) {
        const ys = [poly[1], poly[3], poly[5], poly[7]];
        const xs = [poly[0], poly[2], poly[4], poly[6]];
        yCenter = (Math.min(...ys) + Math.max(...ys)) / 2;
        xMin = Math.min(...xs);
      }
      out.push({
        page: page.pageNumber,
        lineIndex: i,
        content: l.content ?? "",
        yCenter,
        xMin,
      });
    }
  }
  return out;
}

/**
 * For a Lohnausweis the typical layout has the Ziffer-label on the left and
 * the amount on the right of the SAME visual row. We collect all line content
 * within ±0.15 inches of the label's y-center on the same page, then pick the
 * rightmost number.
 */
function amountInSameRow(label: LineRef, lines: LineRef[]): number | undefined {
  const sameRow = lines.filter(
    (l) =>
      l.page === label.page &&
      l.lineIndex !== label.lineIndex &&
      Math.abs(l.yCenter - label.yCenter) < 0.18 &&
      l.xMin > label.xMin, // right of the label
  );
  // Also include the label's own text in case the amount is on the same line
  const candidates = [label.content, ...sameRow.map((l) => l.content)];
  for (let i = candidates.length - 1; i >= 0; i--) {
    const n = lastAmountIn(candidates[i]);
    if (n !== undefined) return n;
  }
  return undefined;
}

// Each entry: regex matching the start of a Lohnausweis Ziffer label.
const NUMERIC_FIELDS: Array<{ key: keyof LohnausweisFields; rx: RegExp }> = [
  { key: "gross_salary",            rx: /^\s*1\.\s/ },
  { key: "company_car",             rx: /^\s*2\.2\s/ },
  { key: "other_fringe_benefits",   rx: /^\s*2\.3\s/ },
  { key: "irregular_pay",           rx: /^\s*3\.\s/ },
  { key: "capital_payments",        rx: /^\s*4\.\s/ },
  { key: "employee_participation",  rx: /^\s*5\.\s/ },
  { key: "board_compensation",      rx: /^\s*6\.\s/ },
  { key: "other_benefits",          rx: /^\s*7\.\s/ },
  { key: "gross_total",             rx: /^\s*8\.\s/ },
  { key: "ahv_iv_eo_alv_nbuv",      rx: /^\s*9\.\s/ },
  { key: "bvg_ordinary",            rx: /^\s*10\.1\s/ },
  { key: "bvg_purchase",            rx: /^\s*10\.2\s/ },
  { key: "net_salary",              rx: /^\s*11\.\s/ },
  { key: "withholding_tax",         rx: /^\s*12\.\s/ },
  { key: "meal_allowance",          rx: /^\s*13\.1\.1\s/ },
  { key: "flat_expenses",           rx: /^\s*13\.2\.[12]\s/ },
  { key: "further_education",       rx: /^\s*13\.3\s/ },
];

function mapLohnausweis(result: AzureAnalyzeResult): LohnausweisFields {
  const fields: LohnausweisFields = { currency: "CHF" };
  const pages = result.pages ?? [];
  const lines = buildLineIndex(pages);
  const fullText = extractPlainText(result);

  // --- Numeric fields (Ziff. 1–13) ---
  for (const { key, rx } of NUMERIC_FIELDS) {
    const label = lines.find((l) => rx.test(l.content));
    if (!label) continue;
    const val = amountInSameRow(label, lines);
    if (val !== undefined) {
      (fields as Record<string, unknown>)[key] = val;
    }
  }

  // --- AHV ---
  const ahvMatch = fullText.match(/756[.\s]\d{4}[.\s]\d{4}[.\s]\d{2}/);
  if (ahvMatch) fields.employee_ahv = ahvMatch[0].replace(/\s/g, ".");

  // --- Dates: Anstellungsbeginn/-ende ---
  // Look for "vom dd.mm.yyyy bis dd.mm.yyyy" or labelled lines.
  const periodRx =
    /(?:vom|von)\s+(\d{1,2}\.\d{1,2}\.\d{4})\s+(?:bis|–|-)\s+(\d{1,2}\.\d{1,2}\.\d{4})/i;
  const pm = fullText.match(periodRx);
  if (pm) {
    fields.period_from = parseSwissDate(pm[1]);
    fields.period_to = parseSwissDate(pm[2]);
  }

  // --- Selection marks (Felder F & G) ---
  // Layout pages expose selectionMarks; we pair them with neighbour text.
  for (const page of pages) {
    for (const mark of page.selectionMarks ?? []) {
      const poly = mark.polygon ?? [];
      if (poly.length < 8) continue;
      const ys = [poly[1], poly[3], poly[5], poly[7]];
      const xs = [poly[0], poly[2], poly[4], poly[6]];
      const yc = (Math.min(...ys) + Math.max(...ys)) / 2;
      const xMax = Math.max(...xs);
      const neighbours = lines
        .filter(
          (l) =>
            l.page === page.pageNumber &&
            Math.abs(l.yCenter - yc) < 0.18 &&
            l.xMin >= xMax - 0.1 &&
            l.xMin <= xMax + 3.0,
        )
        .map((l) => l.content)
        .join(" ")
        .toLowerCase();
      const isSelected = mark.state === "selected";
      if (/unentgeltlich.*beförder|wohn.*arbeitsort|feld\s*f\b|^f\s/i.test(neighbours)) {
        fields.free_transport = isSelected;
      }
      if (/kantinen|lunch|verpflegung|feld\s*g\b|^g\s/i.test(neighbours)) {
        fields.free_meals = isSelected;
      }
    }
  }

  // --- Notes (Ziff. 15: Bemerkungen) ---
  const notesIdx = lines.findIndex((l) => /^\s*15\.\s|bemerkungen/i.test(l.content));
  if (notesIdx >= 0) {
    const label = lines[notesIdx];
    const notesLines = lines
      .filter(
        (l) =>
          l.page === label.page &&
          l.yCenter > label.yCenter &&
          l.yCenter - label.yCenter < 2.0, // up to ~2 inches below
      )
      .map((l) => l.content);
    const notes = notesLines.join(" ").trim();
    if (notes && notes.length > 5) {
      fields.notes = notes.slice(0, 1000);
      // Try to extract shift days
      const sd = notes.match(/(\d{1,3})\s*Schichttag/i);
      if (sd) fields.shift_days = Number(sd[1]);
    }
  }

  // --- Employer / Employee names: take the first two non-trivial lines on page 1 ---
  // (Lohnausweis: oben links Arbeitgeber-Block, oben rechts Arbeitnehmer-Block)
  // We avoid hard-coding fragile heuristics here — leave empty if not obvious.
  const page1Lines = lines.filter((l) => l.page === 1).slice(0, 30);
  const employerCandidate = page1Lines.find(
    (l) =>
      l.xMin < 3.5 &&
      l.content.length > 3 &&
      !/lohnausweis|^seite|^page|salary|gehalts/i.test(l.content) &&
      !/^\d/.test(l.content),
  );
  if (employerCandidate) fields.employer_name = employerCandidate.content.trim().slice(0, 200);

  // --- Confidence: rough average over numeric fields found ---
  const totalNumericFound = NUMERIC_FIELDS.filter(
    ({ key }) => (fields as Record<string, unknown>)[key] !== undefined,
  ).length;
  if (totalNumericFound > 0) {
    fields.confidence = Math.min(1, 0.6 + totalNumericFound * 0.03);
  }

  return fields;
}
