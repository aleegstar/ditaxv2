// OCR Extract — Gemini 2.5 Flash-Lite via Vertex AI (Schweiz, europe-west6).
//
// DSGVO/FADP:
// - Bild bleibt physisch in der Schweiz (europe-west6).
// - Nur Keyword-Matches werden zurückgegeben, niemals Rohtext.
// - Kein Modelltraining auf Kundendaten.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizePromptInput } from "../_shared/ai-safety.ts";
import {
  generateContent,
  MODEL_FLASH,
  MODEL_FLASH_LITE,
  VertexAiError,
} from "../_shared/vertex-ai.ts";
import { buildCacheKey, getCached, setCached, sha256Hex } from "../_shared/ai-cache.ts";
import { checkAndLogAiUsage, extractDeviceId, rateLimitResponse } from "../_shared/ai-rate-limit.ts";

const FUNCTION_NAME = "ocr-extract";
const PRIMARY_MODEL = MODEL_FLASH_LITE;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
};

const OCR_SCHEMA = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
};

function detectMimeFromBase64(b64: string): string {
  if (b64.startsWith("/9j/")) return "image/jpeg";
  if (b64.startsWith("iVBORw")) return "image/png";
  if (b64.startsWith("R0lGOD")) return "image/gif";
  if (b64.startsWith("UklGR")) return "image/webp";
  return "image/jpeg";
}

async function runOcr(
  mimeType: string,
  base64Data: string,
  model: string,
): Promise<string> {
  const result = await generateContent(
    [
      { inlineData: { mimeType, data: base64Data } },
      { text: "OCR: liefere den sichtbaren Text des Dokuments als JSON {\"text\": \"...\"}." },
    ],
    {
      model,
      responseMimeType: "application/json",
      responseSchema: OCR_SCHEMA,
      temperature: 0.0,
      maxOutputTokens: 1536,
      timeoutMs: 60_000,
    },
  );
  const json = (result.json ?? {}) as { text?: string };
  return typeof json.text === "string" ? json.text : result.text;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Auth gate
  let userId: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.57.2");
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    userId = claims.claims.sub as string;
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

    const mimeType = requestedMimeType || detectedMimeType || detectMimeFromBase64(base64Data);

    const safeKeywords = (keywords as unknown[])
      .filter((k): k is string => typeof k === "string")
      .map((k) => sanitizePromptInput(k, 50).replace(/[^\p{L}\p{N}\s\-_.]/gu, "").trim())
      .filter((k) => k.length > 0 && k.length <= 50)
      .slice(0, 200);

    if (safeKeywords.length === 0) {
      return json({ matched: [], count: 0, duration: 0 });
    }

    // Cache lookup (key includes binary content + function + model)
    const fileBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileHash = await sha256Hex(fileBytes);
    const cacheKey = buildCacheKey(fileHash, FUNCTION_NAME, PRIMARY_MODEL);
    const cached = (await getCached(userId!, cacheKey)) as { text?: string } | null;

    let text = "";
    let modelUsed = PRIMARY_MODEL;
    let cacheHit = false;
    const startedAt = Date.now();

    if (cached?.text) {
      text = cached.text;
      cacheHit = true;
    } else {
      // AI rate limit (nur bei echtem Vertex-Call, Cache zählt nicht)
      const rl = await checkAndLogAiUsage({ userId: userId!, endpoint: "ocr_extract" });
      if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
      try {
        text = await runOcr(mimeType, base64Data, PRIMARY_MODEL);
      } catch (err) {
        // Auto-Fallback Flash-Lite → Flash bei 404 (Modell nicht verfügbar)
        if (err instanceof VertexAiError && /404/.test(err.message)) {
          console.warn("[ocr-extract] flash-lite 404, fallback to flash");
          modelUsed = MODEL_FLASH;
          text = await runOcr(mimeType, base64Data, MODEL_FLASH);
        } else if (err instanceof VertexAiError) {
          if (err.code === "vertex_quota") return json({ error: "rate_limited" }, 429);
          if (err.code === "vertex_unauthorized") return json({ error: "ocr_unauthorized" }, 502);
          if (err.code === "vertex_timeout") return json({ error: "ocr_timeout" }, 504);
          return json({ error: "ocr_failed" }, 502);
        } else {
          throw err;
        }
      }

      await setCached({
        userId: userId!,
        cacheKey: buildCacheKey(fileHash, FUNCTION_NAME, modelUsed),
        functionName: FUNCTION_NAME,
        model: modelUsed,
        fileHash,
        payload: { text },
      });
    }

    const duration = Date.now() - startedAt;
    const haystack = text.toLowerCase();
    const matchedKeywords: string[] = [];
    for (const kw of safeKeywords) {
      if (haystack.includes(kw.toLowerCase())) matchedKeywords.push(kw);
    }

    console.log(
      `[ocr-extract] model=${modelUsed} cache=${cacheHit} ms=${duration} matched=${matchedKeywords.length}`,
    );

    return json({ matched: matchedKeywords, count: matchedKeywords.length, duration });
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
