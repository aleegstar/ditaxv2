// Signs and verifies HMAC tokens for newsletter unsubscribe + click tracking.
// Token format: base64url(payloadJson) + "." + base64url(hmacSha256(secret, payloadJson))

function b64urlEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const norm = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(norm);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export interface NewsletterTokenPayload {
  u: string; // user_id
  c: string; // campaign_id
  e: string; // email
  k?: string; // kind: "u" (unsubscribe) | "c" (click)
}

export async function signNewsletterToken(
  payload: NewsletterTokenPayload,
  secret: string,
): Promise<string> {
  const json = JSON.stringify(payload);
  const payloadB64 = b64urlEncode(new TextEncoder().encode(json));
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64),
  );
  return payloadB64 + "." + b64urlEncode(new Uint8Array(sig));
}

export async function verifyNewsletterToken(
  token: string,
  secret: string,
): Promise<NewsletterTokenPayload | null> {
  try {
    const [payloadB64, sigB64] = token.split(".");
    if (!payloadB64 || !sigB64) return null;
    const key = await getKey(secret);
    const ok = await crypto.subtle.verify(
      "HMAC",
      key,
      b64urlDecode(sigB64),
      new TextEncoder().encode(payloadB64),
    );
    if (!ok) return null;
    const json = new TextDecoder().decode(b64urlDecode(payloadB64));
    return JSON.parse(json) as NewsletterTokenPayload;
  } catch {
    return null;
  }
}
