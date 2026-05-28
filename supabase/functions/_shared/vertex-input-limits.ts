// Vertex AI Input-Limits (Hardening)
//
// Schutz vor Resource-Exhaustion / Kosten-Abuse durch übergrosse Uploads.
// Wird VOR jedem Vertex-AI-Call aufgerufen.
//
//  - MAX_PDF_BYTES:   20 MB Gesamt-Upload
//  - MAX_PDF_PAGES:   80 Seiten pro PDF
//  - Bildanteil:      identisch begrenzt auf 20 MB (Gemini-Limit pro Inline-Part)

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const MAX_PDF_PAGES = 80;

export class VertexInputLimitError extends Error {
  constructor(
    public code:
      | "file_too_large"
      | "too_many_pages"
      | "invalid_pdf",
    message: string,
    public status = 413,
    public details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/**
 * Zählt PDF-Seiten anhand der `/Type /Page` Marker im Rohbyte-Strom.
 * Schnell, ohne externe Dependency. Toleriert Whitespace zwischen Schlüssel/Wert.
 */
export function countPdfPages(bytes: Uint8Array): number {
  // Header check
  if (
    bytes.length < 5 ||
    bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46
  ) {
    throw new VertexInputLimitError("invalid_pdf", "Datei ist kein gültiges PDF", 415);
  }

  // latin1 reicht für PDF-Syntax
  const txt = new TextDecoder("latin1").decode(bytes);

  // /Type /Page  (aber NICHT /Pages) – Whitespace tolerant
  const pageRe = /\/Type\s*\/Page(?![s\w])/g;
  let pages = 0;
  while (pageRe.exec(txt) !== null) pages++;

  // Fallback: /Count im /Pages-Root nutzen, falls Heuristik 0 liefert
  if (pages === 0) {
    const m = txt.match(/\/Type\s*\/Pages[^>]*\/Count\s+(\d+)/);
    if (m) pages = parseInt(m[1], 10) || 0;
  }
  return pages;
}

/**
 * Validiert Bytes vor dem Vertex-Call.
 * Wirft `VertexInputLimitError`, wenn Limits verletzt sind.
 */
export function enforceVertexInputLimits(
  bytes: Uint8Array,
  mimeType: string,
): void {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) {
    throw new VertexInputLimitError(
      "file_too_large",
      `Datei zu gross (max ${MAX_UPLOAD_BYTES / 1024 / 1024} MB)`,
      413,
      { size: bytes.byteLength, max: MAX_UPLOAD_BYTES },
    );
  }
  if (mimeType === "application/pdf") {
    const pages = countPdfPages(bytes);
    if (pages > MAX_PDF_PAGES) {
      throw new VertexInputLimitError(
        "too_many_pages",
        `PDF hat zu viele Seiten (${pages}/${MAX_PDF_PAGES})`,
        413,
        { pages, max: MAX_PDF_PAGES },
      );
    }
  }
}
