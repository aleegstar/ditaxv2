import React, { useRef, useState } from "react";
import {
  FileUp,
  Loader2,
  ShieldCheck,
  Sparkles,
  FileSearch,
  ScanLine,
  Brain,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  extractTextFromPdf,
  extractScanFromPdf,
  extractItemsFromText,
  hasUsableTextLayer,
  ocrPdfLocally,
  type ExtractedScan,
} from "@/services/PriorYearLocalExtractor";

const VertexMark: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={
      "flex items-center justify-center rounded-md bg-primary/10 text-primary " + (className ?? "")
    }
  >
    <Sparkles className="w-3.5 h-3.5" strokeWidth={1.75} />
  </div>
);

interface Props {
  taxFilerId: string;
  taxYear: string;
  onScanStarted?: () => void;
  /** Compact mode used inside the "Ersetzen"-Dialog */
  compact?: boolean;
}

const buildStoragePath = (userId: string, taxFilerId: string, taxYear: string) =>
  `${userId}/${taxFilerId}/${taxYear}.pdf`;

export const PriorYearUpload: React.FC<Props> = ({ taxFilerId, taxYear, onScanStarted, compact }) => {
  const { userId } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [phase, setPhase] = useState<"idle" | "parsing" | "ocr" | "structuring" | "ai">("idle");
  const [ocrProgress, setOcrProgress] = useState<{ page: number; total: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  // Vertex AI Gemini 2.5 Flash (Schweiz, europe-west6/Zürich) ist Standard – DSGVO-konform, keine Speicherung.
  const [aiEnabled, setAiEnabled] = useState(true);

  const handleToggleAi = (checked: boolean) => {
    setAiEnabled(checked);
  };


  const persistChecklist = async (
    scan: ExtractedScan,
    source: "local" | "ai",
    storagePath: string | null,
  ) => {
    const { data: checklist, error: cErr } = await supabase
      .from("prior_year_checklists")
      .upsert(
        {
          user_id: userId!,
          tax_filer_id: taxFilerId,
          tax_year: String(taxYear),
          status: "ready",
          source_storage_path: storagePath,
          error_message: null,
          raw_scan: { ...scan, _source: source } as any,
          generated_at: new Date().toISOString(),
        },
        { onConflict: "tax_filer_id,tax_year" },
      )
      .select()
      .single();
    if (cErr || !checklist) throw new Error(cErr?.message ?? "checklist upsert failed");

    await supabase.from("prior_year_checklist_items").delete().eq("checklist_id", checklist.id);

    const rows: any[] = [];
    let order = 0;
    (["income", "assets", "deductions"] as const).forEach((cat) => {
      for (const item of scan[cat] ?? []) {
        if (!item?.label) continue;
        rows.push({
          checklist_id: checklist.id,
          category: cat,
          label: String(item.label).slice(0, 300),
          source_value: null,
          sort_order: order++,
        });
      }
    });
    if (rows.length > 0) {
      const { error: insErr } = await supabase.from("prior_year_checklist_items").insert(rows);
      if (insErr) throw new Error(insErr.message);
    }
  };

  const uploadPdfToStorage = async (file: File): Promise<string | null> => {
    if (!userId) return null;
    try {
      const path = buildStoragePath(userId, taxFilerId, String(taxYear));
      const { error } = await supabase.storage
        .from("prior-year-returns")
        .upload(path, file, {
          contentType: "application/pdf",
          upsert: true,
        });
      if (error) {
        console.warn("[PriorYearUpload] storage upload failed", error);
        return null;
      }
      return path;
    } catch (e) {
      console.warn("[PriorYearUpload] storage upload exception", e);
      return null;
    }
  };

  const runAiScan = async (file: File) => {
    setPhase("ai");
    const form = new FormData();
    form.append("file", file);
    form.append("taxFilerId", taxFilerId);
    form.append("taxYear", String(taxYear));
    form.append("consent", "true");

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    const projectId = (import.meta as any).env?.VITE_SUPABASE_PROJECT_ID;
    const url = `https://${projectId}.supabase.co/functions/v1/scan-prior-year-vertex`;

    const { buildDeviceHeaders } = await import("@/lib/deviceVault");
    const deviceHeaders = await buildDeviceHeaders();

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...deviceHeaders,
      },
      body: form,
    });
    if (!resp.ok) {
      // Rate-Limit: lokalen Fallback signalisieren oder hartes Lifetime-Limit melden
      if (resp.status === 429) {
        let parsed: any = null;
        try { parsed = await resp.json(); } catch {}
        if (parsed?.reason === "lifetime_limit" || parsed?.reason === "lifetime_limit_device") {
          throw new Error(
            `Du hast die ${parsed.limit ?? 3} KI-Analysen für dieses Steuerjahr aufgebraucht. Bitte fülle die Checkliste manuell aus oder kontaktiere den Support.`,
          );
        }
        // Tageslimit → lokaler Fallback
        const err: any = new Error("ai_rate_limited");
        err.rateLimited = true;
        throw err;
      }
      const txt = await resp.text();
      throw new Error(`KI-Analyse fehlgeschlagen (${resp.status}): ${txt.slice(0, 200)}`);
    }
    toast.success("Checkliste per KI-Analyse erstellt.");
    onScanStarted?.();
  };

  const handleFile = async (file: File) => {
    if (!userId) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Datei ist zu gross (max. 20 MB)");
      return;
    }
    if (!/pdf/i.test(file.type) && !/\.pdf$/i.test(file.name)) {
      toast.error("Bitte ein PDF deiner Vorjahres-Steuererklärung hochladen.");
      return;
    }

    setWorking(true);
    setOcrProgress(null);
    try {
      // Upload PDF to private storage first (verschlüsselt im Supabase-Storage),
      // damit Du es später ersetzen kannst und unser Team es bei Bedarf einsehen kann.
      const storagePath = await uploadPdfToStorage(file);

      // Standardpfad: Gemini 2.5 Flash via Vertex AI (Schweiz, europe-west6) über Edge Function.
      if (aiEnabled) {
        try {
          await runAiScan(file);
          return;
        } catch (vertexErr: any) {
          console.warn("[PriorYearUpload] Vertex AI failed, falling back to local", vertexErr);
          if (vertexErr?.rateLimited) {
            toast.message("KI-Tageslimit erreicht – nutze lokale Erkennung.");
          } else {
            toast.message("KI-Analyse nicht verfügbar – nutze lokale Erkennung.");
          }
          // weiter mit lokalem Fallback unten
        }
      }

      // Lokaler Pfad — positionsbasiert direkt aus dem PDF.
      setPhase("parsing");
      let localScan: ExtractedScan | null = null;
      let usedOcr = false;
      try {
        localScan = await extractScanFromPdf(file);
      } catch (e) {
        console.warn("[PriorYearUpload] positional extraction failed", e);
      }

      const positionalTotal =
        (localScan?.income.length ?? 0) +
        (localScan?.assets.length ?? 0) +
        (localScan?.deductions.length ?? 0);

      if (positionalTotal === 0) {
        const flatText = await extractTextFromPdf(file);
        let usableText = flatText;
        if (!hasUsableTextLayer(flatText)) {
          setPhase("ocr");
          try {
            usableText = await ocrPdfLocally(file, {
              maxPages: 6,
              onProgress: (p) => setOcrProgress(p),
            });
            usedOcr = true;
          } catch (ocrErr) {
            console.error("[PriorYearUpload] OCR failed", ocrErr);
          }
        }
        if (!hasUsableTextLayer(usableText)) {
          toast.error(
            "Wir konnten aus diesem PDF keinen lesbaren Text gewinnen. Bitte fülle die Angaben manuell aus.",
          );
          return;
        }
        localScan = extractItemsFromText(usableText);
      }

      await persistChecklist(localScan!, "local", storagePath);
      const total =
        localScan!.income.length + localScan!.assets.length + localScan!.deductions.length;
      if (total === 0) {
        toast.message(
          "Keine Positionen automatisch erkannt – bitte ergänze die Checkliste manuell.",
        );
      } else {
        toast.success(
          usedOcr ? "Checkliste per lokalem OCR erstellt." : "Checkliste erstellt.",
        );
      }
      onScanStarted?.();

    } catch (e: any) {
      console.error(e);
      toast.error(`Analyse fehlgeschlagen: ${e?.message ?? "unbekannt"}`);
    } finally {
      setWorking(false);
      setPhase("idle");
      setOcrProgress(null);
    }
  };

  return (
    <div className={compact ? "space-y-4" : "rounded-2xl border border-border bg-card p-6 space-y-4"}>
      {!compact && (
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <FileUp className="w-5 h-5 text-primary" strokeWidth={1.75} />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-foreground tracking-tight">
              Vorjahres-Steuererklärung hochladen
            </h3>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Lade die definitive Steuererklärung {Number(taxYear) - 1} als PDF hoch.
              Wir erstellen daraus deine persönliche Checkliste für {taxYear}.
            </p>
          </div>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!working) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          if (working) return;
          const f = e.dataTransfer.files?.[0];
          if (f) handleFile(f);
        }}
        onClick={() => !working && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !working) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        className={`w-full rounded-2xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center gap-2 px-6 py-8 ${
          isDragging
            ? "border-primary bg-primary/5"
            : "border-border bg-background/60 hover:border-primary/50 hover:bg-primary/[0.03]"
        } ${working ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        {working ? (
          <>
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <div className="text-sm font-medium text-foreground">Analyse läuft …</div>
          </>
        ) : (
          <>
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <FileUp className="w-5 h-5 text-primary" strokeWidth={1.75} />
            </div>
            <div className="text-sm font-semibold text-foreground">
              PDF hierher ziehen oder auswählen
            </div>
            <div className="text-[12px] text-muted-foreground">
              Max. 20 MB · nur PDF
            </div>
          </>
        )}
      </div>
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={working}
        className="w-full"
      >
        {working ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Analyse läuft …
          </>
        ) : (
          "PDF auswählen"
        )}
      </Button>

      {/* Live-Progress mit Icons + Shimmer (ChatGPT-Style) */}
      {working && (
        <div className="rounded-xl border border-border bg-background/60 p-4 space-y-2.5 animate-fade-in">
          {(() => {
            const aiFlow = aiEnabled;
            const stages = aiFlow
              ? [
                  { key: "ai", icon: Sparkles, label: "Gemini analysiert dein PDF (Schweizer Server)", done: "PDF analysiert" },
                  { key: "structuring", icon: Brain, label: "Erstelle Dokumenten-Checkliste", done: "Checkliste erstellt" },
                ]
              : [
                  { key: "parsing", icon: FileSearch, label: "Lese PDF lokal aus", done: "PDF gelesen" },
                  { key: "ocr", icon: ScanLine, label: ocrProgress
                      ? `Texterkennung (OCR) · Seite ${ocrProgress.page}/${ocrProgress.total}`
                      : "Texterkennung (OCR) läuft", done: "Text erkannt" },
                  { key: "structuring", icon: Brain, label: "Strukturiere Belege & Kategorien", done: "Checkliste erstellt" },
                ];
            const order = aiFlow ? ["ai", "structuring"] : ["parsing", "ocr", "structuring"];
            const currentIdx = order.indexOf(phase);
            return stages.map((s, i) => {
              const Icon = s.icon;
              const isActive = currentIdx === i;
              const isDone = currentIdx > i;
              const isPending = currentIdx < i;
              return (
                <div
                  key={s.key}
                  className={`flex items-center gap-3 text-[13px] transition-opacity ${
                    isPending ? "opacity-40" : "opacity-100"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                      isDone
                        ? "bg-primary/10 text-primary"
                        : isActive
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4" strokeWidth={2} />
                    ) : isActive ? (
                      <Icon className="w-4 h-4 animate-pulse" strokeWidth={1.75} />
                    ) : (
                      <Icon className="w-4 h-4" strokeWidth={1.75} />
                    )}
                  </div>
                  {isActive ? (
                    <span className="shimmer-text font-medium">{s.label}…</span>
                  ) : (
                    <span className={isDone ? "text-foreground" : "text-muted-foreground"}>
                      {isDone ? s.done : s.label}
                    </span>
                  )}
                </div>
              );
            });
          })()}
        </div>
      )}

      {/* AI-Hinweis */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-start gap-3 min-w-0">
          <svg viewBox="0 0 48 48" className="w-7 h-7 shrink-0 mt-0.5" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.1 35.9 44 30.4 44 24c0-1.3-.1-2.4-.4-3.5z"/>
          </svg>
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground">
              Analyse mit Google KI in der Schweiz
            </div>
            <div className="text-[12px] text-muted-foreground leading-snug">
              Daten bleiben in der Schweiz · kein KI-Training mit deinen Daten
            </div>
          </div>
        </div>
        <Switch
          checked={aiEnabled}
          onCheckedChange={handleToggleAi}
          disabled={working}
          aria-label="Google KI-Analyse aktivieren"
        />
      </div>

      {/* Privacy Hinweis – dynamisch */}
      <div className="flex items-start gap-2 rounded-xl bg-muted/40 border border-border/60 p-3">
        <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={1.75} />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Dein PDF wird verschlüsselt in deinem privaten Bereich gespeichert</strong> –
          nur Du und unser Steuer-Team haben Zugriff. So kannst Du es jederzeit ersetzen.
          {aiEnabled
            ? " Für die Analyse wird es einmalig an Google in der Schweiz übermittelt, dort nicht gespeichert und nicht zum KI-Training verwendet."
            : " Die Analyse erfolgt lokal auf deinem Gerät."}
        </p>
      </div>

    </div>
  );

};
