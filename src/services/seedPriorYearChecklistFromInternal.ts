/**
 * Seeds a prior_year_checklists row (+ items) from existing Ditax form_data of
 * the previous tax year. Idempotent: never overwrites an existing checklist.
 *
 * Used when the user already completed last year's tax return inside Ditax —
 * they skip the PDF upload and go straight to the confirmation step.
 */

import { supabase } from "@/integrations/supabase/client";
import {
  buildItemsFromPriorYearFormData,
  type PriorYearFormSnapshot,
} from "@/components/intake/internalPriorYearMapping";

interface SeedParams {
  userId: string;
  taxFilerId: string;
  taxYear: string; // current year, e.g. "2025"
}

const RELEVANT_SECTIONS = ["income", "assets", "deductions", "contactInfo"] as const;

/**
 * Checks whether the previous year has at least one completed section for
 * this tax filer. Cheap query — safe to call on dashboard mount.
 */
export async function hasInternalPriorYearData({
  userId,
  taxFilerId,
  taxYear,
}: SeedParams): Promise<boolean> {
  if (!userId || !taxFilerId || !taxYear) return false;
  const previousYear = String(Number(taxYear) - 1);

  const { data, error } = await supabase
    .from("form_data")
    .select("form_type, data")
    .eq("user_id", userId)
    .eq("tax_filer_id", taxFilerId)
    .eq("tax_year", previousYear)
    .in("form_type", RELEVANT_SECTIONS as unknown as string[]);

  if (error || !data) return false;
  return data.some((row: any) => !!(row?.data && row.data._completed));
}

/**
 * Idempotent seed. If a prior_year_checklists row already exists for this
 * (tax_filer_id, tax_year), returns without changes. Otherwise creates a
 * 'ready' checklist with items derived from last year's form_data.
 *
 * @returns true if a fresh checklist was created, false if skipped or no data.
 */
export async function seedPriorYearChecklistFromInternal({
  userId,
  taxFilerId,
  taxYear,
}: SeedParams): Promise<boolean> {
  if (!userId || !taxFilerId || !taxYear) return false;
  const previousYear = String(Number(taxYear) - 1);

  // 1) Skip if a checklist already exists (upload flow or prior seed).
  const { data: existing } = await supabase
    .from("prior_year_checklists")
    .select("id")
    .eq("tax_filer_id", taxFilerId)
    .eq("tax_year", taxYear)
    .maybeSingle();
  if (existing?.id) return false;

  // 2) Load previous-year form_data sections.
  const { data: rows, error: rowsErr } = await supabase
    .from("form_data")
    .select("form_type, data")
    .eq("user_id", userId)
    .eq("tax_filer_id", taxFilerId)
    .eq("tax_year", previousYear)
    .in("form_type", RELEVANT_SECTIONS as unknown as string[]);
  if (rowsErr || !rows || rows.length === 0) return false;

  const snapshot: PriorYearFormSnapshot = {};
  for (const r of rows as any[]) {
    if (r.form_type === "income") snapshot.income = r.data;
    if (r.form_type === "assets") snapshot.assets = r.data;
    if (r.form_type === "deductions") snapshot.deductions = r.data;
  }

  const items = buildItemsFromPriorYearFormData(snapshot);
  // Even without items, create the checklist so the contact-confirmation card
  // is shown; mapping yielded nothing only means the prior year was very empty.

  // 3) Create the checklist row.
  const { data: checklist, error: clErr } = await supabase
    .from("prior_year_checklists")
    .insert({
      user_id: userId,
      tax_filer_id: taxFilerId,
      tax_year: String(taxYear),
      status: "ready",
      source_storage_path: null,
      error_message: null,
      raw_scan: {
        _source: "ditax_prior_year",
        _previousYear: previousYear,
        _generatedAt: new Date().toISOString(),
      } as any,
      generated_at: new Date().toISOString(),
    } as any)
    .select("id")
    .single();
  if (clErr || !checklist) {
    console.warn("[seedPriorYearChecklistFromInternal] checklist insert failed", clErr);
    return false;
  }

  // 4) Insert items.
  if (items.length > 0) {
    const rowsToInsert = items.map((it, idx) => ({
      checklist_id: checklist.id,
      category: it.category,
      label: it.label,
      source_value: null,
      sort_order: idx,
    }));
    const { error: itemsErr } = await supabase
      .from("prior_year_checklist_items")
      .insert(rowsToInsert);
    if (itemsErr) {
      console.warn("[seedPriorYearChecklistFromInternal] items insert failed", itemsErr);
    }
  }

  return true;
}
