/**
 * Structural XML diff between two parsed trees. Path-addressed.
 *
 * Diff strategy:
 *  - Compare root tag + namespaces + attributes.
 *  - For children, group by tag. Same multiset → check ordering. Differing
 *    multiset → emit `missing`/`extra` per tag occurrence.
 *  - Recurse into matched children (positionally, by tag occurrence index).
 *  - Compare text content for leaf nodes.
 */
import type { XmlNode } from './xmlParser';

export type DiffKind =
  | 'missing'           // present in expected (B), absent in ours (A)
  | 'extra'             // present in ours (A), absent in expected (B)
  | 'attr-changed'
  | 'attr-missing'
  | 'attr-extra'
  | 'text-changed'
  | 'order-mismatch'
  | 'namespace-mismatch';

export interface DiffEntry {
  kind: DiffKind;
  path: string;          // e.g. /Document/persons/person[1]/firstName
  ours?: string;
  expected?: string;
  message?: string;
}

const join = (path: string, segment: string) => (path === '' ? '/' + segment : path + '/' + segment);

function compareAttrs(a: XmlNode, b: XmlNode, path: string, out: DiffEntry[]): void {
  const aKeys = new Set(Object.keys(a.attrs));
  const bKeys = new Set(Object.keys(b.attrs));
  for (const k of bKeys) {
    if (!aKeys.has(k)) out.push({ kind: 'attr-missing', path, expected: `${k}="${b.attrs[k]}"` });
    else if (a.attrs[k] !== b.attrs[k]) out.push({ kind: 'attr-changed', path, ours: `${k}="${a.attrs[k]}"`, expected: `${k}="${b.attrs[k]}"` });
  }
  for (const k of aKeys) {
    if (!bKeys.has(k)) out.push({ kind: 'attr-extra', path, ours: `${k}="${a.attrs[k]}"` });
  }
}

function compareNamespaces(a: XmlNode, b: XmlNode, path: string, out: DiffEntry[]): void {
  const all = new Set([...Object.keys(a.namespaces), ...Object.keys(b.namespaces)]);
  for (const prefix of all) {
    const aUri = a.namespaces[prefix];
    const bUri = b.namespaces[prefix];
    if (aUri !== bUri) {
      out.push({
        kind: 'namespace-mismatch',
        path,
        ours: aUri ? `${prefix || 'default'}=${aUri}` : '(none)',
        expected: bUri ? `${prefix || 'default'}=${bUri}` : '(none)',
      });
    }
  }
}

function diffNode(a: XmlNode, b: XmlNode, path: string, out: DiffEntry[]): void {
  if (a.tag !== b.tag) {
    out.push({ kind: 'attr-changed', path, ours: a.tag, expected: b.tag, message: 'tag mismatch' });
    return;
  }
  compareNamespaces(a, b, path, out);
  compareAttrs(a, b, path, out);

  // Leaf text
  if (a.children.length === 0 && b.children.length === 0) {
    if ((a.text ?? '') !== (b.text ?? '')) {
      out.push({ kind: 'text-changed', path, ours: a.text ?? '', expected: b.text ?? '' });
    }
    return;
  }

  // Group by tag
  const aByTag: Record<string, XmlNode[]> = {};
  const bByTag: Record<string, XmlNode[]> = {};
  for (const c of a.children) (aByTag[c.tag] ??= []).push(c);
  for (const c of b.children) (bByTag[c.tag] ??= []).push(c);

  const tags = new Set([...Object.keys(aByTag), ...Object.keys(bByTag)]);
  for (const tag of tags) {
    const ours = aByTag[tag] ?? [];
    const expected = bByTag[tag] ?? [];
    const max = Math.max(ours.length, expected.length);
    for (let i = 0; i < max; i++) {
      const childPath = join(path, expected.length > 1 || ours.length > 1 ? `${tag}[${i + 1}]` : tag);
      if (i >= ours.length) {
        out.push({ kind: 'missing', path: childPath, expected: tag });
        continue;
      }
      if (i >= expected.length) {
        out.push({ kind: 'extra', path: childPath, ours: tag });
        continue;
      }
      diffNode(ours[i], expected[i], childPath, out);
    }
  }

  // Order mismatch detection: same tag multiset but different sequence.
  const aTags = a.children.map((c) => c.tag);
  const bTags = b.children.map((c) => c.tag);
  if (aTags.length === bTags.length && [...aTags].sort().join(',') === [...bTags].sort().join(',')) {
    if (aTags.join(',') !== bTags.join(',')) {
      out.push({
        kind: 'order-mismatch',
        path,
        ours: aTags.join(','),
        expected: bTags.join(','),
      });
    }
  }
}

export function diffXmlTrees(ours: XmlNode, expected: XmlNode): DiffEntry[] {
  const out: DiffEntry[] = [];
  diffNode(ours, expected, '/' + ours.tag, out);
  return out;
}
