import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileCode, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { assembleDossier } from '@/domain/canonical/mappers/fromFormData';
import {
  buildAGExportPackage,
  buildAGExportPayload,
  ExportValidationError,
} from '@/domain/canonical/export/ag';

interface Props {
  userId: string;
  taxFilerId: string | null;
  taxYear: string;
  userName: string;
}

/**
 * Admin button: builds a deterministic AG eTax .etax.zip export from the
 * selected user's form_data for the selected year and triggers a download.
 */
export const AgEtaxExportButton: React.FC<Props> = ({ userId, taxFilerId, taxYear, userName }) => {
  const [busy, setBusy] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (!taxFilerId) {
      toast({ title: 'Keine Person ausgewählt', description: 'Bitte zuerst eine steuerpflichtige Person auswählen.', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      const { data, error } = await supabase
        .from('form_data')
        .select('form_type, data')
        .eq('tax_filer_id', taxFilerId)
        .eq('tax_year', taxYear);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ form_type: string; data: Record<string, unknown> | null }>;
      if (!rows.length) throw new Error('Keine Formulardaten für diese Auswahl gefunden.');

      const merged: Record<string, unknown> = {};
      for (const r of rows) {
        const d = r.data ?? {};
        Object.assign(merged, d);
        if (r.form_type && !(r.form_type in merged)) merged[r.form_type] = d;
      }

      const dossier = assembleDossier({
        user_id: userId,
        tax_filer_id: taxFilerId,
        tax_year: taxYear,
        canton: 'AG',
        formData: merged,
      });
      const prepared = await buildAGExportPayload({
        dossier,
        dossierRevision: 1,
        rulesVersion: 'ag-2024.1',
        generatedAt: new Date().toISOString(),
      });
      const pkg = await buildAGExportPackage(prepared);

      const blob = new Blob([pkg.zipBytes as BlobPart], { type: 'application/zip' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeName = (userName || 'kunde').replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
      a.href = url;
      a.download = `AG_eTax_${safeName}_${taxYear}.etax.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: 'AG eTax Export erstellt', description: `Paket für ${taxYear} heruntergeladen.` });
    } catch (e) {
      const msg = e instanceof ExportValidationError
        ? e.validation.errors.map((f) => `${f.code} ${f.path ?? ''} — ${f.message}`).join('\n')
        : e instanceof Error ? e.message : String(e);
      toast({ title: 'AG Export fehlgeschlagen', description: msg, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={busy}
      variant="ghost"
      size="sm"
      className="h-8 px-3 text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg gap-1.5 font-normal"
      title="AG eTax Paket (.etax.zip) für dieses Jahr herunterladen"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
      <span className="hidden sm:inline text-xs">AG eTax</span>
    </Button>
  );
};

export default AgEtaxExportButton;
