/**
 * /dev/ag-xml — internal AG XML / .etax.zip inspection (admin-only).
 *
 * Generates the full deterministic export package from a canonical dossier or
 * a built-in fixture, displays raw XML, ZIP contents, hashes, and offers a
 * `.etax.zip` download. Reproducibility is verified by re-running and diffing.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import {
  canonicalRepository, type Dossier,
  hashCanonicalDossier, hashExportPayload,
} from '@/domain/canonical';
import { assembleDossier } from '@/domain/canonical/mappers/fromFormData';
import {
  buildAGExportPackage, buildAGExportPayload, allFixtures, validateAGPayload,
  ExportValidationError, type PackageResult,
} from '@/domain/canonical/export/ag';

interface DossierRow { id: string; tax_year: string; current_revision: number }

const toHex = (b: Uint8Array, max = 64) =>
  Array.from(b.slice(0, max)).map((x) => x.toString(16).padStart(2, '0')).join(' ') + (b.length > max ? ' …' : '');

const decode = (b: Uint8Array) => new TextDecoder().decode(b);

export default function DevAgXml() {
  const { userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [dossiers, setDossiers] = useState<DossierRow[]>([]);
  const [source, setSource] = useState<'customer' | 'dossier' | 'fixture'>('customer');
  const [selectedId, setSelectedId] = useState<string>('');
  const [fixtureName, setFixtureName] = useState(allFixtures[0]?.name ?? '');
  const [generatedAt, setGeneratedAt] = useState('2026-01-01T00:00:00.000Z');
  const [rulesVersion, setRulesVersion] = useState('ag-2024.1');
  const [pkg, setPkg] = useState<PackageResult | null>(null);
  const [previous, setPrevious] = useState<PackageResult | null>(null);
  const [tab, setTab] = useState<'xml' | 'manifest' | 'zip' | 'hashes' | 'validation' | 'fixtures'>('xml');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Customer mode
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; email: string | null }>>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [filers, setFilers] = useState<Array<{ id: string; first_name: string | null; last_name: string | null; is_primary: boolean }>>([]);
  const [selectedFilerId, setSelectedFilerId] = useState('');
  const [filerYears, setFilerYears] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState('');

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

  // Customer search (debounced via simple effect)
  useEffect(() => {
    if (!isAdmin) return;
    const t = setTimeout(async () => {
      let q = supabase.from('profiles').select('id, first_name, last_name, email').limit(25);
      const term = userQuery.trim();
      if (term) q = q.or(`first_name.ilike.%${term}%,last_name.ilike.%${term}%,email.ilike.%${term}%`);
      const { data } = await q;
      setUsers((data ?? []) as typeof users);
    }, 200);
    return () => clearTimeout(t);
  }, [userQuery, isAdmin]);

  // Load tax filers when user changes
  useEffect(() => {
    if (!selectedUserId) { setFilers([]); setSelectedFilerId(''); return; }
    (async () => {
      const { data } = await supabase
        .from('tax_filers').select('id, first_name, last_name, is_primary')
        .eq('user_id', selectedUserId).order('is_primary', { ascending: false });
      const list = (data ?? []) as typeof filers;
      setFilers(list);
      setSelectedFilerId(list[0]?.id ?? '');
    })();
  }, [selectedUserId]);

  // Load available tax years for selected filer
  useEffect(() => {
    if (!selectedFilerId) { setFilerYears([]); setSelectedYear(''); return; }
    (async () => {
      const { data } = await supabase
        .from('form_data').select('tax_year').eq('tax_filer_id', selectedFilerId);
      const years = [...new Set(((data ?? []) as Array<{ tax_year: string }>).map((r) => r.tax_year))].sort().reverse();
      setFilerYears(years);
      setSelectedYear(years[0] ?? '');
    })();
  }, [selectedFilerId]);

  const buildFromFixture = async (): Promise<PackageResult> => {
    const f = allFixtures.find((x) => x.name === fixtureName);
    if (!f) throw new Error('Fixture not found');
    const payload = f.build();
    const inputs_hash = await hashCanonicalDossier(f.dossier);
    const payload_hash = await hashExportPayload(payload);
    return buildAGExportPackage({ payload, inputs_hash, payload_hash });
  };

  const buildFromDossier = async (): Promise<PackageResult> => {
    if (!selectedId) throw new Error('Pick a dossier');
    const snap = await canonicalRepository.getLatestSnapshot(selectedId);
    if (!snap) throw new Error('No snapshot — visit /dev/canonical to create one.');
    const dossier = hydrateFromSnapshot(snap.snapshot as Record<string, unknown>);
    const prepared = await buildAGExportPayload({
      dossier,
      dossierRevision: dossier.current_revision,
      snapshotId: (snap as { id?: string }).id,
      rulesVersion,
      generatedAt,
    });
    return buildAGExportPackage(prepared);
  };

  const buildFromCustomer = async (): Promise<PackageResult> => {
    if (!selectedUserId) throw new Error('Kunde auswählen');
    if (!selectedFilerId) throw new Error('Steuerpflichtige Person auswählen');
    if (!selectedYear) throw new Error('Steuerjahr auswählen');

    // Aggregate every form_data row for this filer/year into one merged object
    const { data, error } = await supabase
      .from('form_data')
      .select('form_type, data')
      .eq('tax_filer_id', selectedFilerId)
      .eq('tax_year', selectedYear);
    if (error) throw error;
    const rows = (data ?? []) as Array<{ form_type: string; data: Record<string, unknown> | null }>;
    if (!rows.length) throw new Error('Keine Formulardaten für diese Auswahl gefunden.');

    const merged: Record<string, unknown> = {};
    for (const r of rows) {
      const d = r.data ?? {};
      // Each form_type usually maps to a top-level section; merge by key.
      Object.assign(merged, d);
      if (r.form_type && !(r.form_type in merged)) merged[r.form_type] = d;
    }

    const dossier = assembleDossier({
      user_id: selectedUserId,
      tax_filer_id: selectedFilerId,
      tax_year: selectedYear,
      canton: 'AG',
      formData: merged,
    });
    const prepared = await buildAGExportPayload({
      dossier,
      dossierRevision: 1,
      rulesVersion,
      generatedAt,
    });
    return buildAGExportPackage(prepared);
  };

  const generate = async () => {
    setBusy(true); setErr(null);
    try {
      const next =
        source === 'fixture' ? await buildFromFixture()
        : source === 'dossier' ? await buildFromDossier()
        : await buildFromCustomer();
      setPrevious(pkg);
      setPkg(next);
    } catch (e) {
      if (e instanceof ExportValidationError) {
        setErr(`Validation blocked export:\n${e.validation.errors.map((f) => ` • ${f.code} ${f.path ?? ''} — ${f.message}`).join('\n')}`);
      } else {
        setErr(e instanceof Error ? e.message : String(e));
      }
    } finally { setBusy(false); }
  };

  const download = () => {
    if (!pkg) return;
    const blob = new Blob([pkg.zipBytes as BlobPart], { type: 'application/zip' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ag-etax-${pkg.zip_hash.slice(0, 8)}.etax.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reproducibility = useMemo(() => {
    if (!pkg || !previous) return null;
    return {
      xml: pkg.xml_hash === previous.xml_hash,
      zip: pkg.zip_hash === previous.zip_hash,
      manifest: pkg.manifest_hash === previous.manifest_hash,
    };
  }, [pkg, previous]);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6 text-destructive">Admin only.</div>;

  return (
    <div className="p-6 space-y-4 text-sm">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">AG eTax XML / ZIP Inspector</h1>
        <div className="flex items-center gap-3">
          <a href="/dev/ag-import" className="text-xs underline">→ /dev/ag-import (compatibility)</a>
          <span className="text-xs text-muted-foreground">deterministic · dev-only</span>
        </div>
      </header>

      <section className="border rounded p-3 space-y-2">
        <div className="flex flex-wrap gap-2 items-center">
          <select className="border rounded px-2 py-1" value={source} onChange={(e) => setSource(e.target.value as 'customer' | 'dossier' | 'fixture')}>
            <option value="customer">Kundendaten</option>
            <option value="fixture">Fixture</option>
            <option value="dossier">Dossier snapshot</option>
          </select>
          {source === 'fixture' && (
            <select className="border rounded px-2 py-1" value={fixtureName} onChange={(e) => setFixtureName(e.target.value)}>
              {allFixtures.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
          )}
          {source === 'dossier' && (
            <select className="border rounded px-2 py-1 max-w-xs" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              <option value="">— pick dossier —</option>
              {dossiers.map((d) => (
                <option key={d.id} value={d.id}>{d.tax_year} · rev{d.current_revision} · {d.id.slice(0, 8)}</option>
              ))}
            </select>
          )}
          {source === 'customer' && (
            <>
              <input
                className="border rounded px-2 py-1 w-48"
                placeholder="Kunde suchen (Name/E-Mail)…"
                value={userQuery}
                onChange={(e) => setUserQuery(e.target.value)}
              />
              <select className="border rounded px-2 py-1 max-w-[18rem]" value={selectedUserId} onChange={(e) => setSelectedUserId(e.target.value)}>
                <option value="">— Kunde wählen —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {[u.first_name, u.last_name].filter(Boolean).join(' ') || '(ohne Name)'} · {u.email ?? '—'}
                  </option>
                ))}
              </select>
              <select className="border rounded px-2 py-1" value={selectedFilerId} onChange={(e) => setSelectedFilerId(e.target.value)} disabled={!filers.length}>
                <option value="">— Person —</option>
                {filers.map((f) => (
                  <option key={f.id} value={f.id}>
                    {[f.first_name, f.last_name].filter(Boolean).join(' ') || '(ohne Name)'}{f.is_primary ? ' ★' : ''}
                  </option>
                ))}
              </select>
              <select className="border rounded px-2 py-1" value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)} disabled={!filerYears.length}>
                <option value="">— Jahr —</option>
                {filerYears.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </>
          )}
          <input className="border rounded px-2 py-1 w-32" value={rulesVersion} onChange={(e) => setRulesVersion(e.target.value)} />
          <input className="border rounded px-2 py-1 w-64" value={generatedAt} onChange={(e) => setGeneratedAt(e.target.value)} />
          <button disabled={busy} onClick={generate} className="px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">
            {busy ? '…' : 'Generate package'}
          </button>
          <button disabled={!pkg} onClick={download} className="px-3 py-1 rounded border">Download .etax.zip</button>
          {reproducibility && (
            <span className="text-xs font-mono">
              repro: xml {reproducibility.xml ? '✓' : '✗'} · zip {reproducibility.zip ? '✓' : '✗'} · manifest {reproducibility.manifest ? '✓' : '✗'}
            </span>
          )}
        </div>
        {err && <pre className="text-xs text-destructive whitespace-pre-wrap">{err}</pre>}
      </section>

      <div className="flex gap-2 flex-wrap">
        {(['xml', 'manifest', 'zip', 'hashes', 'validation', 'fixtures'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-xs ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{t}</button>
        ))}
      </div>

      <section className="border rounded p-3 max-h-[60vh] overflow-auto">
        {tab === 'xml' && (
          <pre className="text-xs whitespace-pre-wrap break-all">{pkg ? decode(pkg.xmlBytes) : '— no package yet —'}</pre>
        )}
        {tab === 'manifest' && (
          <pre className="text-xs whitespace-pre-wrap break-all">{pkg ? decode(pkg.manifestBytes) : '— no package yet —'}</pre>
        )}
        {tab === 'zip' && pkg && (
          <div className="space-y-2 text-xs font-mono">
            <div>size: {pkg.zipBytes.length} bytes · sha256: {pkg.zip_hash}</div>
            <div>head: {toHex(pkg.zipBytes, 32)}</div>
            <div>tail: {toHex(pkg.zipBytes.slice(-32), 32)}</div>
          </div>
        )}
        {tab === 'hashes' && pkg && (
          <table className="text-xs font-mono w-full">
            <tbody>
              <tr><td className="pr-3">inputs_hash</td><td>{pkg.inputs_hash}</td></tr>
              <tr><td className="pr-3">payload_hash</td><td>{pkg.payload_hash}</td></tr>
              <tr><td className="pr-3">xml_hash</td><td>{pkg.xml_hash}</td></tr>
              <tr><td className="pr-3">manifest_hash</td><td>{pkg.manifest_hash}</td></tr>
              <tr><td className="pr-3">zip_hash</td><td>{pkg.zip_hash}</td></tr>
            </tbody>
          </table>
        )}
        {tab === 'validation' && pkg && (
          <div className="space-y-2 text-xs">
            <div>errors: {pkg.validation.errors.length} · warnings: {pkg.validation.warnings.length}</div>
            <ul>
              {pkg.validation.findings.map((f, i) => (
                <li key={i} className={f.severity === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
                  [{f.severity}] {f.code} {f.path ?? ''} — {f.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        {tab === 'fixtures' && <FixtureRunner generatedAt={generatedAt} />}
      </section>
    </div>
  );
}

function FixtureRunner({ generatedAt }: { generatedAt: string }) {
  const [results, setResults] = useState<Array<{ name: string; xml: string; zip: string; ok: boolean; err?: string }>>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    const out: typeof results = [];
    const m = await import('@/domain/canonical');
    for (const f of allFixtures) {
      try {
        const payload = f.build();
        // Override generatedAt to test reproducibility under varying input timestamps.
        payload.metadata.generated_at = generatedAt;
        const inputs_hash = await m.hashCanonicalDossier(f.dossier);
        const payload_hash = await m.hashExportPayload(payload);
        const validation = validateAGPayload(payload);
        if (!validation.ok) {
          out.push({ name: f.name, xml: '-', zip: '-', ok: false, err: validation.errors.map((e) => e.code).join(', ') });
          continue;
        }
        const a = await buildAGExportPackage({ payload, inputs_hash, payload_hash });
        const b = await buildAGExportPackage({ payload, inputs_hash, payload_hash });
        out.push({
          name: f.name, xml: a.xml_hash, zip: a.zip_hash,
          ok: a.xml_hash === b.xml_hash && a.zip_hash === b.zip_hash,
        });
      } catch (e) {
        out.push({ name: f.name, xml: '-', zip: '-', ok: false, err: e instanceof Error ? e.message : String(e) });
      }
    }
    setResults(out);
    setBusy(false);
  };

  return (
    <div className="space-y-2 text-xs">
      <button onClick={run} disabled={busy} className="px-3 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">
        {busy ? 'Running…' : 'Run reproducibility check'}
      </button>
      <table className="w-full font-mono">
        <thead><tr className="text-left"><th>fixture</th><th>repro</th><th>xml_hash</th><th>zip_hash</th><th>err</th></tr></thead>
        <tbody>
          {results.map((r) => (
            <tr key={r.name} className="border-t">
              <td className="pr-2">{r.name}</td>
              <td className="pr-2">{r.ok ? '✓' : '✗'}</td>
              <td className="pr-2">{r.xml.slice(0, 16)}…</td>
              <td className="pr-2">{r.zip.slice(0, 16)}…</td>
              <td className="text-destructive">{r.err ?? ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function hydrateFromSnapshot(snap: Record<string, unknown>): Dossier {
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
