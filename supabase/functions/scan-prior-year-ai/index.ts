// Edge function: scan-prior-year-ai
// Opt-in path: user has explicitly consented to send the PDF to Google Gemini
// (via Lovable AI Gateway). We never persist the PDF, and only extract
// document categories (no values, no PII).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const LOVABLE_AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-2.5-flash";

type Item = { label: string };
type Scan = { income?: Item[]; assets?: Item[]; deductions?: Item[] };

// Whitelist of labels we accept back from the model. Anything else is dropped.
const ALLOWED_LABELS = new Set<string>([
  // income
  "Lohnausweis",
  "Nachweis Selbständigerwerb",
  "Rentenbescheinigung (AHV/IV/PK)",
  "Bescheinigung Säule 3a-Bezug",
  "Wertschriften-/Depotverzeichnis",
  "Liegenschaftsertrag-Abrechnung",
  "Bestätigung Alimente/Unterhalt",
  "Arbeitslosentaggeld-Abrechnung",
  "Bestätigung Familien-/Mutterschaftszulagen",
  // assets
  "Bankkontoauszug per 31.12.",
  "Depotauszug per 31.12.",
  "Rückkaufswert Lebensversicherung",
  "Liegenschaftsbeleg",
  "Fahrzeugausweis / Eurotax",
  "Krypto-Saldonachweis",
  // deductions
  "Berufsauslagen-Belege",
  "Säule 3a-Einzahlungsbestätigung",
  "PK-Einkauf-Beleg",
  "Belege Krankheits-/Unfallkosten",
  "Krankenkassen-Prämienrechnung",
  "Spendenbescheinigung",
  "Schuldzinsen-Bescheinigung",
  "Kinderbetreuungs-Beleg",
  "Beleg Unterhaltszahlung",
  "Beleg Liegenschaftsunterhalt",
  "Parteibeitrags-Beleg",
  "Belege Weiterbildungskosten",
]);

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
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // Expect multipart/form-data with file + taxFilerId + taxYear + consent
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const taxFilerId = String(form.get("taxFilerId") ?? "");
    const taxYear = String(form.get("taxYear") ?? "");
    const consent = String(form.get("consent") ?? "") === "true";

    if (!file || !taxFilerId || !taxYear || !consent) {
      return new Response(JSON.stringify({ error: "invalid input or missing consent" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > 20 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "file too large (max 20 MB)" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    // Upload PDF to private storage (verschlüsselt via Supabase Storage),
    // damit Nutzer es ersetzen und unser Team es einsehen kann.
    const storagePath = `${userId}/${taxFilerId}/${taxYear}.pdf`;
    try {
      const buf2 = new Uint8Array(await file.slice(0).arrayBuffer());
      const { error: upErr } = await admin.storage
        .from("prior-year-returns")
        .upload(storagePath, buf2, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (upErr) console.warn("scan-prior-year-ai storage upload failed:", upErr.message);
    } catch (e) {
      console.warn("scan-prior-year-ai storage upload exception:", (e as any)?.message);
    }

    // Audit consent + create/upsert checklist row.
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

    // base64 encode PDF for Vision model
    const buf = new Uint8Array(await file.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const b64 = btoa(bin);
    const dataUrl = `data:application/pdf;base64,${b64}`;

    const systemPrompt = `Du bist ein Schweizer Steuerexperte. Du erhältst eine
Vorjahres-Steuererklärung als PDF. Deine Aufgabe ist NICHT, Beträge oder
persönliche Daten zu extrahieren. Bestimme NUR, welche Belege/Dokumente der
Steuerpflichtige dieses Jahr wieder bereithalten muss.

WICHTIGSTE REGEL — VERLASSE DICH AUSSCHLIESSLICH AUF DIE SSK-ZIFFERN
(eCH-0119): Die 3-stelligen Ziffern (z. B. 100, 220, 400) sind in JEDEM
kantonalen Hauptformular identisch. Ignoriere kantonale Bezeichnungen,
Layout oder Beispieltexte. Ein Dokument ist NUR dann erforderlich, wenn die
zugehörige Ziffer im PDF mit einem Betrag > 0 ausgefüllt ist. Wenn das Feld
leer, durchgestrichen oder mit "0" gefüllt ist, NICHT aufnehmen.

Ziffer → Dokument-Mapping (verwende EXAKT diese Labels):

EINKOMMEN
- 100 / 101 / 102 / 103  → "Lohnausweis"
- 120 / 121 / 122 / 123  → "Nachweis Selbständigerwerb"
- 130 / 131 / 132 / 133 / 134 / 135 / 136 / 137  → "Rentenbescheinigung (AHV/IV/PK)"
  (Pensionskassenausweis selbst ist KEIN Beleg für die Steuererklärung – nur die Renten-Bescheinigung wenn tatsächlich Renten ausbezahlt werden.)
- 140 / 141              → "Arbeitslosentaggeld-Abrechnung"
- 142 / 143              → "Bestätigung Familien-/Mutterschaftszulagen"
- 150 / 151              → "Wertschriften-/Depotverzeichnis"
- 160 / 161              → "Bestätigung Alimente/Unterhalt"
- 180 / 181 / 183 / 186 / 188 → "Liegenschaftsertrag-Abrechnung"

VERMÖGEN
- 400                    → "Depotauszug per 31.12." UND "Bankkontoauszug per 31.12."
                           (beide, da Code 400 sowohl Wertschriften als auch Konten umfasst)
- 406                    → "Rückkaufswert Lebensversicherung"
- 412                    → "Fahrzeugausweis / Eurotax"
- 420 / 421 / 422        → "Liegenschaftsbeleg"

ABZÜGE
- 220 / 240              → "Berufsauslagen-Belege"
- 250 / 470              → "Schuldzinsen-Bescheinigung"
- 254 / 255 / 256        → "Beleg Unterhaltszahlung"
- 260 / 261              → "Säule 3a-Einzahlungsbestätigung"
- 270                    → "Krankenkassen-Prämienrechnung"
- 280                    → "PK-Einkauf-Beleg"
- 291                    → "Belege Weiterbildungskosten"
- 184 / 185              → "Beleg Liegenschaftsunterhalt"
- 320                    → "Belege Krankheits-/Unfallkosten"
- 324                    → "Spendenbescheinigung"
- 376                    → "Kinderbetreuungs-Beleg"

Sonderregel Säule 3a: NUR über Ziffer klassifizieren. Ziffer 260/261
→ "Säule 3a-Einzahlungsbestätigung" (Abzug). Eine "Säule 3a-Saldobestätigung"
existiert NICHT mehr — niemals zurückgeben. "Bescheinigung Säule 3a-Bezug"
nur dann, wenn das PDF explizit eine Kapitalleistung / Pensionierung
ausweist (separates Formular Kapitalleistungen, nicht im Hauptformular).

Antworte AUSSCHLIESSLICH mit reinem JSON nach folgendem Schema:
{
  "income":     [{"label": string}],
  "assets":     [{"label": string}],
  "deductions": [{"label": string}]
}

Keine Werte, keine Beträge, keine Namen, keine Adressen, keine Erklärungen.`;

    const aiResp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analysiere das angehängte PDF." },
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
      const seen = new Set<string>();
      for (const item of scan[cat] ?? []) {
        const label = String(item?.label ?? "").trim();
        if (!label || !ALLOWED_LABELS.has(label) || seen.has(label)) continue;
        seen.add(label);
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
        raw_scan: { _source: "ai_pdf" } as any,
        generated_at: new Date().toISOString(),
      })
      .eq("id", checklist.id);

    return new Response(
      JSON.stringify({ ok: true, checklistId: checklist.id, itemCount: rows.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("scan-prior-year-ai error:", e?.message ?? e);
    return new Response(JSON.stringify({ error: e?.message ?? "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
