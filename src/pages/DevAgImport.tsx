/**
 * /dev/ag-import — AG eTax import compatibility & reverse-engineering tool.
 *
 * Admin-only. Lets developers:
 *  - upload a real AG eTax `.etax.zip` (the "expected" reference)
 *  - generate a Ditax package from a fixture (the "ours" candidate)
 *  - structurally diff XML, compare ZIP entries, inspect namespaces / hierarchy
 *  - record import outcomes in a local registry
 *  - track per-capability compatibility status in a checklist
 *
 * No DB writes; no production code paths affected.
 */
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { buildAGExportPackage, allFixtures, type PackageResult } from '@/domain/canonical/export/ag';
import { hashCanonicalDossier, hashExportPayload } from '@/domain/canonical';
import {
  parseXml, normalizeXml, diffXmlTrees, readZip, analyzeStructure,
  listImportTests, upsertImportTest, deleteImportTest,
  CAPABILITIES, readChecklist, setCapability,
  type DiffEntry, type ZipEntryRead, type ImportStatus,
  type CapabilityStatus, type StructuralReport,
} from '@/domain/canonical/export/ag/debug';

const decode = (b: Uint8Array) => new TextDecoder().decode(b);

interface Side {
  label: string;
  zipEntries: ZipEntryRead[];
  taxXml?: string;
  manifestXml?: string;
  structure?: StructuralReport;
  zipHash?: string;
  xmlHash?: string;
}

async function sha256(b: Uint8Array): Promise<string> {
  const h = await crypto.subtle.digest('SHA-256', b as BufferSource);
  return Array.from(new Uint8Array(h)).map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function buildSideFromZip(label: string, bytes: Uint8Array): Promise<Side> {
  const entries = await readZip(bytes);
  const tax = entries.find((e) => /taxdata\.xml$/i.test(e.name) || /\.xml$/i.test(e.name) && !/manifest/i.test(e.name));
  const manifest = entries.find((e) => /manifest\.xml$/i.test(e.name));
  const taxXml = tax ? decode(tax.bytes) : undefined;
  const structure = taxXml ? analyzeStructure(parseXml(taxXml)) : undefined;
  return {
    label, zipEntries: entries,
    taxXml, manifestXml: manifest ? decode(manifest.bytes) : undefined,
    structure,
    zipHash: await sha256(bytes),
    xmlHash: tax ? await sha256(tax.bytes) : undefined,
  };
}

async function buildSideFromPackage(label: string, pkg: PackageResult): Promise<Side> {
  const entries = await readZip(pkg.zipBytes);
  const taxXml = decode(pkg.xmlBytes);
  const structure = analyzeStructure(parseXml(taxXml));
  return {
    label, zipEntries: entries,
    taxXml, manifestXml: decode(pkg.manifestBytes),
    structure,
    zipHash: pkg.zip_hash, xmlHash: pkg.xml_hash,
  };
}

export default function DevAgImport() {
  const { userId } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  const [ours, setOurs] = useState<Side | null>(null);
  const [expected, setExpected] = useState<Side | null>(null);
  const [diffs, setDiffs] = useState<DiffEntry[]>([]);
  const [tab, setTab] = useState<'overview' | 'diff' | 'normalized' | 'structure' | 'zip' | 'registry' | 'checklist'>('overview');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [normalizeSorted, setNormalizeSorted] = useState(false);

  const [fixtureName, setFixtureName] = useState(allFixtures[0]?.name ?? '');
  const [generatedAt, setGeneratedAt] = useState('2026-01-01T00:00:00.000Z');

  // Registry inputs
  const [tests, setTests] = useState(listImportTests());
  const [newName, setNewName] = useState('');
  const [newStatus, setNewStatus] = useState<ImportStatus>('failed');
  const [newError, setNewError] = useState('');
  const [newNotes, setNewNotes] = useState('');

  const [checklist, setChecklist] = useState(readChecklist());

  useEffect(() => {
    (async () => {
      if (!userId) { setIsAdmin(false); return; }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
      setIsAdmin(!!data);
    })();
  }, [userId]);

  const compute = async () => {
    if (!ours?.taxXml || !expected?.taxXml) { setDiffs([]); return; }
    try {
      const d = diffXmlTrees(parseXml(ours.taxXml), parseXml(expected.taxXml));
      setDiffs(d);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
  };
  useEffect(() => { compute(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [ours, expected]);

  const onUpload = (target: 'ours' | 'expected') => async (file: File) => {
    setBusy(true); setErr(null);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      const side = await buildSideFromZip(file.name, buf);
      target === 'ours' ? setOurs(side) : setExpected(side);
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const generateOurs = async () => {
    setBusy(true); setErr(null);
    try {
      const f = allFixtures.find((x) => x.name === fixtureName);
      if (!f) throw new Error('Fixture not found');
      const payload = f.build();
      payload.metadata.generated_at = generatedAt;
      const inputs_hash = await hashCanonicalDossier(f.dossier);
      const payload_hash = await hashExportPayload(payload);
      const pkg = await buildAGExportPackage({ payload, inputs_hash, payload_hash });
      setOurs(await buildSideFromPackage(`fixture: ${fixtureName}`, pkg));
    } catch (e) { setErr(e instanceof Error ? e.message : String(e)); }
    finally { setBusy(false); }
  };

  const refreshTests = () => setTests(listImportTests());
  const recordTest = () => {
    upsertImportTest({
      name: newName || (ours?.label ?? 'unnamed test'),
      fixtureOrDossier: ours?.label ?? '—',
      generatedXmlHash: ours?.xmlHash,
      generatedZipHash: ours?.zipHash,
      status: newStatus,
      errorMessage: newError || undefined,
      notes: newNotes || undefined,
    });
    setNewName(''); setNewError(''); setNewNotes('');
    refreshTests();
  };

  const summary = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of diffs) counts[d.kind] = (counts[d.kind] ?? 0) + 1;
    return counts;
  }, [diffs]);

  if (isAdmin === null) return <div className="p-6">Loading…</div>;
  if (!isAdmin) return <div className="p-6 text-destructive">Admin only.</div>;

  return (
    <div className="p-6 space-y-4 text-sm">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">AG eTax Import Compatibility</h1>
        <a href="/dev/ag-xml" className="text-xs underline">→ /dev/ag-xml</a>
      </header>

      <section className="grid md:grid-cols-2 gap-3">
        <SidePanel title="Ours (Ditax)" side={ours}>
          <div className="flex flex-wrap gap-2 items-center text-xs">
            <select className="border rounded px-2 py-1" value={fixtureName} onChange={(e) => setFixtureName(e.target.value)}>
              {allFixtures.map((f) => <option key={f.name} value={f.name}>{f.name}</option>)}
            </select>
            <input className="border rounded px-2 py-1 w-56" value={generatedAt} onChange={(e) => setGeneratedAt(e.target.value)} />
            <button disabled={busy} onClick={generateOurs} className="px-2 py-1 rounded bg-primary text-primary-foreground disabled:opacity-50">Generate from fixture</button>
            <FileButton label="Upload .etax.zip" onFile={onUpload('ours')} />
          </div>
        </SidePanel>
        <SidePanel title="Expected (real AG export)" side={expected}>
          <FileButton label="Upload real AG .etax.zip" onFile={onUpload('expected')} />
        </SidePanel>
      </section>

      {err && <pre className="text-xs text-destructive whitespace-pre-wrap border border-destructive/30 rounded p-2">{err}</pre>}

      <div className="flex gap-2 flex-wrap">
        {(['overview', 'diff', 'normalized', 'structure', 'zip', 'registry', 'checklist'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1 rounded text-xs ${tab === t ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{t}</button>
        ))}
      </div>

      <section className="border rounded p-3 max-h-[65vh] overflow-auto">
        {tab === 'overview' && (
          <div className="space-y-2 text-xs font-mono">
            <div>diff entries: {diffs.length}</div>
            {Object.entries(summary).map(([k, v]) => <div key={k}>· {k}: {v}</div>)}
            {ours && expected && (
              <div className="mt-2">
                <div>xml_hash equal: {ours.xmlHash === expected.xmlHash ? '✓' : '✗'}</div>
                <div>zip_hash equal: {ours.zipHash === expected.zipHash ? '✓' : '✗'}</div>
              </div>
            )}
          </div>
        )}

        {tab === 'diff' && (
          <table className="w-full text-xs font-mono">
            <thead><tr className="text-left"><th>kind</th><th>path</th><th>ours</th><th>expected</th></tr></thead>
            <tbody>
              {diffs.map((d, i) => (
                <tr key={i} className="border-t align-top">
                  <td className="pr-2"><span className={d.kind.includes('missing') || d.kind.includes('changed') ? 'text-destructive' : 'text-yellow-600'}>{d.kind}</span></td>
                  <td className="pr-2 break-all">{d.path}</td>
                  <td className="pr-2 break-all">{d.ours ?? ''}</td>
                  <td className="pr-2 break-all">{d.expected ?? ''}</td>
                </tr>
              ))}
              {diffs.length === 0 && <tr><td colSpan={4} className="text-muted-foreground">no diffs (or load both sides)</td></tr>}
            </tbody>
          </table>
        )}

        {tab === 'normalized' && (
          <div className="space-y-2 text-xs">
            <label className="flex items-center gap-2"><input type="checkbox" checked={normalizeSorted} onChange={(e) => setNormalizeSorted(e.target.checked)} /> sort siblings (structure-only compare)</label>
            <div className="grid md:grid-cols-2 gap-3">
              <pre className="whitespace-pre-wrap border rounded p-2 font-mono max-h-[50vh] overflow-auto">{ours?.taxXml ? normalizeXml(parseXml(ours.taxXml), { sortSiblings: normalizeSorted }) : '— no ours —'}</pre>
              <pre className="whitespace-pre-wrap border rounded p-2 font-mono max-h-[50vh] overflow-auto">{expected?.taxXml ? normalizeXml(parseXml(expected.taxXml), { sortSiblings: normalizeSorted }) : '— no expected —'}</pre>
            </div>
          </div>
        )}

        {tab === 'structure' && (
          <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
            <StructureView side={ours} />
            <StructureView side={expected} />
          </div>
        )}

        {tab === 'zip' && (
          <div className="grid md:grid-cols-2 gap-3 text-xs font-mono">
            <ZipView side={ours} />
            <ZipView side={expected} />
          </div>
        )}

        {tab === 'registry' && (
          <div className="space-y-3 text-xs">
            <div className="grid md:grid-cols-5 gap-2">
              <input className="border rounded px-2 py-1 col-span-2" placeholder="test name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <select className="border rounded px-2 py-1" value={newStatus} onChange={(e) => setNewStatus(e.target.value as ImportStatus)}>
                <option value="failed">failed</option>
                <option value="partial">partial</option>
                <option value="successful">successful</option>
              </select>
              <input className="border rounded px-2 py-1" placeholder="error" value={newError} onChange={(e) => setNewError(e.target.value)} />
              <button onClick={recordTest} className="px-2 py-1 rounded bg-primary text-primary-foreground">Record</button>
              <textarea className="border rounded px-2 py-1 col-span-5" placeholder="notes (optional)" value={newNotes} onChange={(e) => setNewNotes(e.target.value)} />
            </div>
            <table className="w-full font-mono">
              <thead><tr className="text-left"><th>when</th><th>name</th><th>status</th><th>xml hash</th><th>zip hash</th><th>error</th><th></th></tr></thead>
              <tbody>
                {tests.map((t) => (
                  <tr key={t.id} className="border-t align-top">
                    <td className="pr-2">{t.createdAt.slice(0, 16).replace('T', ' ')}</td>
                    <td className="pr-2">{t.name}</td>
                    <td className="pr-2">{t.status}</td>
                    <td className="pr-2">{t.generatedXmlHash?.slice(0, 12) ?? ''}</td>
                    <td className="pr-2">{t.generatedZipHash?.slice(0, 12) ?? ''}</td>
                    <td className="pr-2 text-destructive break-all">{t.errorMessage ?? ''}</td>
                    <td><button onClick={() => { deleteImportTest(t.id); refreshTests(); }} className="text-destructive">×</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === 'checklist' && (
          <table className="w-full text-xs">
            <thead><tr className="text-left"><th>group</th><th>capability</th><th>status</th><th>note</th></tr></thead>
            <tbody>
              {CAPABILITIES.map((c) => {
                const cur = checklist[c.id] ?? { status: 'unknown' as CapabilityStatus, note: '' };
                return (
                  <tr key={c.id} className="border-t">
                    <td className="pr-2 text-muted-foreground">{c.group}</td>
                    <td className="pr-2">{c.label}</td>
                    <td className="pr-2">
                      <select
                        className="border rounded px-1 py-0.5"
                        value={cur.status}
                        onChange={(e) => { setCapability(c.id, e.target.value as CapabilityStatus, cur.note); setChecklist(readChecklist()); }}
                      >
                        {(['unknown', 'failed', 'partial', 'working'] as const).map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="pr-2">
                      <input
                        className="border rounded px-1 py-0.5 w-full"
                        defaultValue={cur.note ?? ''}
                        onBlur={(e) => { setCapability(c.id, cur.status, e.target.value); setChecklist(readChecklist()); }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}

function SidePanel({ title, side, children }: { title: string; side: Side | null; children: React.ReactNode }) {
  return (
    <div className="border rounded p-3 space-y-2">
      <div className="flex justify-between items-center">
        <strong className="text-sm">{title}</strong>
        {side && <span className="text-xs text-muted-foreground truncate max-w-[60%]">{side.label}</span>}
      </div>
      {children}
      {side && (
        <div className="text-xs font-mono text-muted-foreground">
          xml: {side.xmlHash?.slice(0, 16) ?? '—'} · zip: {side.zipHash?.slice(0, 16) ?? '—'} · entries: {side.zipEntries.length}
        </div>
      )}
    </div>
  );
}

function FileButton({ label, onFile }: { label: string; onFile: (f: File) => void }) {
  return (
    <label className="px-2 py-1 rounded border cursor-pointer text-xs">
      {label}
      <input
        type="file" accept=".zip,application/zip" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.currentTarget.value = ''; }}
      />
    </label>
  );
}

function StructureView({ side }: { side: Side | null }) {
  if (!side?.structure) return <div className="text-muted-foreground">— no data —</div>;
  const s = side.structure;
  return (
    <div className="space-y-2">
      <div>{side.label}</div>
      <div>nodes: {s.totalNodes} · depth: {s.maxDepth}</div>
      <details open><summary>top tags</summary>
        <ul>{s.tagCounts.slice(0, 30).map((t) => <li key={t.tag}>{t.tag} × {t.count}</li>)}</ul>
      </details>
      <details><summary>namespaces ({s.namespaces.length})</summary>
        <ul>{s.namespaces.map((n, i) => <li key={i}>{n.prefix} = {n.uri} <span className="text-muted-foreground">@ {n.declaredOn}</span></li>)}</ul>
      </details>
      <details><summary>references (ids {s.references.ids.length} / refs {s.references.refs.length})</summary>
        <div>ids: {s.references.ids.join(', ') || '—'}</div>
        <div>refs: {s.references.refs.join(', ') || '—'}</div>
      </details>
      <details><summary>repeated patterns</summary>
        <ul>{s.repeatedPatterns.slice(0, 30).map((p, i) => <li key={i}>{p.parent} → {p.child} × {p.occurrences}</li>)}</ul>
      </details>
    </div>
  );
}

function ZipView({ side }: { side: Side | null }) {
  if (!side) return <div className="text-muted-foreground">— no zip —</div>;
  return (
    <div>
      <div>{side.label}</div>
      <table className="w-full">
        <thead><tr className="text-left"><th>name</th><th>size</th><th>method</th></tr></thead>
        <tbody>
          {side.zipEntries.map((e) => (
            <tr key={e.name} className="border-t"><td>{e.name}</td><td>{e.size}</td><td>{e.method}</td></tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
