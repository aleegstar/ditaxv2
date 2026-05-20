import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Check, AlertCircle, RefreshCw, ChevronDown, FileText, ChevronRight, Replace, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  AppDialog,
  AppDialogContent,
  AppDialogHeader,
  AppDialogTitle,
  AppDialogDescription,
} from "@/components/ui/app-dialog";
import { PriorYearUpload } from "./PriorYearUpload";
import {
  usePriorYearChecklist, type ChangeStatus, type ItemCategory, type ChecklistItem,
} from "@/hooks/usePriorYearChecklist";
import { useFormContext } from "@/contexts";
import { mapPriorYearToFormFlags } from "./priorYearMapping";
import { DOCUMENT_PROFILES } from "@/config/documentProfiles";

// Mapping Profil-Kategorie → Checklist-Kategorie
const PROFILE_TO_CHECKLIST: Record<string, ItemCategory> = {
  income: "income",
  pension: "income",
  assets: "assets",
  property: "assets",
  deductions: "deductions",
  debts: "deductions",
};

const CATALOG_BY_CATEGORY: Record<ItemCategory, { id: string; label: string }[]> = {
  contact: [],
  other: [],
  income: [],
  assets: [],
  deductions: [],
};
for (const p of Object.values(DOCUMENT_PROFILES)) {
  const cat = p.category ? PROFILE_TO_CHECKLIST[p.category] : undefined;
  if (!cat) continue;
  CATALOG_BY_CATEGORY[cat].push({ id: p.id, label: p.label });
}
for (const cat of Object.keys(CATALOG_BY_CATEGORY) as ItemCategory[]) {
  CATALOG_BY_CATEGORY[cat].sort((a, b) => a.label.localeCompare(b.label, "de"));
}

const CATEGORY_LABEL: Record<ItemCategory, string> = {
  contact: "Persönliche Daten",
  income: "Einkommen",
  assets: "Vermögen",
  deductions: "Abzüge",
  other: "Sonstiges",
};

const CATEGORY_QUESTION: Record<ItemCategory, string> = {
  contact: "Sind deine persönlichen Daten unverändert?",
  income: "Brauchst du diese Einkommens-Belege wieder?",
  assets: "Brauchst du diese Vermögens-Nachweise wieder?",
  deductions: "Brauchst du diese Abzugs-Belege wieder?",
  other: "Sind die übrigen Angaben unverändert?",
};

interface Props {
  taxFilerId: string;
  taxYear: string;
}

export interface PriorYearProgress {
  done: number;
  total: number;
  ready: boolean;
  status: "pending" | "scanning" | "ready" | "failed" | "loading";
  items: ChecklistItem[];
}

interface BodyProps extends Props {
  onProgress?: (p: PriorYearProgress) => void;
  hideHeader?: boolean;
}

export const PriorYearChecklistBody: React.FC<BodyProps> = ({ taxFilerId, taxYear, onProgress, hideHeader }) => {
  const { checklist, items, loading, reload, updateItem, bulkUpdateCategory, addItem, deleteItem } =
    usePriorYearChecklist(taxFilerId, taxYear);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [contactState, setContactState] = useState<{ confirmed: boolean; note: string }>({
    confirmed: false,
    note: "",
  });

  useEffect(() => {
    if (!checklist?.id) return;
    (async () => {
      const { data } = await supabase
        .from("prior_year_checklists")
        .select("contact_changes_confirmed_at, contact_changes_note")
        .eq("id", checklist.id)
        .maybeSingle();
      if (data) {
        setContactState({
          confirmed: !!(data as any).contact_changes_confirmed_at,
          note: (data as any).contact_changes_note ?? "",
        });
      }
    })();
  }, [checklist?.id]);

  // Compute progress
  const grouped = items.reduce<Record<ItemCategory, ChecklistItem[]>>((acc, it) => {
    if (it.category === "contact") return acc;
    (acc[it.category] ||= []).push(it); return acc;
  }, { contact: [], income: [], assets: [], deductions: [], other: [] });
  // Immer alle drei Belegkategorien anzeigen, auch wenn das Vorjahres-PDF
  // keine Position enthielt – der User kann dann manuell etwas hinzufügen.
  const categories: ItemCategory[] = ["income", "assets", "deductions"];
  const ready = checklist?.status === "ready";
  const totalCats = ready ? categories.length + 1 : 0;
  const doneCats = ready
    ? categories.filter(c => grouped[c].every(it => it.completed)).length + (contactState.confirmed ? 1 : 0)
    : 0;

  useEffect(() => {
    const status: PriorYearProgress["status"] =
      loading && !checklist ? "loading"
      : !checklist ? "pending"
      : (checklist.status as any);
    onProgress?.({ done: doneCats, total: totalCats, ready, status, items });
  }, [doneCats, totalCats, ready, loading, checklist?.status, items, onProgress]);

  const persistContact = async (next: { confirmed: boolean; note: string }) => {
    setContactState(next);
    if (!checklist?.id) return;
    await supabase
      .from("prior_year_checklists")
      .update({
        contact_changes_confirmed_at: next.confirmed ? new Date().toISOString() : null,
        contact_changes_note: next.note || null,
      } as any)
      .eq("id", checklist.id);
  };

  if (loading && !checklist) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Lädt …</span>
      </div>
    );
  }

  if (!checklist || checklist.status === "pending") {
    return <PriorYearUpload taxFilerId={taxFilerId} taxYear={taxYear} onScanStarted={reload} compact={hideHeader} />;
  }

  if (checklist.status === "scanning") {
    return (
      <div className="text-center space-y-3 py-4">
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
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
          <div>
            <h3 className="text-base font-semibold text-foreground">Analyse fehlgeschlagen</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {checklist.error_message ?? "Bitte versuche es mit einer anderen Datei."}
            </p>
          </div>
        </div>
        <PriorYearUpload taxFilerId={taxFilerId} taxYear={taxYear} onScanStarted={reload} compact={hideHeader} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {!hideHeader ? (
          <p className="text-[13px] text-muted-foreground">
            {doneCats} von {totalCats} Bereichen bestätigt
          </p>
        ) : (
          <span className="text-[13px] text-muted-foreground">
            {doneCats}/{totalCats} bestätigt
          </span>
        )}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setReplaceOpen(true)} title="Vorjahres-PDF ersetzen" className="h-9 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground">
            <Replace className="w-4 h-4" strokeWidth={1.75} />
            <span className="text-[12px] font-medium">Datei ersetzen</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={reload} title="Neu generieren" className="h-9 w-9 p-0 text-muted-foreground hover:text-foreground">
            <RefreshCw className="w-4 h-4" strokeWidth={1.75} />
          </Button>
        </div>
      </div>


      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all rounded-full"
          style={{ width: totalCats ? `${(doneCats / totalCats) * 100}%` : "0%" }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <PersonalDataCard state={contactState} onChange={persistContact} />
        {categories.map(cat => (
          <CompactCategoryCard
            key={cat}
            category={cat}
            items={grouped[cat]}
            onBulk={(patch) => bulkUpdateCategory(cat, patch)}
            onItem={(id, patch) => updateItem(id, patch)}
            onAdd={(label) => addItem(cat, label)}
            onDelete={(id) => deleteItem(id)}
          />
        ))}
      </div>

      <AppDialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <AppDialogContent size="default">
          <AppDialogHeader>
            <AppDialogTitle>Vorjahres-PDF ersetzen</AppDialogTitle>
            <AppDialogDescription>
              Lade ein neues PDF hoch. Deine bisherige Checkliste wird durch die
              Analyse der neuen Datei ersetzt.
            </AppDialogDescription>
          </AppDialogHeader>
          <PriorYearUpload
            taxFilerId={taxFilerId}
            taxYear={taxYear}
            compact
            onScanStarted={() => {
              setReplaceOpen(false);
              reload();
            }}
          />
        </AppDialogContent>
      </AppDialog>
    </div>
  );
};

// Backward-compat wrapper (kept for any legacy import)
export const PriorYearChecklist: React.FC<Props> = (props) => (
  <PriorYearChecklistBody {...props} />
);

const CompactCategoryCard: React.FC<{
  category: ItemCategory;
  items: ChecklistItem[];
  onBulk: (patch: Partial<ChecklistItem>) => void;
  onItem: (id: string, patch: Partial<ChecklistItem>) => void;
  onAdd: (label: string) => void;
  onDelete: (id: string) => void;
}> = ({ category, items, onBulk, onItem, onAdd, onDelete }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const allDone = items.every(i => i.completed);
  const allUnchanged = items.every(i => i.change_status === "unchanged");

  const visible = items.slice(0, 5);
  const rest = items.length - visible.length;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)] overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-[14px] font-semibold text-foreground tracking-tight">
          {CATEGORY_LABEL[category]}
        </h4>
        {allDone && (
          <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
          </div>
        )}
      </div>

      <ul className="space-y-1 mb-4 flex-1">
        {visible.map(it => (
          <li
            key={it.id}
            className="text-[13px] text-muted-foreground leading-snug flex gap-1.5"
          >
            <span className="text-muted-foreground/60">–</span>
            <span className="truncate">{it.label}</span>
          </li>
        ))}
        {rest > 0 && (
          <li className="text-[12px] text-muted-foreground/70 pl-3">
            +{rest} weitere
          </li>
        )}
      </ul>

      <div className="flex gap-2">
        {allUnchanged ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-[13px]"
            onClick={() => setEditOpen(true)}
          >
            Bearbeiten
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              className="flex-1 h-9 text-[13px]"
              onClick={() => onBulk({ change_status: "unchanged", completed: true })}
            >
              Bestätigen
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-[13px] px-3"
              onClick={() => setEditOpen(true)}
            >
              Bearbeiten
            </Button>
          </>
        )}
      </div>

      <AppDialog open={editOpen} onOpenChange={setEditOpen}>
        <AppDialogContent size="default">
          <AppDialogHeader>
            <AppDialogTitle>{CATEGORY_LABEL[category]} bearbeiten</AppDialogTitle>
            <AppDialogDescription>
              Markiere einzelne Positionen als unverändert, geändert oder entfallen.
            </AppDialogDescription>
          </AppDialogHeader>
          <div className="divide-y divide-border max-h-[60vh] overflow-y-auto -mx-2">
            {items.map(it => (
              <ItemRow
                key={it.id}
                item={it}
                onChange={(patch) => onItem(it.id, patch)}
                onDelete={it.change_status === "new" ? () => onDelete(it.id) : undefined}
              />
            ))}
          </div>
          <div className="pt-3 border-t border-border">
            <div className="text-[12px] font-medium text-foreground mb-2">
              Position hinzufügen
            </div>
            <div className="flex gap-2">
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newLabel.trim()) {
                    onAdd(newLabel);
                    setNewLabel("");
                  }
                }}
                placeholder="z. B. Zweite Anstellung, Krypto-Konto …"
                className="flex-1 text-[13px] rounded-lg border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-10 text-[13px]"
                disabled={!newLabel.trim()}
                onClick={() => { onAdd(newLabel); setNewLabel(""); }}
              >
                Hinzufügen
              </Button>
            </div>
          </div>
          <div className="flex justify-end pt-3">
            <Button onClick={() => setEditOpen(false)}>Fertig</Button>
          </div>
        </AppDialogContent>
      </AppDialog>
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
  onDelete?: () => void;
}> = ({ item, onChange, onDelete }) => {
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
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-[11px] text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded-md"
            aria-label="Entfernen"
          >
            Entfernen
          </button>
        )}
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

const DocumentsNextStep: React.FC<{
  items: ChecklistItem[];
  taxYear: string;
  locked?: boolean;
  remaining?: number;
}> = ({ items, taxYear, locked = false, remaining = 0 }) => {
  const navigate = useNavigate();
  const { saveSection, formData } = useFormContext();

  const handleProceed = async () => {
    if (locked) return;
    const flags = mapPriorYearToFormFlags(items);
    for (const section of ['income', 'assets', 'deductions'] as const) {
      const merged = { ...(formData?.[section] ?? {}), ...flags[section], _completed: true };
      await saveSection(section as any, merged, true);
    }
    navigate(`/form?section=unterlagen&year=${taxYear}`);
  };

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 space-y-4 shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)] transition-opacity ${
        locked
          ? "border-border bg-muted/30 opacity-80"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-start gap-3">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            locked ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
          }`}
        >
          {locked ? (
            <Lock className="w-[18px] h-[18px]" strokeWidth={1.75} />
          ) : (
            <FileText className="w-[18px] h-[18px]" strokeWidth={1.75} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] sm:text-[16px] font-semibold text-foreground tracking-[-0.012em]">
            Nächster Schritt: Dokumente hochladen
          </h3>
          <p className="text-[13px] sm:text-[14px] text-muted-foreground mt-1 leading-relaxed">
            {locked
              ? `Noch ${remaining} ${remaining === 1 ? "Bereich" : "Bereiche"} zu bestätigen, danach kannst du mit dem Dokumenten-Upload starten.`
              : "Auf Basis deiner Vorjahres-Steuererklärung haben wir die passende Dokumenten-Checkliste vorbereitet."}
          </p>
        </div>
      </div>

      <Button
        onClick={handleProceed}
        className="w-full"
        disabled={locked}
        aria-disabled={locked}
      >
        {locked ? (
          <>
            <Lock className="w-4 h-4 mr-1.5" strokeWidth={2} />
            Gesperrt
          </>
        ) : (
          <>
            Zur Dokumenten-Checkliste
            <ChevronRight className="w-4 h-4 ml-1.5" strokeWidth={2} />
          </>
        )}
      </Button>
    </div>
  );
};

const PersonalDataCard: React.FC<{
  state: { confirmed: boolean; note: string };
  onChange: (next: { confirmed: boolean; note: string }) => void;
}> = ({ state, onChange }) => {
  const [editOpen, setEditOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState(state.note);
  const hasNote = state.note.trim().length > 0;

  return (
    <div className="rounded-2xl border border-border bg-card p-4 flex flex-col shadow-[0_2px_12px_-4px_rgba(15,27,61,0.06)] overflow-hidden">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h4 className="text-[14px] font-semibold text-foreground tracking-tight">
          Persönliche Daten
        </h4>
        {state.confirmed && (
          <div className="w-5 h-5 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
            <Check className="w-3 h-3 text-emerald-600" strokeWidth={2.5} />
          </div>
        )}
      </div>

      <p className="text-[13px] text-muted-foreground leading-snug mb-4 flex-1">
        {hasNote
          ? state.note
          : "Gab es Änderungen zum Vorjahr (Adresse, Zivilstand, Kinder)?"}
      </p>

      <div className="flex gap-2">
        {state.confirmed ? (
          <Button
            variant="outline"
            size="sm"
            className="flex-1 h-9 text-[13px]"
            onClick={() => { setNoteDraft(state.note); setEditOpen(true); }}
          >
            Bearbeiten
          </Button>
        ) : (
          <>
            <Button
              size="sm"
              className="flex-1 h-9 text-[13px]"
              onClick={() => onChange({ confirmed: true, note: "" })}
            >
              Bestätigen
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 text-[13px] px-3"
              onClick={() => { setNoteDraft(state.note); setEditOpen(true); }}
            >
              Änderungen
            </Button>
          </>
        )}
      </div>

      <AppDialog open={editOpen} onOpenChange={setEditOpen}>
        <AppDialogContent size="default">
          <AppDialogHeader>
            <AppDialogTitle>Änderungen zu deinen persönlichen Daten</AppDialogTitle>
            <AppDialogDescription>
              Notiere kurz, was sich gegenüber dem Vorjahr geändert hat (z. B. Umzug, Heirat, neues Kind). Falls nichts geändert hat, lasse das Feld leer.
            </AppDialogDescription>
          </AppDialogHeader>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="z. B. Umzug nach Zürich per 01.05., zweites Kind geboren …"
            className="w-full text-[13px] rounded-lg border border-border bg-background p-3 focus:outline-none focus:ring-2 focus:ring-primary/30 min-h-[120px]"
          />
          <div className="flex justify-end gap-2 pt-3">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Abbrechen</Button>
            <Button onClick={() => { onChange({ confirmed: true, note: noteDraft.trim() }); setEditOpen(false); }}>
              Speichern
            </Button>
          </div>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
};
