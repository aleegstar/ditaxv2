/**
 * Deterministic store-only ZIP writer (zero deps).
 *
 * Producing a `.etax.zip` reproducibly requires:
 *  - method = 0 (STORE) so byte output is purely content-derived.
 *  - entries sorted by name.
 *  - fixed DOS mtime/mdate derived from a caller-provided ISO timestamp.
 *  - no extra fields, no Unicode flag drift (we set bit 11 = UTF-8 always).
 *  - CRC32 computed from the file bytes.
 *
 * Spec reference: PKWARE APPNOTE.TXT v6.3.10, sections 4.3.6–4.4 and 4.4.10.
 */

export interface ZipEntry {
  /** Path inside the archive. Forward slashes only. */
  name: string;
  bytes: Uint8Array;
}

const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]) & 0xff];
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(iso: string): { date: number; time: number } {
  // Treat input as UTC for deterministic output regardless of host TZ.
  const d = new Date(iso);
  if (isNaN(d.getTime())) throw new Error(`Invalid generated_at: ${iso}`);
  // DOS time: bits 0–4 sec/2, 5–10 min, 11–15 hour. Year >= 1980.
  const yr = d.getUTCFullYear();
  if (yr < 1980) throw new Error('ZIP DOS time requires year ≥ 1980');
  const date = (((yr - 1980) & 0x7f) << 9) | (((d.getUTCMonth() + 1) & 0xf) << 5) | (d.getUTCDate() & 0x1f);
  const time = ((d.getUTCHours() & 0x1f) << 11) | ((d.getUTCMinutes() & 0x3f) << 5) | ((d.getUTCSeconds() >> 1) & 0x1f);
  return { date, time };
}

function u16(v: number): Uint8Array { return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]); }
function u32(v: number): Uint8Array { return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]); }
function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((a, p) => a + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export interface BuildZipOptions {
  /** Deterministic timestamp; controls all entry mtimes. */
  generatedAt: string;
}

export function buildDeterministicZip(entries: ZipEntry[], opts: BuildZipOptions): Uint8Array {
  const { date, time } = dosDateTime(opts.generatedAt);
  const sorted = [...entries].sort((a, b) => a.name.localeCompare(b.name));
  const enc = new TextEncoder();

  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of sorted) {
    const nameBytes = enc.encode(entry.name);
    const crc = crc32(entry.bytes);
    const size = entry.bytes.length;

    // Local file header
    const lfh = concat([
      u32(0x04034b50),
      u16(20),                 // version needed
      u16(0x0800),             // general purpose: bit 11 = UTF-8 names
      u16(0),                  // method: 0 = stored
      u16(time), u16(date),
      u32(crc),
      u32(size),               // compressed size
      u32(size),               // uncompressed size
      u16(nameBytes.length),
      u16(0),                  // extra length
      nameBytes,
      entry.bytes,
    ]);
    localParts.push(lfh);

    // Central directory header
    const cdh = concat([
      u32(0x02014b50),
      u16(20), u16(20),
      u16(0x0800), u16(0),
      u16(time), u16(date),
      u32(crc), u32(size), u32(size),
      u16(nameBytes.length),
      u16(0),                  // extra
      u16(0),                  // comment
      u16(0),                  // disk number
      u16(0),                  // internal attrs
      u32(0),                  // external attrs
      u32(offset),             // local header offset
      nameBytes,
    ]);
    centralParts.push(cdh);

    offset += lfh.length;
  }

  const localBlob = concat(localParts);
  const centralBlob = concat(centralParts);
  const eocd = concat([
    u32(0x06054b50),
    u16(0), u16(0),
    u16(sorted.length), u16(sorted.length),
    u32(centralBlob.length),
    u32(localBlob.length),
    u16(0),                    // comment length
  ]);

  return concat([localBlob, centralBlob, eocd]);
}
