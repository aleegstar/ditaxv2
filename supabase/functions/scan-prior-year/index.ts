// Edge function: scan-prior-year
// Downloads the uploaded prior-year tax return PDF from Storage,
// asks Lovable AI (Gemini Vision) to extract structured items,
// then inserts them into prior_year_checklist_items.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

type Item = { label: string; value?: string };
type Scan = {
  contact?: Item[];
  income?: Item[];
  assets?: Item[];
  deductions?: Item[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const body = await req.json().catch(() => ({}));
    const { taxFilerId, taxYear, storagePath } = body ?? {};
    if (!taxFilerId || !taxYear || !storagePath || typeof storagePath !== "string") {
      return new Response(JSON.stringify({ error: "invalid input" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Ensure the path belongs to this user (folder = user_id).
    if (!storagePath.startsWith(`${userId}/`)) {
      return new Response(JSON.stringify({ error: "forbidden path" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Upsert checklist row → scanning
    const { data: checklist, error: cErr } = await admin
      .from("prior_year_checklists")
      .upsert({
        user_id: userId,
        tax_filer_id: taxFilerId,
        tax_year: String(taxYear),
        status: "scanning",
        source_storage_path: storagePath,
        error_message: null,
      }, { onConflict: "tax_filer_id,tax_year" })
      .select()
      .single();
    if (cErr || !checklist) throw new Error(cErr?.message ?? "checklist upsert failed");

    // Download PDF
    const { data: blob, error: dlErr } = await admin.storage
      .from("prior-year-returns").download(storagePath);
    if (dlErr || !blob) throw new Error(dlErr?.message ?? "download failed");
    const arr = new Uint8Array(await blob.arrayBuffer());
    // Convert to base64
    let bin = "";
    const CHUNK = 0x8000;
    for (let i = 0; i < arr.length; i += CHUNK) {
      bin += String.fromCharCode(...arr.subarray(i, i + CHUNK));
    }
    const base64 = btoa(bin);
    const dataUrl = `data:application/pdf;base64,${base64}`;

    const systemPrompt = `Du bist ein Schweizer Steuerexperte. Analysiere die hochgeladene Steuererklärung
(Vorjahr) und extrahiere die wichtigsten Positionen. Antworte AUSSCHLIESSLICH mit JSON nach folgendem Schema:
{
  "contact":    [{"label": string, "value": string}],
  "income":     [{"label": string, "value": string}],
  "assets":     [{"label": string, "value": string}],
  "deductions": [{"label": string, "value": string}]
}
Beispiele für labels: "Arbeitgeber: Migros AG", "Liegenschaft: Bahnhofstr. 12 Zürich",
"Säule 3a Konto: UBS", "Wertschriften: PostFinance Depot", "Krankheitskosten",
"Kinder: Max Müller (geb. 2018)". Schreib kurze, sprechende Labels.
Keine Erklärungen, nur JSON.`;

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
          {
            role: "user",
            content: [
              { type: "text", text: "Hier ist die Vorjahres-Steuererklärung. Bitte extrahiere die Positionen." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResp.ok) {
      const txt = await aiResp.text();
      throw new Error(`AI gateway ${aiResp.status}: ${txt.slice(0, 500)}`);
    }
    const aiJson = await aiResp.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "";
    // Strip ```json fences if present.
    const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    let scan: Scan = {};
    try {
      scan = JSON.parse(cleaned);
    } catch (_e) {
      // try to find first { ... } block
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) scan = JSON.parse(m[0]);
      else throw new Error("AI response not JSON");
    }

    // Reset existing items for this checklist
    await admin.from("prior_year_checklist_items").delete().eq("checklist_id", checklist.id);

    const rows: any[] = [];
    let order = 0;
    const cats: (keyof Scan)[] = ["contact", "income", "assets", "deductions"];
    for (const cat of cats) {
      for (const item of (scan[cat] ?? [])) {
        if (!item?.label) continue;
        rows.push({
          checklist_id: checklist.id,
          category: cat,
          label: String(item.label).slice(0, 300),
          source_value: item.value ? String(item.value).slice(0, 300) : null,
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
      .update({ status: "ready", raw_scan: scan as any, generated_at: new Date().toISOString() })
      .eq("id", checklist.id);

    return new Response(
      JSON.stringify({ ok: true, checklistId: checklist.id, itemCount: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("scan-prior-year error:", e?.message ?? e);
    // best-effort mark failed
    try {
      const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
      const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(SUPABASE_URL, SERVICE_KEY);
      const body = await req.clone().json().catch(() => ({}));
      if (body?.taxFilerId && body?.taxYear) {
        await admin.from("prior_year_checklists")
          .update({ status: "failed", error_message: String(e?.message ?? e).slice(0, 500) })
          .eq("tax_filer_id", body.taxFilerId).eq("tax_year", String(body.taxYear));
      }
    } catch {}
    return new Response(
      JSON.stringify({ error: e?.message ?? "unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
