import React, { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  taxFilerId: string | null;
  taxYear: string;
}

/**
 * Admin-only viewer for the uploaded prior-year tax return PDF.
 * Renders nothing when no PDF was uploaded for the selected filer/year.
 */
export const PriorYearReturnCard: React.FC<Props> = ({ taxFilerId, taxYear }) => {
  const [path, setPath] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiConsent, setAiConsent] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setPath(null);
      setUrl(null);
      setAiConsent(null);
      if (!taxFilerId || !taxYear) {
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("prior_year_checklists")
        .select("source_storage_path, ai_consent_at")
        .eq("tax_filer_id", taxFilerId)
        .eq("tax_year", String(taxYear))
        .maybeSingle();
      if (cancelled) return;
      if (error || !data?.source_storage_path) {
        setLoading(false);
        return;
      }
      setPath(data.source_storage_path);
      setAiConsent((data as any).ai_consent_at ?? null);
      const { data: signed } = await supabase.storage
        .from("prior-year-returns")
        .createSignedUrl(data.source_storage_path, 60 * 60);
      if (!cancelled) setUrl(signed?.signedUrl ?? null);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [taxFilerId, taxYear]);

  if (loading) {
    return (
      <Card className="border-white/40 shadow-sm bg-white/40 backdrop-blur-lg mb-3">
        <CardContent className="py-4 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Vorjahres-PDF wird geprüft…
        </CardContent>
      </Card>
    );
  }
  if (!path) return null;

  return (
    <Card className="border-white/40 shadow-sm bg-white/40 backdrop-blur-lg mb-3">
      <CardContent className="py-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
          <FileText className="w-4.5 h-4.5 text-primary" strokeWidth={1.8} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-foreground">
            Vorjahres-Steuererklärung ({Number(taxYear) - 1})
          </div>
          <div className="text-[11px] text-muted-foreground truncate">
            {path}{aiConsent ? " · KI-Consent erteilt" : ""}
          </div>
        </div>
        {url && (
          <>
            <Button asChild variant="outline" size="sm">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-3.5 h-3.5 mr-1" /> Öffnen
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={url} download>
                <Download className="w-3.5 h-3.5 mr-1" /> Download
              </a>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PriorYearReturnCard;
