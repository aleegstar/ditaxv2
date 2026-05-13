/**
 * Walk an `XmlNode` tree and produce structural statistics useful when
 * reverse-engineering an unfamiliar AG eTax export.
 */
import type { XmlNode } from './xmlParser';

export interface StructuralReport {
  totalNodes: number;
  maxDepth: number;
  tagCounts: Array<{ tag: string; count: number }>;
  namespaces: Array<{ prefix: string; uri: string; declaredOn: string }>;
  references: { ids: string[]; refs: string[] };
  repeatedPatterns: Array<{ parent: string; child: string; occurrences: number }>;
}

export function analyzeStructure(root: XmlNode): StructuralReport {
  let total = 0;
  let depth = 0;
  const counts = new Map<string, number>();
  const ns: StructuralReport['namespaces'] = [];
  const ids: string[] = [];
  const refs: string[] = [];
  const patternMap = new Map<string, number>();

  const refLike = /^(ref-\d+|ID\d+|[a-zA-Z]+-\d{3,})$/;

  function walk(node: XmlNode, level: number, path: string): void {
    total++;
    depth = Math.max(depth, level);
    counts.set(node.tag, (counts.get(node.tag) ?? 0) + 1);
    for (const [prefix, uri] of Object.entries(node.namespaces)) {
      ns.push({ prefix: prefix || '(default)', uri, declaredOn: path });
    }
    for (const [k, v] of Object.entries(node.attrs)) {
      if (k === 'id' || k.endsWith(':id')) ids.push(v);
      if (k === 'ref' || k.endsWith('Ref') || k.endsWith(':ref')) refs.push(v);
      if (refLike.test(v)) {
        if (k === 'id' || k.endsWith(':id')) ids.push(v);
        else refs.push(v);
      }
    }
    if (node.text && refLike.test(node.text)) refs.push(node.text);

    // Repeated child patterns
    const childTags = new Map<string, number>();
    for (const c of node.children) childTags.set(c.tag, (childTags.get(c.tag) ?? 0) + 1);
    for (const [child, n] of childTags) {
      if (n > 1) patternMap.set(`${node.tag} → ${child}`, (patternMap.get(`${node.tag} → ${child}`) ?? 0) + n);
    }

    for (const c of node.children) walk(c, level + 1, `${path}/${c.tag}`);
  }
  walk(root, 1, '/' + root.tag);

  return {
    totalNodes: total,
    maxDepth: depth,
    tagCounts: [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag, count]) => ({ tag, count })),
    namespaces: ns,
    references: { ids: [...new Set(ids)].sort(), refs: [...new Set(refs)].sort() },
    repeatedPatterns: [...patternMap.entries()]
      .map(([k, occurrences]) => {
        const [parent, child] = k.split(' → ');
        return { parent, child, occurrences };
      })
      .sort((a, b) => b.occurrences - a.occurrences),
  };
}
