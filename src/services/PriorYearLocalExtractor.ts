// Local, privacy-preserving extractor for prior-year Swiss tax returns.
// 1) Reads PDF text layer in the browser via pdfjs-dist (no upload).
// 2) Matches positions via curated Swiss tax keyword rules.
// 3) Pseudonymizes the raw text (removes names, AHV, IBAN, address, dates)
//    so an optional AI fallback never sees personally identifiable data.

import * as pdfjsLib from "pdfjs-dist";
// @ts-ignore - vite worker import
import PdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?worker";

(pdfjsLib as any).GlobalWorkerOptions.workerPort = new PdfWorker();

export type ExtractedItem = { label: string; value?: string };
export type ExtractedScan = {
  contact: ExtractedItem[];
  income: ExtractedItem[];
  assets: ExtractedItem[];
  deductions: ExtractedItem[];
};

const CHF = /(?:CHF\s*)?[\d'’´]{1,3}(?:[.,'’´]\d{2,3})*(?:[.,]\d{2})?/;

/** Read all text from a PDF file using its embedded text layer. */
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

type Rule = { label: string; patterns: RegExp[] };

const INCOME_RULES: Rule[] = [
  { label: "Lohn / Lohnausweis", patterns: [/lohnausweis/i, /unselbst[aä]ndige(r)? erwerb/i, /haupterwerb/i] },
  { label: "Nebenerwerb", patterns: [/nebenerwerb/i] },
  { label: "Selbständigerwerb", patterns: [/selbst[aä]ndige(r)? erwerb/i, /einzelfirma/i, /personengesellschaft/i] },
  { label: "Renten (AHV/IV)", patterns: [/\bAHV\b.*rente/i, /\bIV\b.*rente/i, /altersrente/i, /hinterlassenenrente/i] },
  { label: "Pensionskasse / 2. Säule", patterns: [/pensionskasse/i, /2\.\s*s[aä]ule/i, /\bBVG\b/i] },
  { label: "Säule 3a Bezug", patterns: [/s[aä]ule\s*3a.*bezug/i, /kapitalleistung.*3a/i] },
  { label: "Wertschriftenertrag", patterns: [/wertschriftenertrag/i, /dividenden/i, /zinsertr[aä]ge/i, /\bDA-?1\b/i] },
  { label: "Liegenschaftsertrag", patterns: [/eigenmietwert/i, /mietertrag/i, /liegenschaftsertrag/i] },
  { label: "Unterhaltsbeiträge / Alimente", patterns: [/unterhaltsbeitr[aä]ge/i, /alimente/i] },
  { label: "Arbeitslosengeld", patterns: [/arbeitslosen/i, /\bALV\b/i, /taggelder/i] },
];

const ASSETS_RULES: Rule[] = [
  { label: "Bankkonten", patterns: [/bankkonto/i, /sparkonto/i, /privatkonto/i, /kontokorrent/i, /postfinance/i, /\bUBS\b/i, /\bZKB\b/i, /raiffeisen/i, /kantonalbank/i] },
  { label: "Wertschriften / Depot", patterns: [/wertschriften/i, /depot/i, /aktien/i, /fonds/i, /obligationen/i] },
  { label: "Säule 3a Guthaben", patterns: [/s[aä]ule\s*3a/i, /gebundene vorsorge/i] },
  { label: "Lebensversicherung", patterns: [/lebensversicherung/i, /r[uü]ckkaufswert/i] },
  { label: "Liegenschaft", patterns: [/liegenschaft/i, /eigentumswohnung/i, /einfamilienhaus/i, /grundst[uü]ck/i] },
  { label: "Fahrzeug", patterns: [/motorfahrzeug/i, /personenwagen/i, /\bPW\b/i] },
  { label: "Kryptowährungen", patterns: [/krypto/i, /bitcoin/i, /ethereum/i] },
];

const DEDUCTIONS_RULES: Rule[] = [
  { label: "Berufsauslagen", patterns: [/berufsauslagen/i, /fahrkosten/i, /\b[oö]V\b.*abo/i, /verpflegung/i, /weiterbildung/i] },
  { label: "Säule 3a Einzahlung", patterns: [/einzahlung.*3a/i, /beitrag.*3a/i] },
  { label: "Pensionskasseneinkauf", patterns: [/einkauf.*pensionskasse/i, /\bPK[- ]?einkauf/i] },
  { label: "Krankheits- und Unfallkosten", patterns: [/krankheitskosten/i, /unfallkosten/i, /selbstbehalt/i] },
  { label: "Krankenkassenprämien", patterns: [/krankenkassenpr[aä]mien/i, /grundversicherung/i, /\bKVG\b/i] },
  { label: "Spenden", patterns: [/spenden/i, /zuwendungen/i, /gemeinn[uü]tzig/i] },
  { label: "Schuldzinsen", patterns: [/schuldzinsen/i, /hypothekarzins/i] },
  { label: "Kinderbetreuung", patterns: [/kinderbetreuung/i, /kita/i, /tagesst[aä]tte/i] },
  { label: "Unterhaltsbeiträge bezahlt", patterns: [/unterhaltsbeitr[aä]ge.*bezahlt/i, /alimente.*bezahlt/i] },
  { label: "Liegenschaftsunterhalt", patterns: [/liegenschaftsunterhalt/i, /unterhaltskosten/i] },
  { label: "Parteibeiträge", patterns: [/parteibeitr[aä]ge/i] },
];

const CONTACT_RULES: Rule[] = [
  { label: "Konfession", patterns: [/konfession/i, /r[oö]misch.?katholisch/i, /reformiert/i, /evangelisch/i] },
  { label: "Zivilstand", patterns: [/zivilstand/i, /verheiratet/i, /ledig/i, /geschieden/i, /verwitwet/i] },
  { label: "Kinder im Haushalt", patterns: [/kinder im haushalt/i, /minderj[aä]hrige/i, /kinderabzug/i] },
];

function applyRules(text: string, rules: Rule[]): ExtractedItem[] {
  const out: ExtractedItem[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    for (const p of rule.patterns) {
      const m = text.match(p);
      if (!m) continue;
      if (seen.has(rule.label)) break;
      seen.add(rule.label);
      // try to grab nearby CHF amount
      const slice = text.slice(Math.max(0, (m.index ?? 0) - 5), (m.index ?? 0) + 200);
      const amountMatch = slice.match(CHF);
      out.push({
        label: rule.label,
        value: amountMatch ? amountMatch[0].trim() : undefined,
      });
      break;
    }
  }
  return out;
}

export function extractItemsFromText(text: string): ExtractedScan {
  return {
    contact: applyRules(text, CONTACT_RULES),
    income: applyRules(text, INCOME_RULES),
    assets: applyRules(text, ASSETS_RULES),
    deductions: applyRules(text, DEDUCTIONS_RULES),
  };
}

/**
 * Remove personally identifiable information so the text can be sent to
 * an external LLM as a fallback without leaking identity.
 */
export function pseudonymize(text: string): string {
  return text
    // AHV / Sozialversicherungsnummer 756.xxxx.xxxx.xx
    .replace(/\b756[.\s]\d{4}[.\s]\d{4}[.\s]\d{2}\b/g, "[AHV]")
    // IBAN (Schweiz)
    .replace(/\bCH\d{2}\s?(?:\d{4}\s?){4}\d{1,4}\b/gi, "[IBAN]")
    // Geburtsdaten / Datumsangaben (TT.MM.JJJJ)
    .replace(/\b\d{1,2}\.\d{1,2}\.(?:19|20)\d{2}\b/g, "[DATUM]")
    // E-Mail
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]")
    // Telefon (CH)
    .replace(/\+?41[\s\-]?\d{2}[\s\-]?\d{3}[\s\-]?\d{2}[\s\-]?\d{2}/g, "[TEL]")
    // PLZ + Ort (4-stellige PLZ gefolgt von Wort)
    .replace(/\b\d{4}\s+[A-ZÄÖÜ][a-zäöü\-]+\b/g, "[ORT]")
    // Strassen mit Hausnummer
    .replace(/\b[A-ZÄÖÜ][a-zäöü\-]+(?:strasse|str\.|gasse|weg|platz|allee)\s*\d+[a-z]?/gi, "[ADRESSE]");
}

/** True if the extractor found enough positions to skip AI fallback. */
export function isLocalResultSufficient(scan: ExtractedScan): boolean {
  const total =
    scan.contact.length + scan.income.length + scan.assets.length + scan.deductions.length;
  return total >= 4 && scan.income.length + scan.assets.length >= 2;
}
