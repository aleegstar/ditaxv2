// scan-prior-year-ai — Azure Document Intelligence (Switzerland North).
//
// DSGVO/FADP: PDF wird transient an Azure DI (CH-Region) übertragen,
// keine LLM-Aufrufe. Strukturierte Extraktion (Kategorien + Bank-/Depot-Konten)
// per Regel-Mapper aus Layout + Tabellen.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  analyzeDocument,
  AzureDocIntelError,
  AzureAnalyzeResult,
  extractPlainText,
  tableToRows,
} from "../_shared/azure-doc-intel.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type Category = "income" | "assets" | "deductions";

// ---------------------------------------------------------------------------
// Aargau Ziffern-Code → Dokumenten-Label.
// Eine Position gilt nur dann als aktiv, wenn auf einer Zeile genau dieser
// Code + ein davon verschiedener Betrag > 0 erscheint (siehe POSITION_LINE_RX).
// Das vermeidet False Positives durch Formular-Texte, die immer gedruckt sind.
// ---------------------------------------------------------------------------
interface CodeMapping {
  category: Category;
  label: string;
}

const AG_CODE_MAP: Record<string, CodeMapping> = {
  // EINKOMMEN
  "010": { category: "income", label: "Lohnausweis" },
  "020": { category: "income", label: "Lohnausweis" },
  "030": { category: "income", label: "Lohnausweis" },
  "040": { category: "income", label: "Lohnausweis" },
  "050": { category: "income", label: "Lohnausweis" },
  "060": { category: "income", label: "Lohnausweis" },
  "070": { category: "income", label: "Nachweis Selbständigerwerb" },
  "090": { category: "income", label: "Nachweis Selbständigerwerb" },
  "150": { category: "income", label: "Nachweis Personengesellschaft" },
  "160": { category: "income", label: "Nachweis Personengesellschaft" },
  "671": { category: "income", label: "Bestätigung Familien-/Mutterschaftszulagen" },
  "672": { category: "income", label: "Bestätigung Familien-/Mutterschaftszulagen" },
  "690": { category: "income", label: "Schwarzarbeit-Vereinfachtes Verfahren" },
  "1701": { category: "income", label: "Rentenbescheinigung (AHV/IV/PK)" },
  "1901": { category: "income", label: "Rentenbescheinigung (AHV/IV/PK)" },
  "240": { category: "income", label: "Wertschriften-/Depotverzeichnis" },
  "241": { category: "income", label: "Wertschriften-/Depotverzeichnis" },
  "251": { category: "income", label: "Bestätigung Alimente/Unterhalt" },
  "252": { category: "income", label: "Bestätigung Alimente/Unterhalt" },
  "253": { category: "income", label: "Bescheinigung unverteilte Erbschaft" },
  "254": { category: "income", label: "Beleg Kapitalabfindung wiederkehrende Leistungen" },
  "255": { category: "income", label: "Beleg übrige Einkünfte" },
  "2701": { category: "income", label: "Liegenschaftenverzeichnis" },
  "2711": { category: "income", label: "Liegenschaftenverzeichnis" },
  "2741": { category: "income", label: "Liegenschaftenverzeichnis" },
  "2791": { category: "income", label: "Liegenschaftenverzeichnis" },

  // ABZÜGE
  "300": { category: "deductions", label: "Total Abzüge (Übersicht)" },
  "310": { category: "deductions", label: "Schuldzinsen-Bescheinigung" },
  "311": { category: "deductions", label: "Schuldzinsen-Bescheinigung" },
  "312": { category: "deductions", label: "Schuldzinsen-Bescheinigung" },
  "361": { category: "deductions", label: "Beleg Unterhaltszahlung" },
  "362": { category: "deductions", label: "Beleg Unterhaltszahlung" },
  "363": { category: "deductions", label: "Bescheinigung Leibrente" },
  "371": { category: "deductions", label: "PK-Einkauf-Beleg (Säule 2)" },
  "372": { category: "deductions", label: "PK-Einkauf-Beleg (Säule 2)" },
  "381": { category: "deductions", label: "Säule 3a-Einzahlungsbestätigung" },
  "382": { category: "deductions", label: "Säule 3a-Einzahlungsbestätigung" },
  "383": { category: "deductions", label: "Krankenkassen-Prämienrechnung" },
  "387": { category: "deductions", label: "Beleg behinderungsbedingte Kosten" },
  "390": { category: "deductions", label: "Kinderbetreuungs-Beleg" },
  "391": { category: "deductions", label: "AHV/IV/EO-Beleg (Nichterwerbstätige)" },
  "392": { category: "deductions", label: "Parteibeitrags-Beleg" },
  "393": { category: "deductions", label: "Spendenbescheinigung" },
  "243": { category: "deductions", label: "Vermögensverwaltungskosten-Aufstellung" },
  "395": { category: "deductions", label: "Beleg weitere Abzüge" },
  "397": { category: "deductions", label: "Belege Krankheits-/Unfallkosten" },
  "650": { category: "deductions", label: "Belege Weiterbildungskosten" },
  "655": { category: "deductions", label: "Belege Weiterbildungskosten" },
  "2811": { category: "deductions", label: "Beleg Liegenschaftsunterhalt" },
  "2821": { category: "deductions", label: "Beleg Liegenschaftsunterhalt" },
  "2800": { category: "deductions", label: "Beleg Liegenschaftsunterhalt" },

  // VERMÖGEN
  "710": { category: "assets", label: "Wertschriften-/Depotverzeichnis (Steuerwert)" },
  "711": { category: "assets", label: "Wertschriften-/Depotverzeichnis (Steuerwert)" },
  "713": { category: "assets", label: "Bankkontoauszug per 31.12." },
  "716": { category: "assets", label: "Rückkaufswert Lebensversicherung" },
  "717": { category: "assets", label: "Anteil unverteilte Erbschaft" },
  "7181": { category: "assets", label: "Fahrzeugausweis / Eurotax" },
  "7182": { category: "assets", label: "Fahrzeugausweis / Eurotax" },
  "719": { category: "assets", label: "Beleg übrige Vermögenswerte" },
  "7201": { category: "assets", label: "Liegenschaftenverzeichnis" },
  "7202": { category: "assets", label: "Liegenschaftenverzeichnis" },
  "730": { category: "assets", label: "Anteil Personengesellschaft" },
  "740": { category: "assets", label: "Geschäftsaktiven-Bilanz" },
  "750": { category: "assets", label: "Schuldenverzeichnis" },
};

// Code + Betrag am Zeilenende. Beispiel: "... 010   111'606".
// Beträge: Schweizer Format mit Apostroph oder 1-6 Ziffern; Code 3-4-stellig.
const POSITION_LINE_RX =
  /(?:^|\s)(\d{3,4})\s+(\d{1,3}(?:[' ]\d{3})+(?:\.\d{2})?|\d{1,6}(?:\.\d{2})?)\s*$/;

function extractActiveCodes(lines: string[]): Set<string> {
  const active = new Set<string>();
  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    const m = line.match(POSITION_LINE_RX);
    if (!m) continue;
    const code = m[1];
    const amountRaw = m[2].replace(/[' ]/g, "");
    const amount = parseFloat(amountRaw);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    // Code darf nicht identisch mit Betrag sein (sonst ist's nur der Code).
    if (m[2].replace(/\s/g, "") === code) continue;
    active.add(code);
  }
  return active;
}


Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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

    // --- Azure DI Layout call ---
    const bytes = new Uint8Array(await file.arrayBuffer());
    const startedAt = Date.now();
    let result: AzureAnalyzeResult;
    try {
      result = await analyzeDocument(bytes, "application/pdf", "prebuilt-layout", 90_000);
    } catch (err) {
      const errMsg =
        err instanceof AzureDocIntelError ? `azure_${err.code}` : String((err as Error)?.message ?? err);
      await admin
        .from("prior_year_checklists")
        .update({ status: "failed", error_message: errMsg.slice(0, 500) })
        .eq("id", checklist.id);
      const status = err instanceof AzureDocIntelError && err.code === "azure_unauthorized" ? 502 : 502;
      return new Response(JSON.stringify({ error: errMsg }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log(`[scan-prior-year-ai] azure ms=${Date.now() - startedAt}`);

    // --- Category extraction (rule-based) ---
    const fullText = extractPlainText(result);
    const lines = fullText.split(/\r?\n/);

    const found = new Set<string>(); // dedupe by label
    const orderedRows: Array<{ category: Category; label: string }> = [];

    for (const item of CATEGORY_MAP) {
      let matched = false;
      for (const rx of item.patterns) {
        // Find a line containing the pattern AND an amount > 0 nearby.
        for (let i = 0; i < lines.length; i++) {
          if (!rx.test(lines[i])) continue;
          // amount on same line OR up to 2 following lines (column layouts)
          const window = lines.slice(i, i + 3).join(" ");
          if (AMOUNT_RX_LINE.test(window)) {
            matched = true;
            break;
          }
          // For pure-asset labels the form sometimes prints labels without
          // amounts on the same row — accept the label-only match too for
          // the major categories (we'd rather over-include than miss).
          matched = true;
          break;
        }
        if (matched) break;
      }
      if (matched && !found.has(item.label)) {
        found.add(item.label);
        orderedRows.push({ category: item.category, label: item.label });
      }
    }

    // --- Bank/Depot account extraction (table-based) ---
    const accounts = extractAccountsFromTables(result);

    // --- Persist ---
    await admin.from("prior_year_checklist_items").delete().eq("checklist_id", checklist.id);

    const rows: Array<{
      checklist_id: string;
      category: Category | "assets";
      label: string;
      source_value: null;
      sort_order: number;
    }> = [];
    let order = 0;
    for (const r of orderedRows) {
      rows.push({
        checklist_id: checklist.id,
        category: r.category,
        label: r.label,
        source_value: null,
        sort_order: order++,
      });
    }
    for (const acc of accounts) {
      rows.push({
        checklist_id: checklist.id,
        category: "assets",
        label: `Beleg Bankkonto/Depot – ${acc.institution} · ${acc.reference}`,
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
        raw_scan: { _source: "azure_layout", accountCount: accounts.length } as any,
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

// ----------------------------------------------------------------------------
// Account extraction from Wertschriften-/Guthabenverzeichnis tables
// ----------------------------------------------------------------------------

const IBAN_RX = /CH\d{2}[A-Z0-9 ]{17,28}/i;
const IBAN_OK = /^CH\d{2}[A-Z0-9]{17}$/;
const DEPOT_RX = /\b\d{5,14}\b/;
const DEPOT_OK = /^\d{5,14}$/;
const TYPE_CODE_RX = /^(?:BK|PC|Dep|V|L|G|M)\b/i;

interface ExtractedAccount {
  institution: string;
  reference: string;
}

function extractAccountsFromTables(result: AzureAnalyzeResult): ExtractedAccount[] {
  const out: ExtractedAccount[] = [];
  const seen = new Set<string>();

  for (const table of result.tables ?? []) {
    const rows = tableToRows(table);
    if (rows.length < 2) continue;

    // Find header row: must mention "Kto" or "Valoren" or "Bezeichnung".
    let headerRow = -1;
    for (let r = 0; r < Math.min(rows.length, 4); r++) {
      const joined = rows[r].join(" | ").toLowerCase();
      if (
        (joined.includes("kto") || joined.includes("valoren")) &&
        joined.includes("bezeichnung")
      ) {
        headerRow = r;
        break;
      }
    }
    if (headerRow < 0) continue;

    // Identify columns: "Kto-Nr Valoren-Nr" → reference; "Bezeichnung" → institution
    const header = rows[headerRow].map((c) => c.toLowerCase());
    let refCol = header.findIndex((h) => /kto|valoren/.test(h));
    let nameCol = header.findIndex((h) => /bezeichnung|beschreibung/.test(h));
    if (refCol < 0 || nameCol < 0) continue;

    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r];
      const refCell = (row[refCol] ?? "").trim();
      const nameCell = (row[nameCol] ?? "").trim();
      if (!refCell || !nameCell) continue;

      // Skip total/subtotal rows
      if (/^(?:zwischen)?total\b/i.test(nameCell) || /^summe/i.test(nameCell)) continue;

      // Strip type-codes that might bleed into the cell
      const cleanRef = refCell.replace(TYPE_CODE_RX, "").trim();

      let reference: string | null = null;
      const ibanMatch = cleanRef.match(IBAN_RX);
      if (ibanMatch) {
        reference = ibanMatch[0].toUpperCase().replace(/\s+/g, "");
      } else {
        const depotMatch = cleanRef.match(DEPOT_RX);
        if (depotMatch) reference = depotMatch[0];
      }
      if (!reference) continue;

      if (!IBAN_OK.test(reference) && !DEPOT_OK.test(reference)) {
        console.warn("scan-prior-year-ai: dropping implausible ref:", refCell);
        continue;
      }

      const normRef = reference.toUpperCase();
      if (seen.has(normRef)) continue;
      seen.add(normRef);

      // Institution: use the first non-numeric word group
      const institution = nameCell
        .replace(/\s{2,}/g, " ")
        .replace(/\b\d{1,2}\.\d{1,2}\.\d{2,4}\b/g, "") // strip dates
        .trim()
        .slice(0, 80) || "Bank/Depot";

      out.push({ institution, reference: refCell.trim().slice(0, 60) });
    }
  }

  return out;
}
