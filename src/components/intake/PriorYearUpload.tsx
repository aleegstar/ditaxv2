import React, { useRef, useState } from "react";
import { FileUp, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  extractTextFromPdf,
  extractItemsFromText,
  pseudonymize,
  isLocalResultSufficient,
  hasUsableTextLayer,
  ocrPdfLocally,
  type ExtractedScan,
} from "@/services/PriorYearLocalExtractor";

interface Props {
  taxFilerId: string;
  taxYear: string;
  onScanStarted?: () => void;
}

export const PriorYearUpload: React.FC<Props> = ({ taxFilerId, taxYear, onScanStarted }) => {
  const { userId } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [working, setWorking] = useState(false);
  const [phase, setPhase] = useState<"idle" | "parsing" | "ocr" | "structuring">("idle");
  const [ocrProgress, setOcrProgress] = useState<{ page: number; total: number } | null>(null);

  const persistChecklist = async (scan: ExtractedScan, source: "local" | "ai") => {
    const { data: checklist, error: cErr } = await supabase
      .from("prior_year_checklists")
      .upsert(
        {
          user_id: userId!,
          tax_filer_id: taxFilerId,
          tax_year: String(taxYear),
          status: "ready",
          source_storage_path: null,
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
    setPhase("parsing");
    setOcrProgress(null);
    try {
      // 1) Lokale Text-Extraktion (PDF verlässt das Gerät nicht)
      let text = await extractTextFromPdf(file);
      let usedOcr = false;

      // 2) Wenn kein Text-Layer vorhanden: lokales OCR (immer noch auf dem Gerät)
      if (!hasUsableTextLayer(text)) {
        setPhase("ocr");
        try {
          text = await ocrPdfLocally(file, {
            maxPages: 6,
            onProgress: (p) => setOcrProgress(p),
          });
          usedOcr = true;
        } catch (ocrErr: any) {
          console.error("[PriorYearUpload] OCR failed", ocrErr);
        }
      }

      if (!hasUsableTextLayer(text)) {
        toast.error(
          "Wir konnten aus diesem PDF keinen lesbaren Text gewinnen. Bitte fülle die Angaben manuell aus.",
        );
        return;
      }

      const localScan = extractItemsFromText(text);
      if (isLocalResultSufficient(localScan)) {
        await persistChecklist(localScan, "local");
        toast.success(
          usedOcr
            ? "Checkliste per lokalem OCR erstellt – ohne Upload deiner Datei."
            : "Checkliste erstellt – ganz ohne Upload deiner Datei.",
        );
        onScanStarted?.();
        return;
      }

      // 3) Fallback: nur anonymisierter Text an Edge Function (kein PDF, keine PII)
      setPhase("structuring");
      const safeText = pseudonymize(text);
      const { error: fnErr } = await supabase.functions.invoke("scan-prior-year", {
        body: { taxFilerId, taxYear, text: safeText },
      });
      if (fnErr) throw fnErr;
      toast.success("Checkliste erstellt – nur anonymisierter Text wurde verarbeitet.");
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

  const buttonLabel = () => {
    if (phase === "parsing") return "Analysiere lokal …";
    if (phase === "ocr")
      return ocrProgress
        ? `Erkenne Text (OCR) … Seite ${ocrProgress.page}/${ocrProgress.total}`
        : "Erkenne Text (OCR) …";
    if (phase === "structuring") return "Strukturiere …";
    return "PDF auswählen";
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
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
            {buttonLabel()}
          </>
        ) : (
          "PDF auswählen"
        )}
      </Button>

      <div className="flex items-start gap-2 rounded-xl bg-muted/40 border border-border/60 p-3">
        <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" strokeWidth={1.75} />
        <p className="text-[12px] text-muted-foreground leading-relaxed">
          Dein PDF wird direkt auf deinem Gerät analysiert. Auch die Texterkennung (OCR) für
          gescannte PDFs läuft komplett in deinem Browser. Nur in seltenen Ausnahmen wird ein
          anonymisierter Text-Auszug (ohne Namen, AHV, IBAN oder Adresse) zur Strukturierung
          verarbeitet.
        </p>
      </div>
    </div>
  );
};
