// Edge function: scan-prior-year
// Privacy-preserving fallback only. The client extracts the PDF locally and
// sends a pseudonymized text excerpt (no names, AHV, IBAN, addresses).
// We then ask Lovable AI (Gemini) to STRUCTURE that text into checklist items.
// No raw PDFs and no PII ever reach this function.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { isPentestMode } from "../_shared/pentest-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Item = { label: string };
type Scan = {
  income?: Item[];
  assets?: Item[];
  deductions?: Item[];
};

// Defensive server-side redaction in case the client missed something.
function redact(text: string): string {
  return text
    .replace(/\b756[.\s]\d{4}[.\s]\d{4}[.\s]\d{2}\b/g, "[AHV]")
    .replace(/\bCH\d{2}\s?(?:\d{4}\s?){4}\d{1,4}\b/gi, "[IBAN]")
    .replace(/\b\d{1,2}\.\d{1,2}\.(?:19|20)\d{2}\b/g, "[DATUM]")
    .replace(/\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, "[EMAIL]");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  if (isPentestMode()) {
    console.log("[PENTEST_MODE] scan-prior-year stub response");
    return new Response(
      JSON.stringify({ pentest_mode: true, income: [], assets: [], deductions: [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { taxFilerId, taxYear, text, storagePath } = body ?? {};
    if (!taxFilerId || !taxYear || !text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "invalid input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hard cap on accepted text to avoid abuse / huge prompts.
    const safeText = redact(text).slice(0, 60_000);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify the taxFilerId belongs to the authenticated user
    const { data: filerRow, error: filerErr } = await admin
      .from("tax_filers")
      .select("id")
      .eq("id", taxFilerId)
      .eq("user_id", userId)
      .maybeSingle();
    if (filerErr || !filerRow) {
      return new Response(JSON.stringify({ error: "forbidden tax_filer" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: checklist, error: cErr } = await admin
      .from("prior_year_checklists")
      .upsert(
        {
          user_id: userId,
          tax_filer_id: taxFilerId,
          tax_year: String(taxYear),
          status: "scanning",
          source_storage_path: typeof storagePath === "string" ? storagePath : null,
          error_message: null,
        },
        { onConflict: "tax_filer_id,tax_year" },
      )
      .select()
      .single();
    if (cErr || !checklist) throw new Error(cErr?.message ?? "checklist upsert failed");

    const systemPrompt = `Du bist ein Schweizer Steuerexperte. Du erhältst einen
ANONYMISIERTEN Text-Auszug einer Vorjahres-Steuererklärung. Deine Aufgabe ist
es NICHT, Beträge oder persönliche Daten zu extrahieren. Bestimme NUR, welche
Belege/Dokumente der Steuerpflichtige dieses Jahr wieder bereithalten muss,
basierend darauf welche Einkommens-, Vermögens- und Abzugskategorien im Vorjahr
vorkamen. Antworte AUSSCHLIESSLICH mit JSON nach folgendem Schema:
{
  "income":     [{"label": string}],
  "assets":     [{"label": string}],
  "deductions": [{"label": string}]
}
Verwende als Label IMMER den Namen des benötigten Dokuments
(z.B. "Lohnausweis", "Rentenbescheinigung (AHV/IV)", "Pensionskassenausweis",
"Wertschriften-/Depotverzeichnis", "Säule 3a-Saldobestätigung",
"Bankkontoauszug per 31.12.", "Krankenkassen-Prämienrechnung",
"Spendenbescheinigung", "Kinderbetreuungs-Beleg").
Keine Werte, keine Erklärungen, keine persönlichen Daten, nur JSON.`;

    const aiResp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: safeText },
        ],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      throw new Error(`AI gateway ${aiResp.status}: ${txt.slice(0, 500)}`);
    }
    const aiJson = await aiResp.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let scan: Scan = {};
    try {
      scan = JSON.parse(cleaned);
    } catch (_e) {
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) scan = JSON.parse(m[0]);
      else throw new Error("AI response not JSON");
    }

    await admin.from("prior_year_checklist_items").delete().eq("checklist_id", checklist.id);

    const rows: any[] = [];
    let order = 0;
    const cats: (keyof Scan)[] = ["income", "assets", "deductions"];
    for (const cat of cats) {
      for (const item of scan[cat] ?? []) {
        if (!item?.label) continue;
        rows.push({
          checklist_id: checklist.id,
          category: cat,
          label: String(item.label).slice(0, 300),
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
        raw_scan: { ...scan, _source: "ai_text" } as any,
        generated_at: new Date().toISOString(),
      })
      .eq("id", checklist.id);

    return new Response(
      JSON.stringify({ ok: true, checklistId: checklist.id, itemCount: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("scan-prior-year error:", e?.message ?? e);
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const body = await req.clone().json().catch(() => ({}));
      if (body?.taxFilerId && body?.taxYear) {
        await admin
          .from("prior_year_checklists")
          .update({ status: "failed", error_message: String(e?.message ?? e).slice(0, 500) })
          .eq("tax_filer_id", body.taxFilerId)
          .eq("tax_year", String(body.taxYear));
      }
    } catch {}
    return new Response(JSON.stringify({ error: e?.message ?? "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
