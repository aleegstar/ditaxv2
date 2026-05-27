import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Copy, AlertTriangle } from "lucide-react";

interface SeedResult {
  email: string;
  password: string;
  role: string;
  tenant: string;
  user_id: string;
  tax_filer_id: string;
  tax_return_id: string;
}

export default function SeedAikido() {
  const [loading, setLoading] = useState(false);
  const [created, setCreated] = useState<SeedResult[]>([]);
  const [skipped, setSkipped] = useState<Array<{ email: string; reason: string }>>([]);
  const [error, setError] = useState<string | null>(null);

  const run = async (reset: boolean) => {
    if (reset && !confirm("Alle bestehenden aikido_*@ditax.test Accounts werden gelöscht und neu angelegt. Fortfahren?")) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("seed-aikido-users", {
        body: { reset },
      });
      if (error) throw error;
      setCreated(data?.created ?? []);
      setSkipped(data?.skipped ?? []);
      toast.success(`${data?.created?.length ?? 0} Aikido-Konten angelegt`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
      toast.error("Seed fehlgeschlagen");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    const text = created
      .map((c) => `${c.email} / ${c.password}  (${c.role}, Tenant ${c.tenant})`)
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("In Zwischenablage kopiert");
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Aikido Pentest — Testkonten</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Erstellt 6 Konten (2 Mandanten × Admin/Manager/Viewer) für Privilege-Escalation- und Cross-Tenant-Tests.
        </p>
      </div>

      <Card className="p-4 border-amber-300 bg-amber-50 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900">
          Stelle sicher, dass <code className="font-mono">PENTEST_MODE=true</code> gesetzt und Stripe im Testmodus ist,
          bevor Aikido scannt. Nach dem Scan: Cleanup über <code>cleanup-pentest-data</code>.
        </div>
      </Card>

      <div className="flex gap-3">
        <Button onClick={() => run(false)} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Seed (idempotent)
        </Button>
        <Button onClick={() => run(true)} disabled={loading} variant="outline">
          Reset & Seed
        </Button>
      </div>

      {error && (
        <Card className="p-4 border-destructive/50 bg-destructive/5 text-destructive text-sm whitespace-pre-wrap">
          {error}
        </Card>
      )}

      {created.length > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{created.length} Konten erstellt</h2>
            <Button size="sm" variant="outline" onClick={copyAll}>
              <Copy className="mr-2 h-4 w-4" /> Alle kopieren
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 pr-3">E-Mail</th>
                  <th className="py-2 pr-3">Passwort</th>
                  <th className="py-2 pr-3">Rolle</th>
                  <th className="py-2 pr-3">Tenant</th>
                </tr>
              </thead>
              <tbody>
                {created.map((c) => (
                  <tr key={c.email} className="border-b last:border-0">
                    <td className="py-2 pr-3">{c.email}</td>
                    <td className="py-2 pr-3 select-all">{c.password}</td>
                    <td className="py-2 pr-3">{c.role}</td>
                    <td className="py-2 pr-3">{c.tenant}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {skipped.length > 0 && (
        <Card className="p-4 text-sm">
          <h3 className="font-semibold mb-2">Übersprungen ({skipped.length})</h3>
          <ul className="space-y-1 text-muted-foreground">
            {skipped.map((s) => (
              <li key={s.email}><span className="font-mono">{s.email}</span> — {s.reason}</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
