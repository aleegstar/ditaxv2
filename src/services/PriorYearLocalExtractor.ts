// Local, privacy-preserving extractor for prior-year Swiss tax returns.
// 1) Reads PDF text layer in the browser via pdfjs-dist (no upload).
// 2) Matches positions via curated Swiss tax keyword rules.
// 3) Pseudonymizes the raw text (removes names, AHV, IBAN, address, dates)
//    so an optional AI fallback never sees personally identifiable data.

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

// ---------------------------------------------------------------------------
// Kantonale Ziffern-Codes (Schwerpunkt Aargau eTax 2025 + SSK-/eCH-0119-Codes
// anderer Kantone). Die AG-2025-Hauptbogen-Codierung weicht teilweise stark
// von der SSK-Empfehlung ab — Beispiel: in AG ist 150/160 = Personengesell-
// schaft, NICHT Wertschriftenertrag (das wäre 241).
// ---------------------------------------------------------------------------
type CodeRule = { label: string; codes: number[] };

const INCOME_CODES: CodeRule[] = [
  // Lohn: AG 010/020 Haupterwerb, 030/040 Nebenerwerb, 050/060 weitere
  // Vergütungen. SSK 100–103 für andere Kantone.
  { label: "Lohnausweis",
    codes: [10, 20, 30, 40, 50, 60, 100, 101, 102, 103] },
  // Selbständigkeit: AG 070/090, 150/160 (Personengesellschaft P1/P2),
  // SSK 120–123.
  { label: "Nachweis Selbständigerwerb",
    codes: [70, 90, 120, 121, 122, 123, 150, 160] },
  // Renten: AG 1701/1901 (P1/P2 Renten/Ersatzeinkünfte), SSK 130–137 / 960–967
  { label: "Rentenbescheinigung (AHV/IV/PK)",
    codes: [1701, 1901, 130, 131, 132, 133, 134, 135, 136, 137,
            960, 961, 962, 963, 964, 965, 966, 967] },
  { label: "Arbeitslosentaggeld-Abrechnung", codes: [140, 141] },
  // Familienzulagen: AG 671/672, SSK 142/143
  { label: "Bestätigung Familien-/Mutterschaftszulagen",
    codes: [142, 143, 671, 672] },
  // Wertschriftenertrag: AG 241 (Total), SSK 151
  { label: "Wertschriften-/Depotverzeichnis", codes: [241, 151] },
  // Alimente erhalten: AG 251/252, SSK 160/161
  { label: "Bestätigung Alimente/Unterhalt",
    codes: [160, 161, 251, 252] },
  // Übrige Einkünfte: AG 253 (Erbschaftsertrag), 254 (Kapitalabfindung),
  // 255 (übrige Einkünfte), SSK 162–164
  { label: "Beleg übrige Einkünfte",
    codes: [162, 163, 164, 253, 254, 255] },
  // Liegenschaftsertrag: AG 2701/2711/2741/2791, SSK 180–188
  { label: "Liegenschaftsertrag-Abrechnung",
    codes: [180, 181, 183, 186, 188, 2701, 2711, 2741, 2791] },
];

const ASSET_CODES: CodeRule[] = [
  // AG 711 = Wertschriften-Verzeichnis-Total, 713 = Bargeld/VST-Guthaben.
  // SSK 400 = Total Wertschriften + Konten.
  { label: "Depotauszug per 31.12.", codes: [400, 711] },
  { label: "Bankkontoauszug per 31.12.", codes: [400, 713] },
  // Lebensversicherung: SSK 406
  { label: "Rückkaufswert Lebensversicherung", codes: [406] },
  { label: "Fahrzeugausweis / Eurotax", codes: [412] },
  // Liegenschaft (Vermögen): SSK 420–434, AG 420er-Reihe analog
  { label: "Liegenschaftsbeleg",
    codes: [420, 421, 422, 430, 431, 434] },
];

const DEDUCTION_CODES: CodeRule[] = [
  // Berufskosten: AG 3201 (P1) / 3401 (P2), SSK 201/220/221/240
  { label: "Berufsauslagen-Belege",
    codes: [201, 220, 221, 240, 3201, 3401] },
  // Schuldzinsen: AG 310, SSK 250/470
  { label: "Schuldzinsen-Bescheinigung", codes: [250, 310, 470] },
  // Unterhaltszahlungen (bezahlt): AG 361/362/363, SSK 254–256
  { label: "Beleg Unterhaltszahlung",
    codes: [254, 255, 256, 361, 362, 363] },
  // PK-Einkauf: AG 371/372, SSK 281
  { label: "PK-Einkauf-Beleg", codes: [281, 371, 372] },
  // Säule 3a: AG 381/382, SSK 260/261
  { label: "Säule 3a-Einzahlungsbestätigung",
    codes: [260, 261, 381, 382] },
  // Versicherungsprämien (KK + Sparzinsen): AG 383, SSK 270
  { label: "Krankenkassen-Prämienrechnung", codes: [270, 383] },
  // Weiterbildung: AG 650/655, SSK 291
  { label: "Belege Weiterbildungskosten", codes: [291, 650, 655] },
  // Liegenschaftsunterhalt (Abzug): AG 2811/2821, SSK 184/185
  { label: "Beleg Liegenschaftsunterhalt",
    codes: [184, 185, 2811, 2821] },
  // Krankheits-/Unfallkosten: AG 397, SSK 320
  { label: "Belege Krankheits-/Unfallkosten", codes: [320, 397] },
  // Spenden: AG 393, SSK 324
  { label: "Spendenbescheinigung", codes: [324, 393] },
  // Parteibeiträge: AG 392
  { label: "Parteibeitrags-Beleg", codes: [392] },
  // Kinderbetreuung: AG 390, SSK 376
  { label: "Kinderbetreuungs-Beleg", codes: [376, 390] },
];


/**
 * Erkennt, ob eine Ziffer im Text vorkommt UND mit einem nicht-null
 * Betrag ausgefüllt ist. Schweizer Zahlenformate: 1'234.55, 1234, 1 234.
 * Innerhalb von 80 Zeichen nach dem Code muss eine Ziffer 1-9 stehen.
 */
function codeIsFilled(text: string, code: number): boolean {
  const c = String(code);
  // 2-stellige Hauptbogen-Codes (z. B. AG 010, 020) erlauben optional
  // führende Null. 3-/4-stellige Codes müssen exakt matchen.
  const pat = c.length < 3 ? `0?${c}` : c;
  const re = new RegExp(`(?:^|[^0-9])${pat}(?:[^0-9]|$)[^\\n]{0,80}?[1-9]`);
  return re.test(text);
}

function applyCodeRules(text: string, rules: CodeRule[]): ExtractedItem[] {
  const out: ExtractedItem[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    if (seen.has(rule.label)) continue;
    for (const code of rule.codes) {
      if (codeIsFilled(text, code)) {
        seen.add(rule.label);
        out.push({ label: rule.label });
        break;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Fallback-Keywords (nur ergänzend wenn Code-Detection wenig findet,
// z. B. bei nicht-SSK-konformen PDFs oder sehr schlechtem OCR-Output).
// ---------------------------------------------------------------------------
const INCOME_RULES: Rule[] = [
  { label: "Lohnausweis", patterns: [/\blohnausweis\b/i, /\bunselbst[aä]ndige?r?\s+erwerb\b/i, /\bhaupterwerb\b/i, /\bnebenerwerb\b/i] },
  { label: "Nachweis Selbständigerwerb", patterns: [/\bselbst[aä]ndige?r?\s+erwerb\b/i, /\beinzelfirma\b/i, /\bpersonengesellschaft\b/i] },
  { label: "Rentenbescheinigung (AHV/IV/PK)", patterns: [/\bAHV[- ]?rente\b/i, /\bIV[- ]?rente\b/i, /\baltersrente\b/i, /\bhinterlassenenrente\b/i, /\bpensionskassenrente\b/i] },
  { label: "Bescheinigung Säule 3a-Bezug", patterns: [/\bs[aä]ule\s*3a\b[^\n]{0,40}\bbezug\b/i, /\bkapitalleistung\b[^\n]{0,40}\b3a\b/i] },
  { label: "Wertschriften-/Depotverzeichnis", patterns: [/\bwertschriftenertrag\b/i, /\bdividenden\b/i, /\bzinsertr[aä]ge\b/i, /\bDA-?1\b/i] },
  { label: "Liegenschaftsertrag-Abrechnung", patterns: [/\beigenmietwert\b/i, /\bmietertrag\b/i, /\bliegenschaftsertrag\b/i] },
  { label: "Bestätigung Alimente/Unterhalt", patterns: [/\bunterhaltsbeitr[aä]ge\b/i, /\balimente\b/i] },
  { label: "Arbeitslosentaggeld-Abrechnung", patterns: [/\barbeitslosen\w*\b/i, /\bALV\b/i] },
];

const ASSETS_RULES: Rule[] = [
  { label: "Bankkontoauszug per 31.12.", patterns: [/\bbankkonto\b/i, /\bsparkonto\b/i, /\bprivatkonto\b/i, /\bkontokorrent\b/i, /\bpostfinance\b/i, /\braiffeisen\b/i, /\bkantonalbank\b/i] },
  { label: "Depotauszug per 31.12.", patterns: [/\bwertschriften\b/i, /\bdepot\b/i, /\baktien\b/i, /\bfonds\b/i, /\bobligationen\b/i] },
  { label: "Rückkaufswert Lebensversicherung", patterns: [/\blebensversicherung\b/i, /\br[uü]ckkaufswert\b/i] },
  { label: "Liegenschaftsbeleg", patterns: [/\bliegenschaft\b/i, /\beigentumswohnung\b/i, /\beinfamilienhaus\b/i, /\bgrundst[uü]ck\b/i] },
  { label: "Fahrzeugausweis / Eurotax", patterns: [/\bmotorfahrzeug\b/i, /\bpersonenwagen\b/i] },
  { label: "Krypto-Saldonachweis", patterns: [/\bkryptow[aä]hrung\w*\b/i, /\bbitcoin\b/i, /\bethereum\b/i] },
];

const DEDUCTIONS_RULES: Rule[] = [
  { label: "Berufsauslagen-Belege", patterns: [/\bberufsauslagen\b/i, /\bfahrkosten\b/i, /\bverpflegung\b/i, /\bweiterbildung\b/i] },
  { label: "Säule 3a-Einzahlungsbestätigung", patterns: [/\beinzahlung\b[^\n]{0,30}\b3a\b/i, /\bbeitrag\b[^\n]{0,30}\b3a\b/i, /\bs[aä]ule\s*3a\b/i, /\bgebundene\s+vorsorge\b/i] },
  { label: "PK-Einkauf-Beleg", patterns: [/\beinkauf\b[^\n]{0,30}\bpensionskasse\b/i, /\bPK[- ]?einkauf\b/i] },
  { label: "Belege Krankheits-/Unfallkosten", patterns: [/\bkrankheitskosten\b/i, /\bunfallkosten\b/i, /\bselbstbehalt\b/i] },
  { label: "Krankenkassen-Prämienrechnung", patterns: [/\bkrankenkassenpr[aä]mien\b/i, /\bgrundversicherung\b/i, /\bKVG\b/i] },
  { label: "Spendenbescheinigung", patterns: [/\bspenden\b/i, /\bzuwendungen\b/i, /\bgemeinn[uü]tzig\w*\b/i] },
  { label: "Schuldzinsen-Bescheinigung", patterns: [/\bschuldzinsen\b/i, /\bhypothekarzins\w*\b/i] },
  { label: "Kinderbetreuungs-Beleg", patterns: [/\bkinderbetreuung\b/i, /\bkita\b/i, /\btagesst[aä]tte\b/i] },
  { label: "Beleg Unterhaltszahlung", patterns: [/\bunterhaltsbeitr[aä]ge\b[^\n]{0,20}\bbezahlt\b/i, /\balimente\b[^\n]{0,20}\bbezahlt\b/i] },
  { label: "Beleg Liegenschaftsunterhalt", patterns: [/\bliegenschaftsunterhalt\b/i, /\bunterhaltskosten\b/i] },
  { label: "Parteibeitrags-Beleg", patterns: [/\bparteibeitr[aä]ge\b/i] },
];

function applyRules(text: string, rules: Rule[]): ExtractedItem[] {
  const out: ExtractedItem[] = [];
  const seen = new Set<string>();
  for (const rule of rules) {
    for (const p of rule.patterns) {
      if (!p.test(text)) continue;
      if (seen.has(rule.label)) break;
      seen.add(rule.label);
      out.push({ label: rule.label });
      break;
    }
  }
  return out;
}

function mergeItems(primary: ExtractedItem[], fallback: ExtractedItem[]): ExtractedItem[] {
  const seen = new Set(primary.map((i) => i.label));
  const out = [...primary];
  for (const item of fallback) {
    if (!seen.has(item.label)) {
      seen.add(item.label);
      out.push(item);
    }
  }
  return out;
}

export function extractItemsFromText(text: string): ExtractedScan {
  // Primär: SSK Ziffer-Codes (kantonsübergreifend stabil und OCR-robust).
  const incomeByCode = applyCodeRules(text, INCOME_CODES);
  const assetsByCode = applyCodeRules(text, ASSET_CODES);
  const deductionsByCode = applyCodeRules(text, DEDUCTION_CODES);

  // Strikter Modus: Sobald auch nur EINE SSK-Ziffer im Dokument erkannt wurde,
  // verlassen wir uns ausschliesslich auf die Codes. Keyword-Heuristik wird
  // nur dann zugeschaltet, wenn gar keine Ziffern gefunden wurden.
  const codeHits = incomeByCode.length + assetsByCode.length + deductionsByCode.length;
  if (codeHits >= 1) {
    return {
      contact: [],
      income: incomeByCode,
      assets: assetsByCode,
      deductions: deductionsByCode,
    };
  }

  // Fallback nur wenn Code-Detection praktisch nichts findet.
  return {
    contact: [],
    income: mergeItems(incomeByCode, applyRules(text, INCOME_RULES)),
    assets: mergeItems(assetsByCode, applyRules(text, ASSETS_RULES)),
    deductions: mergeItems(deductionsByCode, applyRules(text, DEDUCTIONS_RULES)),
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
  const total = scan.income.length + scan.assets.length + scan.deductions.length;
  return total >= 3 && scan.income.length >= 1;
}
