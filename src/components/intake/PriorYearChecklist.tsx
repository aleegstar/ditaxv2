import React from "react";
import { Loader2, Check, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PriorYearUpload } from "./PriorYearUpload";
import {
  usePriorYearChecklist, type ChangeStatus, type ItemCategory,
} from "@/hooks/usePriorYearChecklist";

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  contact: "Persönliche Daten",
  income: "Einkommen",
  assets: "Vermögen",
  deductions: "Abzüge",
  other: "Sonstiges",
};

interface Props {
  taxFilerId: string;
  taxYear: string;
}

export const PriorYearChecklist: React.FC<Props> = ({ taxFilerId, taxYear }) => {
  const { checklist, items, loading, reload, updateItem } = usePriorYearChecklist(taxFilerId, taxYear);

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

  // ready
  const grouped = items.reduce<Record<ItemCategory, typeof items>>((acc, it) => {
    (acc[it.category] ||= []).push(it); return acc;
  }, { contact: [], income: [], assets: [], deductions: [], other: [] });

  const total = items.length;
  const done = items.filter(i => i.completed).length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Deine persönliche Checkliste
            </h3>
            <p className="text-sm text-muted-foreground">
              {done} von {total} Positionen bestätigt
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={reload}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: total ? `${(done / total) * 100}%` : "0%" }}
          />
        </div>
      </div>

      {(Object.keys(grouped) as ItemCategory[]).map(cat => {
        const list = grouped[cat];
        if (!list.length) return null;
        return (
          <div key={cat} className="space-y-2">
            <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {CATEGORY_LABEL[cat]}
            </h4>
            <div className="rounded-2xl border border-border bg-card overflow-hidden divide-y divide-border">
              {list.map(it => (
                <ChecklistRow
                  key={it.id}
                  item={it}
                  onChange={(patch) => updateItem(it.id, patch)}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

const ChangeChip: React.FC<{
  status: ChangeStatus; active: boolean; label: string; onClick: () => void;
}> = ({ active, label, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background text-muted-foreground border-border hover:border-primary/30"
    }`}
  >
    {label}
  </button>
);

type ChecklistItemType = ReturnType<typeof usePriorYearChecklist>["items"][number];
const ChecklistRow: React.FC<{
  item: ChecklistItemType;
  onChange: (patch: Partial<ChecklistItemType>) => void;
}> = ({ item, onChange }) => {
  const setStatus = (status: ChangeStatus) =>
    onChange({ change_status: status, completed: status !== "pending" });

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium text-foreground">{item.label}</div>
          {item.source_value && (
            <div className="text-[12px] text-muted-foreground mt-0.5">
              Vorjahr: {item.source_value}
            </div>
          )}
        </div>
        {item.completed && (
          <div className="w-6 h-6 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-600" strokeWidth={2.5} />
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <ChangeChip status="unchanged" active={item.change_status === "unchanged"} label="Unverändert" onClick={() => setStatus("unchanged")} />
        <ChangeChip status="changed" active={item.change_status === "changed"} label="Geändert" onClick={() => setStatus("changed")} />
        <ChangeChip status="removed" active={item.change_status === "removed"} label="Entfällt" onClick={() => setStatus("removed")} />
      </div>

      {item.change_status === "changed" && (
        <textarea
          defaultValue={item.change_note ?? ""}
          onBlur={(e) => onChange({ change_note: e.target.value })}
          placeholder="Was hat sich geändert? (z.B. neuer Arbeitgeber, anderer Betrag)"
          className="w-full text-[13px] rounded-lg border border-border bg-background p-2.5 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[60px]"
        />
      )}
    </div>
  );
};
