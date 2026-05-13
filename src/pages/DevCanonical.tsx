/**
 * /dev/canonical — internal canonical dossier inspection (admin-only).
 *
 * Read-only. Lets developers verify dual-write correctness, snapshot history
 * and field provenance. Intentionally minimal styling — JSON-first.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { canonicalRepository, syncDossierFromFormData, buildSeedFormData, type SeedScenario, type SyncStatus } from '@/domain/canonical';
import { useTaxFiler } from '@/contexts/TaxFilerContext';

interface DossierRow {
  id: string;
  tax_filer_id: string;
  tax_year: string;
  current_revision: number;
  status: string;
  updated_at: string;
}

export default function DevCanonical() {
  const { userId } = useAuth();
  const { activeTaxFilerId } = useTaxFiler();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dossier, setDossier] = useState<Record<string, unknown> | null>(null);
  const [snapshots, setSnapshots] = useState<Array<{ id: string; revision: number; reason: string; created_at: string }>>([]);
  const [snapshotBody, setSnapshotBody] = useState<Record<string, unknown> | null>(null);
  const [tab, setTab] = useState<'dossier' | 'provenance' | 'snapshots'>('dossier');
  const [seedYear, setSeedYear] = useState('2024');
  const [scenario, setScenario] = useState<SeedScenario>('single_employee');
  const [busy, setBusy] = useState(false);
  const [lastSync, setLastSync] = useState<SyncStatus | null>(null);

  // Admin gate
  useEffect(() => {
    (async () => {
      if (!userId) { setIsAdmin(false); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [userId]);

  const loadList = async () => {
    if (!userId) return;
    const rows = await canonicalRepository.listDossiersForUser(userId);
    setDossiers(rows);
  };
  useEffect(() => { if (isAdmin) loadList(); }, [isAdmin, userId]);

  useEffect(() => {
    if (!selectedId) { setDossier(null); setSnapshots([]); return; }
    (async () => {
      setDossier(await canonicalRepository.getDossier(selectedId));
      setSnapshots(await canonicalRepository.listSnapshots(selectedId));
    })();
  }, [selectedId]);

  const provenance = useMemo(() => (dossier?.provenance as unknown[]) ?? [], [dossier]);

  const handleSeed = async () => {
    if (!userId || !activeTaxFilerId) return;
    setBusy(true);
    const status = await syncDossierFromFormData({
      user_id: userId,
      tax_filer_id: activeTaxFilerId,
      tax_year: seedYear,
      formData: buildSeedFormData(scenario),
    });
    setLastSync(status);
    await loadList();
    if (status.dossier_id) setSelectedId(status.dossier_id);
    setBusy(false);
  };

  const handleSnapshot = async () => {
    if (!selectedId) return;
    setBusy(true);
    await canonicalRepository.createSnapshot(selectedId, 'manual');
    setSnapshots(await canonicalRepository.listSnapshots(selectedId));
    setDossier(await canonicalRepository.getDossier(selectedId));
    setBusy(false);
  };

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6 text-destructive">Admin only.</div>;

  return (
    <div className="p-6 space-y-4 text-sm">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Canonical Dossier Inspector</h1>
        <span className="text-xs text-muted-foreground">read-only · dev</span>
      </header>

      <section className="border rounded p-3 space-y-2">
        <h2 className="font-medium">Seed test dossier</h2>
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border rounded px-2 py-1" value={scenario} onChange={(e) => setScenario(e.target.value as SeedScenario)}>
            <option value="single_employee">single_employee</option>
            <option value="married_with_children">married_with_children</option>
            <option value="investor_pillar3a">investor_pillar3a</option>
          </select>
          <input className="border rounded px-2 py-1 w-24" value={seedYear} onChange={(e) => setSeedYear(e.target.value)} />
          <button disabled={busy || !activeTaxFilerId} onClick={handleSeed} className="px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">
            {busy ? '…' : 'Seed → dual-write'}
          </button>
          {!activeTaxFilerId && <span className="text-xs text-destructive">No active tax filer.</span>}
          {lastSync && (
            <span className="text-xs text-muted-foreground">
              {lastSync.ok ? `✓ rev ${lastSync.revision} · ${lastSync.duration_ms}ms` : `✗ ${lastSync.error}`}
            </span>
          )}
        </div>
      </section>

      <section className="grid grid-cols-12 gap-4">
        <aside className="col-span-4 border rounded p-2 max-h-[70vh] overflow-auto">
          <h2 className="font-medium mb-2">Dossiers ({dossiers.length})</h2>
          <ul className="space-y-1">
            {dossiers.map((d) => (
              <li key={d.id}>
                <button
                  onClick={() => setSelectedId(d.id)}
                  className={`w-full text-left px-2 py-1 rounded ${selectedId === d.id ? 'bg-accent' : 'hover:bg-muted'}`}
                >
                  <div className="font-mono text-xs truncate">{d.id}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.tax_year} · rev {d.current_revision} · {d.status}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <main className="col-span-8 border rounded p-3 max-h-[70vh] overflow-auto space-y-3">
          {!selectedId ? (
            <div className="text-muted-foreground">Select a dossier.</div>
          ) : (
            <>
              <div className="flex gap-2">
                {(['dossier', 'provenance', 'snapshots'] as const).map((t) => (
                  <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-xs ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{t}</button>
                ))}
                <button disabled={busy} onClick={handleSnapshot} className="ml-auto px-3 py-1 rounded text-xs border">Create snapshot</button>
              </div>

              {tab === 'dossier' && (
                <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(dossier, null, 2)}</pre>
              )}
              {tab === 'provenance' && (
                <table className="text-xs w-full">
                  <thead><tr className="text-left"><th>entity</th><th>field</th><th>source</th><th>conf</th><th>extracted_at</th></tr></thead>
                  <tbody>
                    {provenance.map((p: any, i) => (
                      <tr key={i} className="border-t">
                        <td className="pr-2">{p.entity_table}</td>
                        <td className="pr-2 font-mono">{p.field_path}</td>
                        <td className="pr-2">{p.source_type}</td>
                        <td className="pr-2">{p.confidence_score ?? '—'}</td>
                        <td className="pr-2">{p.extracted_at ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === 'snapshots' && (
                <div className="space-y-2">
                  <ul className="space-y-1">
                    {snapshots.map((s) => (
                      <li key={s.id}>
                        <button onClick={async () => setSnapshotBody(await canonicalRepository.getSnapshot(s.id))} className="text-left text-xs hover:underline">
                          rev {s.revision} · {s.reason} · {s.created_at}
                        </button>
                      </li>
                    ))}
                    {!snapshots.length && <li className="text-muted-foreground text-xs">No snapshots yet.</li>}
                  </ul>
                  {snapshotBody && (
                    <pre className="text-xs whitespace-pre-wrap break-all border-t pt-2">{JSON.stringify(snapshotBody, null, 2)}</pre>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </section>
    </div>
  );
}
