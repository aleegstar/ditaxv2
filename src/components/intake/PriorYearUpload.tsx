import React, { useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Props {
  taxFilerId: string;
  taxYear: string;
  onScanStarted?: () => void;
}

export const PriorYearUpload: React.FC<Props> = ({ taxFilerId, taxYear, onScanStarted }) => {
  const { userId } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!userId) return;
    if (file.size > 20 * 1024 * 1024) {
      toast.error("Datei ist zu gross (max. 20 MB)");
      return;
    }
    if (!/pdf|image/.test(file.type)) {
      toast.error("Bitte PDF oder Bild hochladen");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "pdf";
      const path = `${userId}/${taxFilerId}/${taxYear}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("prior-year-returns")
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;

      const { error: fnErr } = await supabase.functions.invoke("scan-prior-year", {
        body: { taxFilerId, taxYear, storagePath: path },
      });
      if (fnErr) throw fnErr;
      toast.success("Upload erhalten – wir analysieren deine Steuererklärung …");
      onScanStarted?.();
    } catch (e: any) {
      console.error(e);
      toast.error(`Upload fehlgeschlagen: ${e?.message ?? "unbekannt"}`);
    } finally {
      setUploading(false);
    }
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
            Lade die definitive Steuererklärung {Number(taxYear) - 1} als PDF oder Foto hoch.
            Wir erstellen daraus deine persönliche Checkliste für {taxYear}.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/*"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
      />
      <Button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="w-full"
      >
        {uploading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Lädt hoch …</>) : "Datei auswählen"}
      </Button>
      <p className="text-[12px] text-muted-foreground">
        Deine Daten werden sicher verarbeitet und nur für diese Analyse verwendet.
      </p>
    </div>
  );
};
