/**
 * Pure-JS ZIP reader. Supports method 0 (store) and method 8 (deflate via the
 * browser's `DecompressionStream`). Reads via the central directory, so it
 * tolerates extra fields and zip64 absent. Dev-only.
 */

export interface ZipEntryRead {
  name: string;
  size: number;
  compressedSize: number;
  method: number;
  bytes: Uint8Array;
}

const td = new TextDecoder('utf-8', { fatal: false });

function u16(view: DataView, o: number) { return view.getUint16(o, true); }
function u32(view: DataView, o: number) { return view.getUint32(o, true); }

async function inflate(input: Uint8Array): Promise<Uint8Array> {
  // Wrap raw deflate in a DecompressionStream('deflate-raw').
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Response(new Blob([input as BlobPart]).stream().pipeThrough(ds));
  const buf = await stream.arrayBuffer();
  return new Uint8Array(buf);
}

export async function readZip(zip: Uint8Array): Promise<ZipEntryRead[]> {
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);

  // Locate End-of-Central-Directory (EOCD) signature 0x06054b50, scan from end.
  let eocd = -1;
  const max = Math.min(zip.length - 22, 65557);
  for (let i = zip.length - 22; i >= zip.length - 22 - max && i >= 0; i--) {
    if (u32(view, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd === -1) throw new Error('ZIP: EOCD not found');

  const entryCount = u16(view, eocd + 10);
  const cdSize = u32(view, eocd + 12);
  const cdOffset = u32(view, eocd + 16);

  const entries: ZipEntryRead[] = [];
  let p = cdOffset;
  for (let i = 0; i < entryCount; i++) {
    if (u32(view, p) !== 0x02014b50) throw new Error('ZIP: bad central directory header');
    const method = u16(view, p + 10);
    const compressedSize = u32(view, p + 20);
    const uncompressedSize = u32(view, p + 24);
    const nameLen = u16(view, p + 28);
    const extraLen = u16(view, p + 30);
    const commentLen = u16(view, p + 32);
    const localHeaderOffset = u32(view, p + 42);
    const name = td.decode(zip.slice(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    // Read local header to find data offset.
    const lh = localHeaderOffset;
    if (u32(view, lh) !== 0x04034b50) throw new Error('ZIP: bad local header');
    const lhNameLen = u16(view, lh + 26);
    const lhExtraLen = u16(view, lh + 28);
    const dataStart = lh + 30 + lhNameLen + lhExtraLen;
    const compressed = zip.slice(dataStart, dataStart + compressedSize);

    let bytes: Uint8Array;
    if (method === 0) bytes = compressed;
    else if (method === 8) bytes = await inflate(compressed);
    else throw new Error(`ZIP: unsupported method ${method} for ${name}`);

    entries.push({ name, size: uncompressedSize, compressedSize, method, bytes });
  }
  return entries.sort((a, b) => a.name.localeCompare(b.name));
}
