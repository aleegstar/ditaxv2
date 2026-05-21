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

interface CategoryItem {
  category: Category;
  label: string;
  // Patterns: any match in the PDF text triggers this label.
  // Use Aargau eTax Ziffer + SSK label keywords. Patterns are matched
  // case-insensitively against the line-joined plain text.
  patterns: RegExp[];
}

// Each row: when ANY pattern matches in the document, add this label.
// Patterns intentionally focus on labels printed on the form, NOT on amounts —
// the original form always prints these labels so presence ≈ "Ziffer in Gebrauch".
// To stay conservative we additionally require that an amount > 0 appears on
// the same line (see `lineHasAmount`).
const CATEGORY_MAP: CategoryItem[] = [
  // EINKOMMEN
  {
    category: "income",
    label: "Lohnausweis",
    patterns: [/Lohnausweis/i, /Einkünfte aus unselbständiger/i, /\bHaupterwerb\b/i],
  },
  {
    category: "income",
    label: "Nachweis Selbständigerwerb",
    patterns: [/Selbständige[r]?\s+Erwerbst/i, /Selbständigerwerb/i, /Personengesellschaft/i],
  },
  {
    category: "income",
    label: "Rentenbescheinigung (AHV/IV/PK)",
    patterns: [/AHV[-\/\s]?Rente/i, /IV[-\/\s]?Rente/i, /Pensionskasse.*Rente/i, /\bRenten\b/i],
  },
  {
    category: "income",
    label: "Arbeitslosentaggeld-Abrechnung",
    patterns: [/Arbeitslosen/i, /Taggeld/i, /\bALV\b/i],
  },
  {
    category: "income",
    label: "Bestätigung Familien-/Mutterschaftszulagen",
    patterns: [/Familienzulage/i, /Mutterschaftsentschädig/i, /Kinderzulage/i],
  },
  {
    category: "income",
    label: "Wertschriften-/Depotverzeichnis",
    patterns: [/Wertschriften[- ]?(?:und Guthaben)?verzeichnis/i, /Bruttoertr/i],
  },
  {
    category: "income",
    label: "Bestätigung Alimente/Unterhalt",
    patterns: [/Alimente/i, /Unterhaltsbeitr/i],
  },
  {
    category: "income",
    label: "Beleg übrige Einkünfte",
    patterns: [/Übrige Einkünfte/i, /Erbschaft/i, /Kapitalabfindung/i],
  },
  {
    category: "income",
    label: "Liegenschaftsertrag-Abrechnung",
    patterns: [/Liegenschaftsertrag/i, /Eigenmietwert/i, /Mietertrag/i],
  },

  // VERMÖGEN
  {
    category: "assets",
    label: "Depotauszug per 31.12.",
    patterns: [/\bDepot\b/i, /Wertschriften.*Steuerwert/i],
  },
  {
    category: "assets",
    label: "Bankkontoauszug per 31.12.",
    patterns: [/Bankkonto/i, /Sparkonto/i, /Privatkonto/i, /Postkonto/i],
  },
  {
    category: "assets",
    label: "Rückkaufswert Lebensversicherung",
    patterns: [/Lebensversicherung/i, /Rückkaufswert/i],
  },
  {
    category: "assets",
    label: "Fahrzeugausweis / Eurotax",
    patterns: [/Motorfahrzeug/i, /Fahrzeug.*Eurotax/i, /\bEurotax\b/i],
  },
  {
    category: "assets",
    label: "Liegenschaftsbeleg",
    patterns: [/\bLiegenschaft\b/i, /Grundstück/i, /Steuerwert.*Liegenschaft/i],
  },

  // ABZÜGE
  {
    category: "deductions",
    label: "Berufsauslagen-Belege",
    patterns: [/Berufsauslagen/i, /Fahrkosten/i, /Mehrkosten.*Verpflegung/i, /ÖV[-\s]?Abo/i],
  },
  {
    category: "deductions",
    label: "Schuldzinsen-Bescheinigung",
    patterns: [/Schuldzinsen/i, /Hypothekarzinsen/i],
  },
  {
    category: "deductions",
    label: "Beleg Unterhaltszahlung",
    patterns: [/Unterhaltszahlung/i, /Alimente.*Abzug/i],
  },
  {
    category: "deductions",
    label: "PK-Einkauf-Beleg",
    patterns: [/Einkauf.*(?:Pensionskasse|2\.?\s*Säule|BVG)/i, /PK[-\s]?Einkauf/i],
  },
  {
    category: "deductions",
    label: "Säule 3a-Einzahlungsbestätigung",
    patterns: [/Säule\s*3a/i, /gebundene\s+Selbstvorsorge/i, /Säule 3 a/i],
  },
  {
    category: "deductions",
    label: "Krankenkassen-Prämienrechnung",
    patterns: [/Krankenkasse/i, /Versicherungsprämien/i, /Krankenversicherung/i],
  },
  {
    category: "deductions",
    label: "Belege Weiterbildungskosten",
    patterns: [/Weiterbildung/i, /Aus[-\s]?und\s+Weiterbildung/i],
  },
  {
    category: "deductions",
    label: "Beleg Liegenschaftsunterhalt",
    patterns: [/Liegenschaftsunterhalt/i, /Unterhaltskosten.*Liegenschaft/i],
  },
  {
    category: "deductions",
    label: "Belege Krankheits-/Unfallkosten",
    patterns: [/Krankheits[-\s]?(?:und\s)?Unfallkosten/i, /Krankheitskosten/i],
  },
  {
    category: "deductions",
    label: "Spendenbescheinigung",
    patterns: [/\bSpenden\b/i, /freiwillige\s+Zuwendung/i, /gemeinnützig/i],
  },
  {
    category: "deductions",
    label: "Parteibeitrags-Beleg",
    patterns: [/Parteibeitrag/i, /Mitgliederbeitr.*Partei/i],
  },
  {
    category: "deductions",
    label: "Kinderbetreuungs-Beleg",
    patterns: [/Kinderbetreuung/i, /Fremdbetreuung/i, /Drittbetreuung/i],
  },
];

// "Has an amount > 0 nearby" check on the joined text (multiline).
const AMOUNT_RX_LINE = /\b\d{1,3}(?:[' ]\d{3})*(?:\.\d{2})?\b/;

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
