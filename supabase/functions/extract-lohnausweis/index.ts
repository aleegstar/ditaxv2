// Lohnausweis OCR Extraction
// - Auth-gated (per Lovable AI Gateway DSGVO model)
// - Bytes received transiently in memory (base64), never persisted, never logged
// - Returns structured Lohnausweis fields (CH Ziff. 1-15) via tool calling
// - DSGVO: only requested structured fields are returned, no raw OCR text

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const LOHNAUSWEIS_TOOL = {
  type: "function",
  function: {
    name: "extract_lohnausweis_fields",
    description:
      "Extract structured fields from a Swiss salary statement (Lohnausweis). Only return fields actually present in the document. All amounts are in CHF.",
    parameters: {
      type: "object",
      properties: {
        employer_name: { type: "string", description: "Name of the employer (Arbeitgeber)" },
        employer_address: { type: "string" },
        employee_name: { type: "string", description: "Name of the employee" },
        employee_ahv: { type: "string", description: "AHV/AVS number" },
        period_from: { type: "string", description: "Anstellungsbeginn (ISO yyyy-mm-dd)" },
        period_to: { type: "string", description: "Anstellungsende (ISO yyyy-mm-dd)" },
        gross_salary: { type: "number", description: "Ziff. 1: Lohn (Bruttolohn)" },
        company_car: { type: "number", description: "Ziff. 2.2: Privatanteil Geschäftswagen" },
        other_fringe_benefits: { type: "number", description: "Ziff. 2.3: Andere Gehaltsnebenleistungen" },
        irregular_pay: { type: "number", description: "Ziff. 3: Unregelmässige Leistungen" },
        capital_payments: { type: "number", description: "Ziff. 4: Kapitalleistungen" },
        employee_participation: { type: "number", description: "Ziff. 5: Mitarbeiterbeteiligungen" },
        board_compensation: { type: "number", description: "Ziff. 6: Verwaltungsratsentschädigung" },
        other_benefits: { type: "number", description: "Ziff. 7: Andere Leistungen" },
        gross_total: { type: "number", description: "Ziff. 8: Bruttolohn total" },
        ahv_iv_eo_alv_nbuv: { type: "number", description: "Ziff. 9: AHV/IV/EO/ALV/NBUV-Beiträge" },
        bvg_ordinary: { type: "number", description: "Ziff. 10.1: Ordentliche BVG-Beiträge" },
        bvg_purchase: { type: "number", description: "Ziff. 10.2: BVG-Einkauf" },
        net_salary: { type: "number", description: "Ziff. 11: Nettolohn" },
        withholding_tax: { type: "number", description: "Ziff. 12: Quellensteuerabzug" },
        meal_allowance: { type: "number", description: "Ziff. 13.1.1: Effektive Spesen" },
        flat_expenses: { type: "number", description: "Ziff. 13.2.1/2: Pauschalspesen" },
        further_education: { type: "number", description: "Ziff. 13.3: Weiterbildung" },
        free_transport: { type: "boolean", description: "Feld F: Unentgeltliche Beförderung zwischen Wohn- und Arbeitsort (X = angekreuzt)" },
        free_meals: { type: "boolean", description: "Feld G: Kantinenverpflegung / Lunch-Checks (X = angekreuzt)" },
        shift_days: { type: "number", description: "Anzahl Schichttage (falls in Bemerkungen Ziff. 15 oder separat aufgeführt)" },
        notes: { type: "string", description: "Ziff. 15: Bemerkungen (nur wenn relevant: Schichtarbeit, Aussendienst, etc.)" },
        currency: { type: "string", description: "Currency code (default CHF)" },
        confidence: {
          type: "number",
          description: "Overall extraction confidence 0..1",
        },
      },
      additionalProperties: false,
    },
  },
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Auth gate
  try {
    const authHeader =
      req.headers.get("Authorization") || req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }
    const { createClient } = await import(
      "https://esm.sh/@supabase/supabase-js@2.57.2"
    );
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } =
      await authClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }
  } catch (err) {
    console.error("[extract-lohnausweis] Auth check failed", err);
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
  // Strip data URL prefix if present
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
  // ~7.5 MB base64 ≈ 5 MB binary
  if (b64.length > 7_500_000) return json({ error: "file_too_large" }, 413);

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return json({ error: "ai_not_configured" }, 500);
  }

  const systemPrompt =
    "Du bist ein Experte für Schweizer Lohnausweise. Extrahiere ausschliesslich die im Dokument tatsächlich vorhandenen Felder. Achte besonders sorgfältig auf Feld F (Unentgeltliche Beförderung Wohn-/Arbeitsort) und Feld G (Kantinenverpflegung/Lunch-Checks) – ein 'X', Häkchen oder Kreuz im Kästchen bedeutet true, leeres Kästchen false. Suche in den Bemerkungen (Ziff. 15) nach Angaben zu Schichttagen / Schichtarbeit / Aussendienst und extrahiere die Anzahl Schichttage falls vorhanden. Gib KEINEN Rohtext zurück, sondern ausschliesslich strukturierte Felder via Funktion. Wenn ein Wert nicht eindeutig erkennbar ist, lasse das Feld weg. Beträge in CHF als Zahl, ohne Tausendertrennzeichen. Datumsangaben als ISO yyyy-mm-dd.";

  const isPdf = mt === "application/pdf";
  const userContent = isPdf
    ? [
        {
          type: "file",
          file: {
            filename: "lohnausweis.pdf",
            file_data: `data:application/pdf;base64,${b64}`,
          },
        },
        { type: "text", text: "Extrahiere alle erkennbaren Lohnausweis-Felder." },
      ]
    : [
        { type: "image_url", image_url: { url: `data:${mt};base64,${b64}` } },
        { type: "text", text: "Extrahiere alle erkennbaren Lohnausweis-Felder." },
      ];

  try {
    const startedAt = Date.now();
    const aiResp = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [LOHNAUSWEIS_TOOL],
          tool_choice: {
            type: "function",
            function: { name: "extract_lohnausweis_fields" },
          },
          temperature: 0.1,
        }),
      },
    );

    console.log(
      `[extract-lohnausweis] AI status=${aiResp.status} duration=${Date.now() - startedAt}ms`,
    );

    if (!aiResp.ok) {
      if (aiResp.status === 429)
        return json({ error: "rate_limited" }, 429);
      if (aiResp.status === 402)
        return json({ error: "credits_exhausted" }, 402);
      const txt = await aiResp.text();
      console.error("[extract-lohnausweis] AI error body:", txt.slice(0, 500));
      return json({ error: "ai_error" }, 502);
    }

    const data = await aiResp.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    const argsStr = toolCall?.function?.arguments;
    if (!argsStr) {
      return json({ error: "no_extraction" }, 422);
    }
    let fields: Record<string, unknown> = {};
    try {
      fields = JSON.parse(argsStr);
    } catch {
      return json({ error: "invalid_extraction" }, 422);
    }

    return json({ fields });
  } catch (err) {
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
