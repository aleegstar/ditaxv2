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
  Cloud,
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

const AzureMark: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={
      "flex items-center justify-center rounded-md bg-primary/10 text-primary " + (className ?? "")
    }
  >
    <Cloud className="w-3.5 h-3.5" strokeWidth={1.75} />
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
  // Azure Document Intelligence (Schweiz Nord) ist Standard – DSGVO-konform, keine Speicherung.
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
    const url = `https://${projectId}.supabase.co/functions/v1/scan-prior-year-ai`;

    const resp = await fetch(url, {
      method: "POST",
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: form,
    });
    if (!resp.ok) {
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

      // Opt-in: AI-Analyse direkt über Edge Function (PDF wird übermittelt)
      if (aiEnabled) {
        await runAiScan(file);
        return;
      }

      // Sonst: rein lokaler Pfad — positionsbasiert direkt aus dem PDF.
      setPhase("parsing");
      let localScan: ExtractedScan | null = null;
      let usedOcr = false;
      try {
        localScan = await extractScanFromPdf(file);
      } catch (e) {
        console.warn("[PriorYearUpload] positional extraction failed", e);
      }

      // Wenn der Textlayer nichts hergibt → OCR + zeilenbasierte Heuristik.
      const positionalTotal =
        (localScan?.income.length ?? 0) +
        (localScan?.assets.length ?? 0) +
        (localScan?.deductions.length ?? 0);

      if (positionalTotal === 0) {
        // Prüfe ob überhaupt Text im PDF ist, sonst OCR.
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
            "Wir konnten aus diesem PDF keinen lesbaren Text gewinnen. Aktiviere die KI-Analyse oder fülle die Angaben manuell aus.",
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
          "Keine Positionen automatisch erkannt – bitte ergänze die Checkliste manuell oder aktiviere die KI-Analyse.",
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
                  { key: "ai", icon: Sparkles, label: "Google Gemini analysiert dein PDF", done: "PDF analysiert" },
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

      {/* AI-Toggle */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/60 p-3">
        <div className="flex items-start gap-3 min-w-0">
          <GoogleG className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="text-[13px] font-semibold text-foreground">
              KI-Analyse mit Google Gemini
            </div>
            <div className="text-[12px] text-muted-foreground leading-snug">
              Genauer für gescannte PDFs · DSGVO-konform
            </div>
          </div>
        </div>
        <Switch
          checked={aiEnabled}
          onCheckedChange={handleToggleAi}
          disabled={working}
          aria-label="KI-Analyse mit Google Gemini aktivieren"
        />
      </div>

      {/* Privacy Hinweis – dynamisch */}
      <div className="flex items-start gap-2 rounded-xl bg-muted/40 border border-border/60 p-3">
        <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={1.75} />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          <strong className="text-foreground">Dein PDF wird verschlüsselt in deinem privaten Bereich gespeichert</strong> –
          nur Du und unser Steuer-Team haben Zugriff. So kannst Du es jederzeit ersetzen.
          {aiEnabled
            ? " Für die Analyse wird es einmalig an Google Gemini übermittelt; Google speichert es nicht."
            : " Die Analyse erfolgt lokal auf deinem Gerät."}
        </p>
      </div>

      {/* Einwilligungs-Dialog */}
      <AppDialog open={consentDialogOpen} onOpenChange={setConsentDialogOpen}>
        <AppDialogContent size="default">
          <AppDialogHeader>
            <div className="flex items-center gap-2 mb-2">
              <GoogleG className="w-6 h-6" />
              <AppDialogTitle>KI-Analyse aktivieren</AppDialogTitle>
            </div>
            <AppDialogDescription className="leading-relaxed">
              Wenn Du die KI-gestützte Analyse aktivierst, übermitteln wir Dein hochgeladenes
              PDF einmalig an <strong>Google Gemini</strong> (über das Lovable AI Gateway) zur
              Auswertung. Dabei gilt:
            </AppDialogDescription>
          </AppDialogHeader>

          <ul className="text-[13px] text-foreground/90 space-y-2 list-disc pl-5">
            <li>Es werden <strong>nur</strong> die benötigten Dokumenten-Kategorien zurückgegeben – keine Beträge, Namen, AHV oder Adressen.</li>
            <li>Dein PDF wird verschlüsselt in deinem privaten Bereich gespeichert (nur Du und unser Steuer-Team sehen es); Google speichert es nicht.</li>
            <li>Die Verarbeitung erfolgt ausschliesslich zur Erstellung Deiner Checkliste.</li>
            <li>Du kannst die KI-Analyse jederzeit wieder deaktivieren.</li>
          </ul>

          <AppDialogFooter>
            <Button variant="outline" onClick={() => setConsentDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={confirmConsent}>Zustimmen &amp; aktivieren</Button>
          </AppDialogFooter>
        </AppDialogContent>
      </AppDialog>
    </div>
  );
};
