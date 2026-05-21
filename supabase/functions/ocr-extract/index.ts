// OCR Extract Edge Function — Azure Document Intelligence (Switzerland North).
//
// DSGVO/FADP:
// - Bild wird transient an Azure DI (Schweiz-Region) gesendet, nicht gespeichert.
// - Nur Keyword-Matches werden zurückgegeben, niemals Rohtext.
// - Kein Logging von Bildinhalten.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizePromptInput } from "../_shared/ai-safety.ts";
import {
  analyzeDocument,
  AzureDocIntelError,
  extractPlainText,
} from "../_shared/azure-doc-intel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function detectMimeFromBase64(b64: string): string {
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("iVBORw")) return "image/png";
  if (b64.startsWith("R0lGOD")) return "image/gif";
  if (b64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth gate
  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
  } catch (err) {
    console.error("[ocr-extract] auth check failed", err);
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const { imageBase64, keywords, mimeType: requestedMimeType } = await req.json();

    if (!imageBase64 || typeof imageBase64 !== "string") {
      return json({ error: "imageBase64 is required" }, 400);
    }
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return json({ error: "keywords array is required" }, 400);
    }

    // Strip data URL prefix
    let base64Data = imageBase64;
    let detectedMimeType: string | null = null;
    if (imageBase64.startsWith("data:")) {
      const m = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (m) {
        detectedMimeType = m[1];
        base64Data = m[2];
      }
    }

    if (base64Data.length < 1000) return json({ error: "Image data too small" }, 400);
    if (base64Data.length > 1_400_000) return json({ error: "Image too large, max 1MB" }, 400);

    const mimeType =
      requestedMimeType || detectedMimeType || detectMimeFromBase64(base64Data);

    // Sanitize keywords (same logic as before — defense in depth)
    const safeKeywords = (keywords as unknown[])
      .filter((k): k is string => typeof k === "string")
      .map((k) => sanitizePromptInput(k, 50).replace(/[^\p{L}\p{N}\s\-_.]/gu, "").trim())
      .filter((k) => k.length > 0 && k.length <= 50)
      .slice(0, 200);

    if (safeKeywords.length === 0) {
      return json({ matched: [], count: 0, duration: 0 });
    }

    const bytes = base64ToBytes(base64Data);
    const startedAt = Date.now();

    let text: string;
    try {
      const result = await analyzeDocument(bytes, mimeType, "prebuilt-read");
      text = extractPlainText(result);
    } catch (err) {
      if (err instanceof AzureDocIntelError) {
        if (err.code === "rate_limited") return json({ error: "rate_limited" }, 429);
        if (err.code === "azure_unauthorized") return json({ error: "ocr_unauthorized" }, 502);
        if (err.code === "azure_timeout") return json({ error: "ocr_timeout" }, 504);
        return json({ error: "ocr_failed" }, 502);
      }
      throw err;
    }

    const duration = Date.now() - startedAt;
    const haystack = text.toLowerCase();

    // Case-insensitive substring match per keyword. Result preserves the
    // requested keyword exactly (so downstream profile matching keeps working).
    const matchedKeywords: string[] = [];
    for (const kw of safeKeywords) {
      if (haystack.includes(kw.toLowerCase())) matchedKeywords.push(kw);
    }

    console.log(`[ocr-extract] azure-read ms=${duration} matched=${matchedKeywords.length}`);

    return json({
      matched: matchedKeywords,
      count: matchedKeywords.length,
      duration,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[ocr-extract] error:", msg);
    return json({ error: "OCR processing failed" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
