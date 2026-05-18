import React, { useState } from "react";
import { Loader2, Check, AlertCircle, RefreshCw, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorYearUpload } from "./PriorYearUpload";
import {
  usePriorYearChecklist, type ChangeStatus, type ItemCategory, type ChecklistItem,
} from "@/hooks/usePriorYearChecklist";

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  contact: "Persönliche Daten",
  income: "Einkommen",
  assets: "Vermögen",
  deductions: "Abzüge",
  other: "Sonstiges",
};

const CATEGORY_QUESTION: Record<ItemCategory, string> = {
  contact: "Sind deine persönlichen Daten unverändert?",
  income: "Sind deine Einkommensquellen unverändert?",
  assets: "Ist dein Vermögen unverändert?",
  deductions: "Sind deine Abzüge unverändert?",
  other: "Sind die übrigen Angaben unverändert?",
};

interface Props {
  taxFilerId: string;
  taxYear: string;
}

export const PriorYearChecklist: React.FC<Props> = ({ taxFilerId, taxYear }) => {
  const { checklist, items, loading, reload, updateItem, bulkUpdateCategory } =
    usePriorYearChecklist(taxFilerId, taxYear);

  if (loading && !checklist) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 flex items-center gap-3">
        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Lädt …</span>
      </div>
    );
  }

  if (!checklist || checklist.status === "pending") {
    return <PriorYearUpload taxFilerId={taxFilerId} taxYear={taxYear} onScanStarted={reload} />;
  }

  if (checklist.status === "scanning") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
        <h3 className="text-base font-semibold text-foreground">Analyse läuft …</h3>
        <p className="text-sm text-muted-foreground">
          Wir extrahieren die Positionen aus deiner Vorjahres-Steuererklärung. Das dauert in der Regel weniger als eine Minute.
        </p>
      </div>
    );
  }

  if (checklist.status === "failed") {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 space-y-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Analyse fehlgeschlagen</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {checklist.error_message ?? "Bitte versuche es mit einer anderen Datei."}
            </p>
          </div>
        </div>
        <PriorYearUpload taxFilerId={taxFilerId} taxYear={taxYear} onScanStarted={reload} />
      </div>
    );
  }

  // ready – grouped, summary-first
  const grouped = items.reduce<Record<ItemCategory, ChecklistItem[]>>((acc, it) => {
    (acc[it.category] ||= []).push(it); return acc;
  }, { contact: [], income: [], assets: [], deductions: [], other: [] });

  const categories = (Object.keys(grouped) as ItemCategory[]).filter(c => grouped[c].length > 0);
  const totalCats = categories.length;
  const doneCats = categories.filter(c => grouped[c].every(it => it.completed)).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Deine persönliche Checkliste
            </h3>
            <p className="text-sm text-muted-foreground">
              {doneCats} von {totalCats} Bereichen bestätigt
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={reload}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: totalCats ? `${(doneCats / totalCats) * 100}%` : "0%" }}
          />
        </div>
      </div>

      <div className="space-y-3">
        {categories.map(cat => (
          <CategoryCard
            key={cat}
            category={cat}
            items={grouped[cat]}
            onBulk={(patch) => bulkUpdateCategory(cat, patch)}
            onItem={(id, patch) => updateItem(id, patch)}
          />
        ))}
      </div>
    </div>
  );
};

const CategoryCard: React.FC<{
  category: ItemCategory;
  items: ChecklistItem[];
  onBulk: (patch: Partial<ChecklistItem>) => void;
  onItem: (id: string, patch: Partial<ChecklistItem>) => void;
}> = ({ category, items, onBulk, onItem }) => {
  const allUnchanged = items.every(i => i.change_status === "unchanged");
  const anyChanged = items.some(i => i.change_status === "changed" || i.change_status === "removed");
  const allDone = items.every(i => i.completed);
  const [expanded, setExpanded] = useState(false);

  // Auto-expand when user picked "Geändert" on the category
  const showDetails = expanded || anyChanged;

  const preview = items
    .map(i => i.label)
    .slice(0, 4)
    .join(" · ") + (items.length > 4 ? ` · +${items.length - 4}` : "");

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground">
              {CATEGORY_LABEL[category]}
            </div>
            <h4 className="text-[15px] font-semibold text-foreground mt-0.5">
              {CATEGORY_QUESTION[category]}
            </h4>
            <p className="text-[13px] text-muted-foreground mt-1 line-clamp-2">
              {preview}
            </p>
          </div>
          {allDone && (
            <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Chip
            active={allUnchanged}
            label="Ja, alles unverändert"
            onClick={() => { onBulk({ change_status: "unchanged", completed: true }); setExpanded(false); }}
          />
          <Chip
            active={anyChanged && !allUnchanged}
            label="Es gab Änderungen"
            onClick={() => { setExpanded(true); }}
          />
        </div>

        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-[12px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showDetails ? "rotate-180" : ""}`} />
          {showDetails ? "Details ausblenden" : "Details anzeigen"}
        </button>
      </div>

      {showDetails && (
        <div className="border-t border-border divide-y divide-border bg-muted/20">
          {items.map(it => (
            <ItemRow key={it.id} item={it} onChange={(patch) => onItem(it.id, patch)} />
          ))}
        </div>
      )}
    </div>
  );
};

const Chip: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active, label, onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-foreground border-border hover:border-primary/30"
    }`}
  >
    {label}
  </button>
);

const ItemRow: React.FC<{
  item: ChecklistItem;
  onChange: (patch: Partial<ChecklistItem>) => void;
}> = ({ item, onChange }) => {
  const setStatus = (status: ChangeStatus) =>
    onChange({ change_status: status, completed: status !== "pending" });

  return (
    <div className="p-4 space-y-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground">{item.label}</div>
          {item.source_value && (
            <div className="text-[12px] text-muted-foreground mt-0.5">
              Vorjahr: {item.source_value}
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <MiniChip active={item.change_status === "unchanged"} label="Unverändert" onClick={() => setStatus("unchanged")} />
        <MiniChip active={item.change_status === "changed"} label="Geändert" onClick={() => setStatus("changed")} />
        <MiniChip active={item.change_status === "removed"} label="Entfällt" onClick={() => setStatus("removed")} />
      </div>

      {item.change_status === "changed" && (
        <textarea
          defaultValue={item.change_note ?? ""}
          onBlur={(e) => onChange({ change_note: e.target.value })}
          placeholder="Was hat sich geändert?"
          className="w-full text-[13px] rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[56px]"
        />
      )}
    </div>
  );
};

const MiniChip: React.FC<{ active: boolean; label: string; onClick: () => void }> = ({
  active, label, onClick,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-all ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-muted-foreground border-border hover:border-primary/30"
    }`}
  >
    {label}
  </button>
);
