/**
 * /dev/ag-export — internal AG payload inspection (admin-only).
 *
 * Read/append-only. Generates AG export payloads from canonical dossiers,
 * shows raw JSON, flattened field map, and revision diffs. Optional persist.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { canonicalRepository } from '@/domain/canonical';
import {
  buildAGExportPayload, flattenPayload, diffPayloads, stringifyPayload,
  recordAGExport, listAGExports, allFixtures, type AGExportPayload,
} from '@/domain/canonical/export/ag';
import { hashExportPayload } from '@/domain/canonical/export/hashing';

interface DossierRow { id: string; tax_filer_id: string; tax_year: string; current_revision: number; status: string; updated_at: string }

type GenResult = { payload: AGExportPayload; inputs_hash: string; payload_hash: string };

export default function DevAgExport() {
  const { userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rulesVersion, setRulesVersion] = useState('ag-2024.1');
  const [generatedAt, setGeneratedAt] = useState('2026-01-01T00:00:00.000Z');
  const [current, setCurrent] = useState<GenResult | null>(null);
  const [previous, setPrevious] = useState<GenResult | null>(null);
  const [tab, setTab] = useState<'payload' | 'fields' | 'diff' | 'fixtures' | 'records'>('payload');
  const [records, setRecords] = useState<Array<Record<string, unknown>>>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!userId) { setIsAdmin(false); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [userId]);

  useEffect(() => {
    if (!isAdmin || !userId) return;
    canonicalRepository.listDossiersForUser(userId).then(setDossiers);
  }, [isAdmin, userId]);

  useEffect(() => {
    if (!selectedId) { setRecords([]); return; }
    listAGExports(selectedId).then(setRecords);
  }, [selectedId]);

  const generate = async () => {
    if (!selectedId) return;
    setBusy(true); setErr(null);
    try {
      const full = await canonicalRepository.getDossier(selectedId);
      if (!full) throw new Error('Dossier not found');
      const dossierRow = (full.dossier as Record<string, unknown>) ?? {};
      // Reconstruct a Dossier-shaped object good enough for the mapper.
      // The repo getDossier returns raw rows; use canonical_dossiers fields for metadata,
      // and tracked-shape children directly is non-trivial — for inspection we re-read via
      // the latest snapshot if available; otherwise we re-build from form_data via dual-write
      // is out of scope here. So we rebuild a minimal Dossier from the snapshot.
      const snap = await canonicalRepository.getLatestSnapshot(selectedId);
      const dossierForMapping = (snap?.snapshot as { dossier: unknown } | undefined)?.dossier
        ? hydrateFromSnapshot(snap!.snapshot as Record<string, unknown>)
        : null;
      if (!dossierForMapping) throw new Error('No snapshot available — create one in /dev/canonical first.');
      const built = await buildAGExportPayload({
        dossier: dossierForMapping,
        dossierRevision: Number((dossierRow as { current_revision?: number }).current_revision ?? 0),
        snapshotId: (snap as { id?: string } | null)?.id,
        rulesVersion,
        generatedAt,
      });
      setPrevious(current);
      setCurrent(built);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const persist = async () => {
    if (!current || !selectedId) return;
    setBusy(true);
    await recordAGExport({
      dossier_id: selectedId,
      dossier_revision: current.payload.metadata.dossier_revision,
      snapshot_id: current.payload.metadata.snapshot_id,
      prepared: current,
      user_id: userId ?? undefined,
    });
    setRecords(await listAGExports(selectedId));
    setBusy(false);
  };

  const fixtures = useMemo(() => allFixtures.map((f) => {
    const payload = f.build();
    return { name: f.name, payload };
  }), []);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6 text-destructive">Admin only.</div>;

  return (
    <div className="p-6 space-y-4 text-sm">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">AG Export Inspector</h1>
        <span className="text-xs text-muted-foreground">read · append · dev</span>
      </header>

      <section className="border rounded p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border rounded px-2 py-1 max-w-xs" value={selectedId ?? ''} onChange={(e) => setSelectedId(e.target.value || null)}>
            <option value="">— pick dossier —</option>
            {dossiers.map((d) => (
              <option key={d.id} value={d.id}>{d.tax_year} · rev{d.current_revision} · {d.id.slice(0, 8)}</option>
            ))}
          </select>
          <input className="border rounded px-2 py-1 w-32" value={rulesVersion} onChange={(e) => setRulesVersion(e.target.value)} />
          <input className="border rounded px-2 py-1 w-64" value={generatedAt} onChange={(e) => setGeneratedAt(e.target.value)} />
          <button disabled={busy || !selectedId} onClick={generate} className="px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">
            {busy ? '…' : 'Generate AG payload'}
          </button>
          <button disabled={busy || !current} onClick={persist} className="px-3 py-1 rounded border">Persist as canonical_export</button>
          {current && (
            <span className="text-xs text-muted-foreground font-mono">
              in: {current.inputs_hash.slice(0, 12)}… · out: {current.payload_hash.slice(0, 12)}…
            </span>
          )}
        </div>
        {err && <div className="text-xs text-destructive">{err}</div>}
      </section>

      <div className="flex gap-2">
        {(['payload', 'fields', 'diff', 'fixtures', 'records'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-xs ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{t}</button>
        ))}
      </div>

      <section className="border rounded p-3 max-h-[60vh] overflow-auto">
        {tab === 'payload' && (
          <pre className="text-xs whitespace-pre-wrap break-all">{current ? stringifyPayload(current.payload) : '— no payload yet —'}</pre>
        )}
        {tab === 'fields' && current && (
          <table className="text-xs w-full">
            <thead><tr className="text-left"><th>path</th><th>value</th></tr></thead>
            <tbody>
              {flattenPayload(current.payload).map((r, i) => (
                <tr key={i} className="border-t"><td className="pr-3 font-mono">{r.path}</td><td className="font-mono break-all">{r.value}</td></tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'diff' && (
          current && previous ? (
            <DiffView a={previous.payload} b={current.payload} />
          ) : <div className="text-muted-foreground text-xs">Generate twice to see a diff.</div>
        )}
        {tab === 'fixtures' && <FixturesView fixtures={fixtures} />}
        {tab === 'records' && (
          <table className="text-xs w-full">
            <thead><tr className="text-left"><th>created_at</th><th>rev</th><th>rules</th><th>generated_at</th><th>inputs</th><th>output</th><th>status</th></tr></thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={i} className="border-t font-mono">
                  <td className="pr-2">{String(r.created_at)}</td>
                  <td className="pr-2">{String(r.dossier_revision)}</td>
                  <td className="pr-2">{String(r.rules_version)}</td>
                  <td className="pr-2">{String(r.generated_at)}</td>
                  <td className="pr-2">{String(r.inputs_hash).slice(0, 12)}…</td>
                  <td className="pr-2">{String(r.output_hash).slice(0, 12)}…</td>
                  <td className="pr-2">{String(r.status)}</td>
                </tr>
              ))}
              {!records.length && <tr><td className="text-muted-foreground" colSpan={7}>No persisted exports.</td></tr>}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function DiffView({ a, b }: { a: AGExportPayload; b: AGExportPayload }) {
  const d = useMemo(() => diffPayloads(a, b), [a, b]);
  if (d.identical) return <div className="text-xs text-muted-foreground">Payloads are identical (deterministic ✓).</div>;
  return (
    <div className="space-y-3 text-xs">
      <div><strong>Changed ({d.changed.length})</strong>
        <ul className="font-mono">{d.changed.map((c, i) => <li key={i}>{c.path}: {c.before} → {c.after}</li>)}</ul>
      </div>
      <div><strong>Added ({d.added.length})</strong>
        <ul className="font-mono">{d.added.map((c, i) => <li key={i}>+ {c.path} = {c.value}</li>)}</ul>
      </div>
      <div><strong>Removed ({d.removed.length})</strong>
        <ul className="font-mono">{d.removed.map((c, i) => <li key={i}>- {c.path} = {c.value}</li>)}</ul>
      </div>
    </div>
  );
}

function FixturesView({ fixtures }: { fixtures: Array<{ name: string; payload: AGExportPayload }> }) {
  const [name, setName] = useState(fixtures[0]?.name ?? '');
  const [hash, setHash] = useState<string>('');
  const selected = fixtures.find((f) => f.name === name);
  useEffect(() => { if (selected) hashExportPayload(selected.payload).then(setHash); }, [selected]);
  return (
    <div className="space-y-2 text-xs">
      <select className="border rounded px-2 py-1" value={name} onChange={(e) => setName(e.target.value)}>
        {fixtures.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
      </select>
      {selected && (
        <>
          <div className="font-mono text-muted-foreground">payload_hash: {hash}</div>
          <pre className="whitespace-pre-wrap break-all">{stringifyPayload(selected.payload)}</pre>
        </>
      )}
    </div>
  );
}

/** Hydrate a snapshot's `dossier` JSONB blob back to the in-memory Dossier shape. */
function hydrateFromSnapshot(snap: Record<string, unknown>): import('@/domain/canonical').Dossier {
  const d = (snap.dossier as Record<string, unknown>) ?? {};
  return {
    id: d.id as string,
    user_id: d.user_id as string,
    tax_filer_id: d.tax_filer_id as string,
    tax_year: d.tax_year as string,
    canton: d.canton as never,
    status: (d.status as never) ?? 'draft',
    schema_version: (d.schema_version as number) ?? 1,
    current_revision: (d.current_revision as number) ?? 0,
    validation_status: (d.validation_status as Record<string, unknown>) ?? {},
    currency: 'CHF',
    persons: ((snap.persons as unknown[]) ?? []) as never,
    household: (snap.household as never) ?? undefined,
    employment_incomes: ((snap.employment_incomes as unknown[]) ?? []) as never,
    self_employment_incomes: ((snap.self_employment_incomes as unknown[]) ?? []) as never,
    pension_incomes: ((snap.pension_incomes as unknown[]) ?? []) as never,
    assets: (snap.assets as never) ?? undefined,
    debts: (snap.debts as never) ?? undefined,
    real_estate: ((snap.real_estate as unknown[]) ?? []) as never,
    deductions: (snap.deductions as never) ?? undefined,
    attachments: ((snap.attachments as unknown[]) ?? []) as never,
  };
}
