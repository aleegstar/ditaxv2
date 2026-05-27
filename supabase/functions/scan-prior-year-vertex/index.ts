// scan-prior-year-vertex — Gemini 2.5 Pro via Vertex AI (Schweiz, europe-west6).
//
// DSGVO/FADP: Inference physisch in Zürich, kein Modelltraining auf Kundendaten,
// kein Logging des PDF-Inhalts. PDF wird im privaten Supabase-Storage gespeichert.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { generateContent, MODEL_FLASH, VertexAiError } from "../_shared/vertex-ai.ts";
import { buildCacheKey, getCached, setCached, sha256Hex } from "../_shared/ai-cache.ts";
import { checkAndLogAiUsage, extractDeviceId, rateLimitResponse } from "../_shared/ai-rate-limit.ts";
import { isPentestMode } from "../_shared/pentest-guard.ts";

const FUNCTION_NAME = "scan-prior-year-vertex";
const MODEL = MODEL_FLASH;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Category = "income" | "assets" | "deductions";

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    income: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          code: { type: "string" },
        },
        required: ["label"],
      },
    },
    assets: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          code: { type: "string" },
        },
        required: ["label"],
      },
    },
    deductions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          code: { type: "string" },
        },
        required: ["label"],
      },
    },
  },
  required: ["income", "assets", "deductions"],
};

const SYSTEM_PROMPT = `Schweizer Steuerexperte. Du analysierst eine definitive \
Schweizer Steuererklärung Kanton Aargau (PDF) und erstellst eine Belegliste fürs Folgejahr.

REGELN:
- Nur Positionen mit ausgefülltem CHF-Betrag > 0 aufnehmen (keine Formular-Defaults).
- code = Aargauer Ziffer wenn erkennbar (z.B. "010", "240", "381", "710").
- Kategorien: income, deductions, assets (Vermögen/Wertschriften/Liegenschaften/Schulden).
- label = kurzer deutscher Belegname (z.B. "Lohnausweis", "Säule 3a-Bestätigung",
  "Depotverzeichnis", "Schuldzinsen-Bescheinigung", "Beleg Bankkonto – <Institut>").
- Bei mehreren Depots/Konten: ein Eintrag pro Konto inkl. Institut.
- Keine Beträge, keine Personendaten, keine AHV-Nummern im Output.
- Antwort ausschliesslich als JSON gemäss Schema.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (isPentestMode()) {
    console.log("[PENTEST_MODE] scan-prior-year-vertex stub response");
    return new Response(
      JSON.stringify({ pentest_mode: true, income: [], assets: [], deductions: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return json({ error: "unauthorized" }, 401);
    }
    const userId = userData.user.id;

    const form = await req.formData();
    const file = form.get("file") as File | null;
    const taxFilerId = String(form.get("taxFilerId") ?? "");
    const taxYear = String(form.get("taxYear") ?? "");
    const consent = String(form.get("consent") ?? "") === "true";

    if (!file || !taxFilerId || !taxYear || !consent) {
      return json({ error: "invalid input or missing consent" }, 400);
    }
    if (file.size > 20 * 1024 * 1024) {
      return json({ error: "file too large (max 20 MB)" }, 413);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: filerRow, error: filerErr } = await admin
      .from("tax_filers")
      .select("id")
      .eq("id", taxFilerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (filerErr || !filerRow) return json({ error: "forbidden tax_filer" }, 403);

    // AI rate limit: 5/Tag/User + 3 lifetime pro filer+year + 3 lifetime pro Gerät+year
    const rl = await checkAndLogAiUsage({
      userId,
      endpoint: "prior_year",
      taxFilerId,
      taxYear,
      deviceId: extractDeviceId(req),
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);



    const storagePath = `${userId}/${taxFilerId}/${taxYear}.pdf`;
    try {
      const buf2 = new Uint8Array(await file.slice(0).arrayBuffer());
      const { error: upErr } = await admin.storage
        .from("prior-year-returns")
        .upload(storagePath, buf2, { contentType: "application/pdf", upsert: true });
      if (upErr) console.warn("scan-prior-year-vertex storage upload failed:", upErr.message);
    } catch (e) {
      console.warn("scan-prior-year-vertex storage upload exception:", (e as any)?.message);
    }

    const { data: checklist, error: cErr } = await admin
      .from("prior_year_checklists")
      .upsert(
        {
          user_id: userId,
          tax_filer_id: taxFilerId,
          tax_year: taxYear,
          status: "scanning",
          source_storage_path: storagePath,
          error_message: null,
          ai_consent_at: new Date().toISOString(),
        },
        { onConflict: "tax_filer_id,tax_year" },
      )
      .select()
      .single();
    if (cErr || !checklist) throw new Error(cErr?.message ?? "checklist upsert failed");

    // --- Vertex AI Gemini call (mit Cache) ---
    const bytes = new Uint8Array(await file.arrayBuffer());
    const pdfBase64 = bytesToBase64(bytes);
    const fileHash = await sha256Hex(bytes);
    const cacheKey = buildCacheKey(fileHash, FUNCTION_NAME, MODEL);
    const startedAt = Date.now();

    let parsedFromCache:
      | { income?: any[]; assets?: any[]; deductions?: any[] }
      | null = null;
    const cached = (await getCached(userId, cacheKey)) as
      | { parsed?: { income?: any[]; assets?: any[]; deductions?: any[] } }
      | null;
    if (cached?.parsed) parsedFromCache = cached.parsed;

    let result: { text: string; json?: unknown } | null = null;
    if (!parsedFromCache) {
      try {
        result = await generateContent(
          [
            { inlineData: { mimeType: "application/pdf", data: pdfBase64 } },
            { text: "Analysiere diese Schweizer Steuererklärung und liefere die Checkliste als JSON." },
          ],
          {
            model: MODEL,
            systemInstruction: SYSTEM_PROMPT,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0.0,
            maxOutputTokens: 2048,
            timeoutMs: 120_000,
          },
        );
      } catch (err) {
        const code = err instanceof VertexAiError ? err.code : "vertex_error";
        const msg = err instanceof Error ? err.message : String(err);
        const status = err instanceof VertexAiError ? err.status : 502;
        await admin
          .from("prior_year_checklists")
          .update({ status: "failed", error_message: `${code}: ${msg}`.slice(0, 500) })
          .eq("id", checklist.id);
        return json({ error: code, message: msg }, status);
      }
    }
    console.log(
      `[scan-prior-year-vertex] model=${MODEL} cache=${!!parsedFromCache} ms=${Date.now() - startedAt}`,
    );

    const parsed = (parsedFromCache ?? (result?.json ?? {})) as {
      income?: Array<{ label: string; code?: string }>;
      assets?: Array<{ label: string; code?: string }>;
      deductions?: Array<{ label: string; code?: string }>;
    };

    if (!parsedFromCache) {
      await setCached({
        userId,
        taxFilerId,
        cacheKey,
        functionName: FUNCTION_NAME,
        model: MODEL,
        fileHash,
        payload: { parsed },
      });
    }


    await admin.from("prior_year_checklist_items").delete().eq("checklist_id", checklist.id);

    const rows: Array<{
      checklist_id: string;
      category: Category;
      label: string;
      source_value: null;
      sort_order: number;
    }> = [];
    let order = 0;
    const seen = new Set<string>();
    for (const cat of ["income", "deductions", "assets"] as const) {
      for (const item of parsed[cat] ?? []) {
        const label = String(item?.label ?? "").trim().slice(0, 300);
        if (!label) continue;
        const key = `${cat}::${label.toLowerCase()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        rows.push({
          checklist_id: checklist.id,
          category: cat,
          label,
          source_value: null,
          sort_order: order++,
        });
      }
    }

    if (rows.length > 0) {
      const { error: insErr } = await admin.from("prior_year_checklist_items").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }

    await admin
      .from("prior_year_checklists")
      .update({
        status: "ready",
        raw_scan: { _source: "vertex_gemini", itemCount: rows.length } as any,
        generated_at: new Date().toISOString(),
      })
      .eq("id", checklist.id);

    return json({ ok: true, checklistId: checklist.id, itemCount: rows.length });
  } catch (e: any) {
    console.error("scan-prior-year-vertex error:", e?.message ?? e);
    return json({ error: e?.message ?? "unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}
