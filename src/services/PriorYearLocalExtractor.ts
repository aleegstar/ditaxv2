// Local, privacy-preserving extractor for prior-year Swiss tax returns.
//
// Strategy (rewritten):
// 1) Read the PDF text layer WITH coordinates via pdfjs-dist and rebuild
//    visual rows. This avoids the previous bug where a flat string mixed
//    section numbers (1.1, 30.2), birth dates (14.10.1996), page IDs
//    (0280832501DAG) and form codes (010, 3201) together — which caused
//    countless false-positive category hits.
// 2) For each row, find the AG form code (right "Code" column) and its
//    value cell (next numeric cell to the right). If no value is present,
//    the field is empty and the category is NOT flagged.
// 3) Map filled codes to AG-specific document categories. Fallback to a
//    line-based heuristic only for scanned/OCR text where no positions
//    are available.

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

(pdfjsLib as any).GlobalWorkerOptions.workerPort = new PdfWorker();

export type ExtractedItem = { label: string };
export type ExtractedScan = {
  contact: ExtractedItem[]; // always empty – kept for back-compat
  income: ExtractedItem[];
  assets: ExtractedItem[];
  deductions: ExtractedItem[];
};

type Cell = { x: number; y: number; str: string };
type Row = { y: number; cells: Cell[] };

// ---------------------------------------------------------------------------
// Raw text extractors
// ---------------------------------------------------------------------------

/** Read all text from a PDF file (flat). Kept for back-compat / OCR fallback. */
export async function extractTextFromPdf(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const doc = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const line = content.items.map((it: any) => it.str).join(" ");
    parts.push(line);
  }
  return parts.join("\n");
}

/** Read PDF as positional rows (one array per page). */
async function extractRowsFromPdf(file: File): Promise<Row[][]> {
  const buf = await file.arrayBuffer();
  const doc = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const pages: Row[][] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const cells: Cell[] = [];
    for (const it of content.items as any[]) {
      const str = (it.str ?? "").trim();
      if (!str) continue;
      const tr = it.transform as number[];
      cells.push({ x: tr[4], y: tr[5], str });
    }
    pages.push(groupCellsIntoRows(cells));
  }
  return pages;
}

function groupCellsIntoRows(cells: Cell[]): Row[] {
  const tol = 2.5;
  const sorted = [...cells].sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: Row[] = [];
  for (const c of sorted) {
    const row = rows.find((r) => Math.abs(r.y - c.y) <= tol);
    if (row) row.cells.push(c);
    else rows.push({ y: c.y, cells: [c] });
  }
  for (const r of rows) r.cells.sort((a, b) => a.x - b.x);
  return rows;
}

/** Returns true if the text layer is rich enough to skip OCR. */
export function hasUsableTextLayer(text: string): boolean {
  return text.replace(/\s+/g, "").length > 400;
}

/**
 * Run OCR locally on a scanned PDF (no upload).
 * Uses tesseract-wasm with the German model already bundled in /public/ocr.
 */
export async function ocrPdfLocally(
  file: File,
  opts: { maxPages?: number; onProgress?: (info: { page: number; total: number }) => void } = {},
): Promise<string> {
  const { maxPages = 6, onProgress } = opts;
  const buf = await file.arrayBuffer();
  const doc = await (pdfjsLib as any).getDocument({ data: buf }).promise;
  const total = Math.min(doc.numPages, maxPages);

  const { default: TesseractWasmOcrService } = await import("./TesseractWasmOcrService");
  const service = TesseractWasmOcrService.getInstance();
  const ready = await service.initialize();
  if (!ready) throw new Error("OCR konnte nicht initialisiert werden.");
  // @ts-ignore – access internal client for direct image loading
  const client = (service as any).client;
  if (!client) throw new Error("OCR-Client nicht verfügbar.");

  const parts: string[] = [];
  for (let i = 1; i <= total; i++) {
    onProgress?.({ page: i, total });
    const page = await doc.getPage(i);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    await page.render({ canvasContext: ctx, viewport }).promise;
    const blob: Blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("toBlob failed"))), "image/jpeg", 0.9),
    );
    const bitmap = await createImageBitmap(blob);
    try {
      await client.loadImage(bitmap);
      const text: string = await client.getText();
      if (text) parts.push(text);
    } finally {
      bitmap.close?.();
      canvas.width = 0;
      canvas.height = 0;
    }
  }
  return parts.join("\n");
}

// ---------------------------------------------------------------------------
// Aargau eTax 2025 code → document mapping
// (AG abweicht von SSK/eCH-0119 — der Kanton darf das Musterformular
// anpassen, deshalb sind „Codes“ nicht 1:1 genormt.)
// ---------------------------------------------------------------------------

type Category = "income" | "assets" | "deductions";

interface CodeDef {
  code: number;
  category: Category;
  label: string;
}

const AG_CODES: CodeDef[] = [
  // ----- Einkünfte -----
  { code: 10,   category: "income", label: "Lohnausweis" },
  { code: 20,   category: "income", label: "Lohnausweis" },
  { code: 30,   category: "income", label: "Lohnausweis" },
  { code: 40,   category: "income", label: "Lohnausweis" },
  { code: 50,   category: "income", label: "Lohnausweis" },
  { code: 60,   category: "income", label: "Lohnausweis" },
  { code: 690,  category: "income", label: "Lohnausweis" },
  { code: 70,   category: "income", label: "Nachweis Selbständigerwerb" },
  { code: 90,   category: "income", label: "Nachweis Selbständigerwerb" },
  { code: 150,  category: "income", label: "Nachweis Selbständigerwerb" },
  { code: 160,  category: "income", label: "Nachweis Selbständigerwerb" },
  { code: 671,  category: "income", label: "Bestätigung Familien-/Mutterschaftszulagen" },
  { code: 672,  category: "income", label: "Bestätigung Familien-/Mutterschaftszulagen" },
  { code: 1701, category: "income", label: "Rentenbescheinigung (AHV/IV/PK)" },
  { code: 1901, category: "income", label: "Rentenbescheinigung (AHV/IV/PK)" },
  { code: 241,  category: "income", label: "Wertschriften-/Depotverzeichnis" },
  { code: 251,  category: "income", label: "Bestätigung Alimente/Unterhalt" },
  { code: 252,  category: "income", label: "Bestätigung Alimente/Unterhalt" },
  { code: 253,  category: "income", label: "Beleg übrige Einkünfte" },
  { code: 254,  category: "income", label: "Beleg übrige Einkünfte" },
  { code: 255,  category: "income", label: "Beleg übrige Einkünfte" },
  { code: 2701, category: "income", label: "Liegenschaftsertrag-Abrechnung" },
  { code: 2711, category: "income", label: "Liegenschaftsertrag-Abrechnung" },
  { code: 2741, category: "income", label: "Liegenschaftsertrag-Abrechnung" },
  { code: 2791, category: "income", label: "Liegenschaftsertrag-Abrechnung" },

  // ----- Abzüge -----
  { code: 3201, category: "deductions", label: "Berufsauslagen-Belege" },
  { code: 3401, category: "deductions", label: "Berufsauslagen-Belege" },
  { code: 310,  category: "deductions", label: "Schuldzinsen-Bescheinigung" },
  { code: 361,  category: "deductions", label: "Beleg Unterhaltszahlung" },
  { code: 362,  category: "deductions", label: "Beleg Unterhaltszahlung" },
  { code: 363,  category: "deductions", label: "Beleg Unterhaltszahlung" },
  { code: 371,  category: "deductions", label: "PK-Einkauf-Beleg" },
  { code: 372,  category: "deductions", label: "PK-Einkauf-Beleg" },
  { code: 381,  category: "deductions", label: "Säule 3a-Einzahlungsbestätigung" },
  { code: 382,  category: "deductions", label: "Säule 3a-Einzahlungsbestätigung" },
  { code: 383,  category: "deductions", label: "Krankenkassen-Prämienrechnung" },
  { code: 390,  category: "deductions", label: "Kinderbetreuungs-Beleg" },
  { code: 392,  category: "deductions", label: "Parteibeitrags-Beleg" },
  { code: 393,  category: "deductions", label: "Spendenbescheinigung" },
  { code: 243,  category: "deductions", label: "Beleg Vermögensverwaltungskosten" },
  { code: 650,  category: "deductions", label: "Belege Weiterbildungskosten" },
  { code: 655,  category: "deductions", label: "Belege Weiterbildungskosten" },
  { code: 397,  category: "deductions", label: "Belege Krankheits-/Unfallkosten" },
  { code: 387,  category: "deductions", label: "Beleg behinderungsbedingte Kosten" },
  { code: 2811, category: "deductions", label: "Beleg Liegenschaftsunterhalt" },
  { code: 2821, category: "deductions", label: "Beleg Liegenschaftsunterhalt" },

  // ----- Vermögen -----
  { code: 711,  category: "assets", label: "Depotauszug per 31.12." },
  { code: 713,  category: "assets", label: "Bankkontoauszug per 31.12." },
];

const AG_CODE_SET = new Set(AG_CODES.map((c) => c.code));
// Pure summary / helper codes that print between input fields but never
// carry a value the user fills in. Used to recognise an empty cell when
// the next visible token is just another code label.
const AG_HELPER_CODES = new Set<number>([
  1, 240, 242, 295, 300, 311, 312, 380, 384, 385, 386, 388, 389,
  391, 394, 395, 396, 398, 399, 401, 410, 411, 413, 414, 415,
  501, 502, 503, 504, 600, 601, 602, 700, 710, 712,
  2702, 2712, 2742, 2792, 2800, 2802, 2812, 2822,
  3202, 3402,
]);
const ALL_AG_CODES = new Set<number>([...AG_CODE_SET, ...AG_HELPER_CODES]);

function isCodeToken(str: string): number | null {
  // Exact short numeric token like "010", "241", "3201" — never a date or
  // amount, never a section number like "1.1".
  if (!/^\d{2,4}$/.test(str)) return null;
  const n = parseInt(str, 10);
  return ALL_AG_CODES.has(n) ? n : null;
}

function isValueToken(str: string): boolean {
  // A real Swiss money value: "111'606", "22'919", "3'360", "68", "33".
  // Must contain at least one digit and may contain ' . , but no letters.
  if (!/^[\d'.,\s]+$/.test(str)) return false;
  const digits = str.replace(/[^0-9]/g, "");
  if (!digits) return false;
  const n = parseInt(digits, 10);
  if (!Number.isFinite(n) || n <= 0) return false;
  // Reject tokens that are themselves a known AG code (likely the
  // adjacent code column having bled into the value position).
  if (str.length <= 4 && ALL_AG_CODES.has(n)) return false;
  return true;
}

/** Walk reconstructed rows and return the set of AG codes with a value. */
function findFilledCodesInRows(pages: Row[][]): Set<number> {
  const filled = new Set<number>();
  for (const rows of pages) {
    for (const row of rows) {
      for (let i = 0; i < row.cells.length; i++) {
        const code = isCodeToken(row.cells[i].str);
        if (code === null || !AG_CODE_SET.has(code)) continue;
        // Look for a value cell to the right on the same row.
        for (let j = i + 1; j < row.cells.length; j++) {
          const next = row.cells[j].str;
          // If the very next cell is another code, the current code is empty.
          if (isCodeToken(next) !== null) break;
          if (isValueToken(next)) {
            filled.add(code);
            break;
          }
        }
      }
    }
  }
  return filled;
}

function scanFromFilledCodes(filled: Set<number>): ExtractedScan {
  const seen: Record<Category, Set<string>> = {
    income: new Set(),
    assets: new Set(),
    deductions: new Set(),
  };
  for (const def of AG_CODES) {
    if (filled.has(def.code)) seen[def.category].add(def.label);
  }
  return {
    contact: [],
    income: [...seen.income].map((label) => ({ label })),
    assets: [...seen.assets].map((label) => ({ label })),
    deductions: [...seen.deductions].map((label) => ({ label })),
  };
}

/**
 * Main entry: extract a positional scan from a PDF File.
 * Returns ExtractedScan based on visually adjacent code + value cells.
 */
export async function extractScanFromPdf(file: File): Promise<ExtractedScan> {
  const pages = await extractRowsFromPdf(file);
  const filled = findFilledCodesInRows(pages);
  return scanFromFilledCodes(filled);
}

// ---------------------------------------------------------------------------
// Line-based fallback for OCR text (no coordinates available)
// ---------------------------------------------------------------------------

/** Line-based scan used when only OCR text is available. */
export function extractItemsFromText(text: string): ExtractedScan {
  const filled = new Set<number>();
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const tokens = line.split(/\s+/);
    if (tokens.length < 2) continue;
    // We only accept the typical layout "... <code> <value>" at the end of
    // the visual line. This avoids matching prose such as
    // "Summe der Ziffern 30 bis 32 ... 701 24'448".
    const last = tokens[tokens.length - 1];
    const prev = tokens[tokens.length - 2];
    if (!isValueToken(last)) continue;
    const code = isCodeToken(prev);
    if (code === null || !AG_CODE_SET.has(code)) continue;
    filled.add(code);
  }
  return scanFromFilledCodes(filled);
}


/**
 * Remove personally identifiable information so the text can be sent to
 * an external LLM as a fallback without leaking identity.
 */
export function pseudonymize(text: string): string {
  return text
    .replace(/\b756[.\s]\d{4}[.\s]\d{4}[.\s]\d{2}\b/g, "[AHV]")
    .replace(/\bCH\d{2}\s?(?:\d{4}\s?){4}\d{1,4}\b/gi, "[IBAN]")
    .replace(/\b\d{1,2}\.\d{1,2}\.(?:19|20)\d{2}\b/g, "[DATUM]")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]")
    .replace(/\+?41[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g, "[TEL]")
    .replace(/\b\d{4}\s+[A-ZÄÖÜ][a-zäöü\-]+\b/g, "[ORT]")
    .replace(/\b[A-ZÄÖÜ][a-zäöü\-]+(?:strasse|str\.|gasse|weg|platz|allee)\s*\d+[a-z]?/gi, "[ADRESSE]");
}

/** True if the extractor found enough positions to skip AI fallback. */
export function isLocalResultSufficient(scan: ExtractedScan): boolean {
  const total = scan.income.length + scan.assets.length + scan.deductions.length;
  return total >= 3 && scan.income.length >= 1;
}
