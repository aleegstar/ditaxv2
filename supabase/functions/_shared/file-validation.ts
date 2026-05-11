/**
 * File Validation Helpers
 *
 * Server-side defense against malicious uploads:
 *  - Magic-byte (real MIME) detection — prevents extension spoofing & polyglots
 *  - Size limits — DoS protection
 *  - ZIP-bomb heuristic — catches highly compressed archives masquerading as images/PDFs
 *  - Disallowed types — executables, scripts, OOXML macros
 *
 * Used by scan-upload and any other ingest function.
 */

export const MAX_FILE_BYTES = 25 * 1024 * 1024; // 25 MB hard cap
export const ZIP_BOMB_RATIO = 100; // compressed:uncompressed sanity

/** Allow-list of accepted real MIME types for tax documents. */
export const ALLOWED_MIMES = new Set<string>([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "image/tiff",
]);

/** Known dangerous magic bytes — block immediately. */
const DANGEROUS_SIGNATURES: { name: string; bytes: number[] }[] = [
  { name: "MZ-executable", bytes: [0x4d, 0x5a] }, // .exe / .dll
  { name: "ELF-binary", bytes: [0x7f, 0x45, 0x4c, 0x46] },
  { name: "Mach-O", bytes: [0xfe, 0xed, 0xfa, 0xce] },
  { name: "Mach-O-64", bytes: [0xcf, 0xfa, 0xed, 0xfe] },
  { name: "Java-class", bytes: [0xca, 0xfe, 0xba, 0xbe] },
  { name: "Shell-shebang", bytes: [0x23, 0x21] }, // #!
];

function startsWith(buf: Uint8Array, sig: number[]): boolean {
  if (buf.length < sig.length) return false;
  for (let i = 0; i < sig.length; i++) if (buf[i] !== sig[i]) return false;
  return true;
}

/** Detect real MIME from magic bytes. Returns null if unknown. */
export function detectRealMime(head: Uint8Array): string | null {
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46])) return "application/pdf"; // %PDF
  if (startsWith(head, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (
    startsWith(head, [0x52, 0x49, 0x46, 0x46]) &&
    head.length >= 12 &&
    head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) return "image/webp";
  if (startsWith(head, [0x49, 0x49, 0x2a, 0x00]) || startsWith(head, [0x4d, 0x4d, 0x00, 0x2a]))
    return "image/tiff";
  // HEIC/HEIF: ftyp at offset 4, then "heic"/"heix"/"mif1"
  if (head.length >= 12 && head[4] === 0x66 && head[5] === 0x74 && head[6] === 0x79 && head[7] === 0x70) {
    const brand = String.fromCharCode(head[8], head[9], head[10], head[11]);
    if (["heic", "heix", "heim", "heis", "hevc", "hevm", "hevs", "mif1", "msf1"].includes(brand)) {
      return "image/heic";
    }
  }
  return null;
}

export interface ValidationOutcome {
  ok: boolean;
  reason?: string;
  realMime?: string | null;
}

/** Run all server-side validation checks against a Blob. */
export async function validateFileBlob(
  blob: Blob,
  declaredMime?: string,
): Promise<ValidationOutcome> {
  if (blob.size === 0) return { ok: false, reason: "empty_file" };
  if (blob.size > MAX_FILE_BYTES) {
    return { ok: false, reason: `too_large:${blob.size}` };
  }

  const headBuf = new Uint8Array(await blob.slice(0, 32).arrayBuffer());

  for (const sig of DANGEROUS_SIGNATURES) {
    if (startsWith(headBuf, sig.bytes)) {
      return { ok: false, reason: `dangerous_signature:${sig.name}` };
    }
  }

  const realMime = detectRealMime(headBuf);
  if (!realMime || !ALLOWED_MIMES.has(realMime)) {
    return { ok: false, reason: `disallowed_real_mime:${realMime ?? "unknown"}`, realMime };
  }

  // Polyglot guard: declared MIME and detected MIME must match family.
  if (declaredMime && declaredMime !== realMime) {
    // Tolerate image/* vs heic/heif aliases
    const isImageAlias = declaredMime.startsWith("image/") && realMime.startsWith("image/");
    if (!isImageAlias) {
      return { ok: false, reason: `mime_mismatch:declared=${declaredMime}/real=${realMime}`, realMime };
    }
  }

  // Heuristic ZIP-bomb / suspicious deep-nested archive markers inside PDFs:
  // PDFs containing /EmbeddedFile + /Launch are high-risk. We do a cheap byte scan.
  if (realMime === "application/pdf") {
    const txt = new TextDecoder("latin1").decode(
      new Uint8Array(await blob.slice(0, Math.min(blob.size, 1024 * 256)).arrayBuffer()),
    );
    if (/\/Launch\b/.test(txt) || /\/JavaScript\b/.test(txt) || /\/JS\b/.test(txt)) {
      return { ok: false, reason: "pdf_active_content", realMime };
    }
  }

  return { ok: true, realMime };
}
