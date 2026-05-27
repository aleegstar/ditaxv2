// Lohnausweis Extraktion — Gemini 2.5 Flash via Vertex AI (Schweiz, europe-west6).
//
// DSGVO/FADP: Inference in Zürich, kein Modelltraining auf Daten, keine Persistenz.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { generateContent, MODEL_FLASH, VertexAiError } from "../_shared/vertex-ai.ts";
import { buildCacheKey, getCached, setCached, sha256Hex } from "../_shared/ai-cache.ts";
import { checkAndLogAiUsage, extractDeviceId, rateLimitResponse } from "../_shared/ai-rate-limit.ts";
import { isPentestMode } from "../_shared/pentest-guard.ts";

const FUNCTION_NAME = "extract-lohnausweis";
const MODEL = MODEL_FLASH;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
};

const LOHNAUSWEIS_SCHEMA = {
  type: "object",
  properties: {
    employer_name: { type: "string" },
    employer_address: { type: "string" },
    employee_name: { type: "string" },
    employee_ahv: { type: "string" },
    period_from: { type: "string" },
    period_to: { type: "string" },
    gross_salary: { type: "number" },
    company_car: { type: "number" },
    other_fringe_benefits: { type: "number" },
    irregular_pay: { type: "number" },
    capital_payments: { type: "number" },
    employee_participation: { type: "number" },
    board_compensation: { type: "number" },
    other_benefits: { type: "number" },
    gross_total: { type: "number" },
    ahv_iv_eo_alv_nbuv: { type: "number" },
    bvg_ordinary: { type: "number" },
    bvg_purchase: { type: "number" },
    net_salary: { type: "number" },
    withholding_tax: { type: "number" },
    meal_allowance: { type: "number" },
    flat_expenses: { type: "number" },
    further_education: { type: "number" },
    free_meals: { type: "boolean" },
    free_transport: { type: "boolean" },
    shift_days: { type: "number" },
    notes: { type: "string" },
    currency: { type: "string" },
  },
};

const SYSTEM_PROMPT = `Schweizer Lohnausweis-Parser (Ziffern 1–15).
- Beträge als reine Zahlen in CHF, keine Apostrophe.
- Datumsfelder YYYY-MM-DD. AHV 756.XXXX.XXXX.XX.
- Nur tatsächlich vorhandene Felder; keine Schätzungen.
- F/G Selection Marks: true wenn angekreuzt.
- currency = "CHF" wenn nicht anders angegeben.
- Antwort ausschliesslich als JSON gemäss Schema.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (isPentestMode()) {
    console.log("[PENTEST_MODE] extract-lohnausweis stub response");
    return new Response(
      JSON.stringify({ pentest_mode: true, fields: {} }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

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
    console.error("[extract-lohnausweis] auth check failed", err);
    return json({ error: "Unauthorized" }, 401);
  }

  let payload: { fileBase64?: string; mimeType?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }

  const { fileBase64, mimeType } = payload;
  if (!fileBase64 || typeof fileBase64 !== "string") {
    return json({ error: "fileBase64 required" }, 400);
  }

  let b64 = fileBase64;
  let mt = mimeType;
  if (b64.startsWith("data:")) {
    const m = b64.match(/^data:([^;]+);base64,(.+)$/);
    if (m) {
      mt = mt || m[1];
      b64 = m[2];
    }
  }
  if (!mt) mt = "application/pdf";
  if (b64.length < 1000) return json({ error: "file_too_small" }, 400);
  if (b64.length > 7_500_000) return json({ error: "file_too_large" }, 413);

  try {
    const fileBytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const fileHash = await sha256Hex(fileBytes);
    const cacheKey = buildCacheKey(fileHash, FUNCTION_NAME, MODEL);

    const cached = (await getCached(userId!, cacheKey)) as { fields?: Record<string, unknown> } | null;
    // Cache-Hit gilt nicht gegen Limit
    if (!cached?.fields) {
      const rl = await checkAndLogAiUsage({ userId: userId!, endpoint: "lohnausweis", deviceId: extractDeviceId(req) });
      if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
    }
    if (cached?.fields && Object.keys(cached.fields).length > 0) {
      console.log(`[extract-lohnausweis] cache hit`);
      return json({ fields: cached.fields, _cache: true });
    }

    const startedAt = Date.now();
    const result = await generateContent(
      [
        { inlineData: { mimeType: mt, data: b64 } },
        { text: "Extrahiere die Lohnausweis-Felder als JSON." },
      ],
      {
        model: MODEL,
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseSchema: LOHNAUSWEIS_SCHEMA,
        temperature: 0.0,
        maxOutputTokens: 1536,
        timeoutMs: 90_000,
      },
    );
    console.log(`[extract-lohnausweis] vertex ms=${Date.now() - startedAt}`);

    const fields = (result.json ?? {}) as Record<string, unknown>;
    if (!fields || Object.keys(fields).length === 0) {
      return json({ error: "no_extraction" }, 422);
    }
    if (!fields.currency) fields.currency = "CHF";

    await setCached({
      userId: userId!,
      cacheKey,
      functionName: FUNCTION_NAME,
      model: MODEL,
      fileHash,
      payload: { fields },
    });

    return json({ fields });
  } catch (err) {
    if (err instanceof VertexAiError) {
      if (err.code === "vertex_quota") return json({ error: "rate_limited" }, 429);
      if (err.code === "vertex_unauthorized") return json({ error: "ocr_unauthorized" }, 502);
      if (err.code === "vertex_timeout") return json({ error: "ocr_timeout" }, 504);
      if (err.code === "vertex_not_configured") return json({ error: "ocr_not_configured" }, 500);
      return json({ error: "ocr_failed" }, 502);
    }
    console.error("[extract-lohnausweis] error", err);
    return json({ error: "internal_error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
