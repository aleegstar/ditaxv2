import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChecklistStatus = "pending" | "scanning" | "ready" | "failed";
export type ChangeStatus = "pending" | "unchanged" | "changed" | "removed" | "new";
export type ItemCategory = "contact" | "income" | "assets" | "deductions" | "other";

export interface ChecklistRow {
  id: string;
  status: ChecklistStatus;
  source_storage_path: string | null;
  error_message: string | null;
  generated_at: string | null;
}
export interface ChecklistItem {
  id: string;
  checklist_id: string;
  category: ItemCategory;
  label: string;
  source_value: string | null;
  change_status: ChangeStatus;
  change_note: string | null;
  completed: boolean;
  sort_order: number;
}

export function usePriorYearChecklist(taxFilerId: string | null | undefined, taxYear: string) {
  const [checklist, setChecklist] = useState<ChecklistRow | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!taxFilerId || !taxYear) return;
    setLoading(true);
    try {
      const { data: cl } = await supabase
        .from("prior_year_checklists")
        .select("id,status,source_storage_path,error_message,generated_at")
        .eq("tax_filer_id", taxFilerId)
        .eq("tax_year", taxYear)
        .maybeSingle();
      setChecklist((cl as ChecklistRow) ?? null);
      if (cl?.id) {
        const { data: its } = await supabase
          .from("prior_year_checklist_items")
          .select("*")
          .eq("checklist_id", cl.id)
          .order("sort_order", { ascending: true });
        setItems((its as ChecklistItem[]) ?? []);
      } else {
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, [taxFilerId, taxYear]);

  useEffect(() => { load(); }, [load]);

  // Poll while scanning
  useEffect(() => {
    if (checklist?.status !== "scanning") return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [checklist?.status, load]);

  const updateItem = useCallback(async (id: string, patch: Partial<ChecklistItem>) => {
    setItems(prev => prev.map(it => (it.id === id ? { ...it, ...patch } : it)));
    await supabase.from("prior_year_checklist_items").update(patch as any).eq("id", id);
  }, []);

  const bulkUpdateCategory = useCallback(async (
    category: ItemCategory,
    patch: Partial<ChecklistItem>,
    checklistId?: string,
  ) => {
    setItems(prev => prev.map(it => (it.category === category ? { ...it, ...patch } : it)));
    const clId = checklistId ?? checklist?.id;
    if (!clId) return;
    await supabase
      .from("prior_year_checklist_items")
      .update(patch as any)
      .eq("checklist_id", clId)
      .eq("category", category);
  }, [checklist?.id]);

  return { checklist, items, loading, reload: load, updateItem, bulkUpdateCategory };
}
