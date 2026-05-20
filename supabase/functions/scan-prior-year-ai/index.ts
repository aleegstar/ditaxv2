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
// Pro-Variante für die Vision-Extraktion: deutlich zuverlässiger beim Lesen
// von Aargauer Wertschriftenverzeichnis-Tabellen (IBAN, Depot-Nr., Institution)
// als Flash. Wir akzeptieren die höhere Latenz für korrekte Konten.
const MODEL = "google/gemini-2.5-pro";

type Item = { label: string };
type Account = { institution?: string; reference?: string };
type Scan = { income?: Item[]; assets?: Item[]; deductions?: Item[]; accounts?: Account[] };

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
  "Beleg übrige Einkünfte",
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

WICHTIGSTE REGEL — VERLASSE DICH AUSSCHLIESSLICH AUF DIE ZIFFERN:
Ignoriere kantonale Bezeichnungen, Layout oder Beispieltexte. Ein Dokument
ist NUR dann erforderlich, wenn die zugehörige Ziffer im PDF mit einem
Betrag > 0 ausgefüllt ist. Wenn das Feld leer, durchgestrichen oder mit "0"
gefüllt ist, NICHT aufnehmen.

Beachte: Die Aargauer eTax-Hauptbogen-Codierung 2025 weicht stark von der
SSK-Empfehlung ab. Verwende untenstehende Mapping-Tabelle für BEIDE Welten.

Ziffer → Dokument-Mapping (verwende EXAKT diese Labels):

EINKOMMEN
- AG 010 / 020 / 030 / 040 / 050 / 060   (oder SSK 100–103)
                                  → "Lohnausweis"
- AG 070 / 090 / 150 / 160               (oder SSK 120–123)
                                  → "Nachweis Selbständigerwerb"
  (In AG sind 150/160 = Personengesellschaft P1/P2, NICHT Wertschriften.)
- AG 1701 / 1901                         (oder SSK 130–137 / 960–967)
                                  → "Rentenbescheinigung (AHV/IV/PK)"
  (Pensionskassenausweis selbst ist KEIN Beleg – nur die Renten-Bescheinigung wenn tatsächlich Renten ausbezahlt werden.)
- SSK 140 / 141                  → "Arbeitslosentaggeld-Abrechnung"
- AG 671 / 672                           (oder SSK 142 / 143)
                                  → "Bestätigung Familien-/Mutterschaftszulagen"
- AG 241                                 (oder SSK 151)
                                  → "Wertschriften-/Depotverzeichnis"
- AG 251 / 252                           (oder SSK 160 / 161)
                                  → "Bestätigung Alimente/Unterhalt"
- AG 253 / 254 / 255                     (oder SSK 162 / 163 / 164)
                                  → "Beleg übrige Einkünfte" (Erbschaften, Kapitalabfindung, übrige)
- AG 2701 / 2711 / 2741 / 2791           (oder SSK 180 / 181 / 183 / 186 / 188)
                                  → "Liegenschaftsertrag-Abrechnung"

VERMÖGEN
- AG 711                                 (oder SSK 400) → "Depotauszug per 31.12."
- AG 713                                 (oder SSK 400) → "Bankkontoauszug per 31.12."
  (SSK 400 deckt beides ab – dann beide Labels aufnehmen.)
- SSK 406                        → "Rückkaufswert Lebensversicherung"
- SSK 412                        → "Fahrzeugausweis / Eurotax"
- SSK 420 / 421 / 422 / 430 / 431 / 434
                                  → "Liegenschaftsbeleg"

ABZÜGE
- AG 3201 / 3401                         (oder SSK 201 / 220 / 221 / 240)
                                  → "Berufsauslagen-Belege" (inkl. ÖV-Abo)
- AG 310                                 (oder SSK 250 / 470)
                                  → "Schuldzinsen-Bescheinigung"
- AG 361 / 362 / 363                     (oder SSK 254 / 255 / 256)
                                  → "Beleg Unterhaltszahlung"
- AG 371 / 372                           (oder SSK 281)
                                  → "PK-Einkauf-Beleg"
- AG 381 / 382                           (oder SSK 260 / 261)
                                  → "Säule 3a-Einzahlungsbestätigung"
- AG 383                                 (oder SSK 270)
                                  → "Krankenkassen-Prämienrechnung"
- AG 650 / 655                           (oder SSK 291)
                                  → "Belege Weiterbildungskosten"
- AG 2811 / 2821                         (oder SSK 184 / 185)
                                  → "Beleg Liegenschaftsunterhalt"
- AG 397                                 (oder SSK 320)
                                  → "Belege Krankheits-/Unfallkosten"
- AG 393                                 (oder SSK 324)
                                  → "Spendenbescheinigung"
- AG 392                          → "Parteibeitrags-Beleg"
- AG 390                                 (oder SSK 376)
                                  → "Kinderbetreuungs-Beleg"

Sonderregel Säule 3a: NUR über Ziffer klassifizieren. Ziffer 260/261
→ "Säule 3a-Einzahlungsbestätigung" (Abzug). Eine "Säule 3a-Saldobestätigung"
existiert NICHT mehr — niemals zurückgeben. "Bescheinigung Säule 3a-Bezug"
nur dann, wenn das PDF explizit eine Kapitalleistung / Pensionierung
ausweist (separates Formular Kapitalleistungen, nicht im Hauptformular).

ZUSÄTZLICH — BANK-/DEPOTKONTEN aus dem Wertschriften- und Guthabenverzeichnis:

LIES NUR DIE TABELLEN-DETAILZEILEN. Beispiel-Spaltenkopf des Aargauer
Wertschriftenverzeichnisses (Rubrik A "mit Verrechnungssteuer" oder
Rubrik B "ohne Verrechnungssteuer"):

  Nr | Stk/Nom | Typ | Kto-Nr Valoren-Nr | Bezeichnung | Steuerwert | Bruttoertrag

Vorgehen — STRENG einhalten:
1. Suche nur Seiten, die den Spaltenkopf "Kto-Nr" UND "Bezeichnung" enthalten.
   Gibt es keine solche Seite → accounts: [].
2. Verarbeite ausschliesslich Datenzeilen UNTER diesem Kopf, eine Zeile = ein
   Konto/Depot. Ignoriere alle Zeilen vor dem Kopf, alle "Zwischen­total"-,
   "Total"- und Summen-Zeilen, sowie reine Vortragstexte.
3. Pro Zeile:
   - "reference" = Inhalt EXAKT der Spalte "Kto-Nr Valoren-Nr", Zeichen für
     Zeichen wie gedruckt. ERFINDE NIE Ziffern. Bei IBAN: "CH" + 19 Zeichen
     (Leerzeichen erlaubt). Bei Depot/Konto: nur die abgedruckte Ziffernfolge.
   - "institution" = Inhalt der Spalte "Bezeichnung" (z.B. "UBS Switzerland AG",
     "PostFinance AG", "Yuh", "Raiffeisen", "Plus500"). KEIN Adress-Suffix,
     KEIN Datum/Zeitraum.
4. Ignoriere Typ-Codes "BK", "PC", "Dep", "V", "L", "G", "M" — die gehören
   NICHT in reference und NICHT in institution.
5. DEDUPLIZIERUNG (kritisch): dasselbe Konto kann in Rubrik A UND Rubrik B
   auftauchen (z.B. Yuh Depot 1666308 erscheint zweimal, einmal pro Rubrik).
   Behandle gleiche normalisierte reference (Whitespace entfernt, Grossbuch­
   staben) als EIN Konto. Gib jedes Konto GENAU EINMAL zurück.
6. VOLLSTÄNDIGKEIT: Verpasse keine Detailzeile. Wenn die Tabelle 8 Datenzeilen
   hat und 6 davon eindeutige Konten sind, gib alle 6 zurück.
7. KEIN ERRATEN. Wenn eine Zeile keine klar lesbare Kto-/Valoren-Nummer hat,
   überspringe sie — niemals platzhaltende oder geschätzte Werte ausgeben.

Antworte AUSSCHLIESSLICH mit reinem JSON nach folgendem Schema (kein Markdown):
{
  "income":     [{"label": string}],
  "assets":     [{"label": string}],
  "deductions": [{"label": string}],
  "accounts":   [{"institution": string, "reference": string}]
}

Keine Werte, keine Beträge, keine Adressen, keine Erklärungen.`;

    const aiResp = await fetch(LOVABLE_AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: "Analysiere das angehängte PDF. Antworte AUSSCHLIESSLICH mit JSON gemäss Schema." },
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

    // Append one assets row per extracted bank/depot account, deduped by
    // normalized reference. Bypass ALLOWED_LABELS — these use a stable
    // "Beleg Bankkonto/Depot – {institution} · {reference}" format that
    // priorYearMapping.ts parses back into formData.assets.accounts.
    const seenRef = new Set<string>();
    for (const acc of scan.accounts ?? []) {
      const institutionRaw = String(acc?.institution ?? "").trim();
      const referenceRaw = String(acc?.reference ?? "").trim();
      if (!institutionRaw && !referenceRaw) continue;
      const normRef = referenceRaw.replace(/\s+/g, "").toUpperCase();
      const key = normRef || institutionRaw.toUpperCase();
      if (!key || seenRef.has(key)) continue;
      seenRef.add(key);
      const institution = institutionRaw || "Bank/Depot";
      const label = `Beleg Bankkonto/Depot – ${[institution, referenceRaw].filter(Boolean).join(" · ")}`;
      rows.push({
        checklist_id: checklist.id,
        category: "assets",
        label,
        source_value: null,
        sort_order: order++,
      });
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
