/**
 * Canonical pretty-printer for parsed `XmlNode` trees. Produces output with
 * the same conventions as our serializer (LF, 2-space indent, sorted attrs)
 * so two trees can be string-diffed after normalization.
 */
import type { XmlNode } from './xmlParser';

const escapeText = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttr = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '&#10;');

function attrString(node: XmlNode): string {
  const merged: Record<string, string> = { ...node.attrs };
  for (const [prefix, uri] of Object.entries(node.namespaces)) {
    const key = prefix === '' ? 'xmlns' : `xmlns:${prefix}`;
    merged[key] = uri;
  }
  const keys = Object.keys(merged).sort();
  if (!keys.length) return '';
  return ' ' + keys.map((k) => `${k}="${escapeAttr(merged[k])}"`).join(' ');
}

function renderNode(node: XmlNode, indent: number): string {
  const pad = '  '.repeat(indent);
  const attrs = attrString(node);
  if (!node.children.length && !node.text) {
    return `${pad}<${node.tag}${attrs}/>`;
  }
  if (!node.children.length && node.text !== undefined) {
    return `${pad}<${node.tag}${attrs}>${escapeText(node.text)}</${node.tag}>`;
  }
  const inner = node.children.map((c) => renderNode(c, indent + 1)).join('\n');
  return `${pad}<${node.tag}${attrs}>\n${inner}\n${pad}</${node.tag}>`;
}

export interface NormalizeOptions {
  /** Sort sibling elements by tag (then text). Useful when comparing different generators. */
  sortSiblings?: boolean;
}

function sortTree(node: XmlNode): XmlNode {
  const sortedChildren = [...node.children]
    .map(sortTree)
    .sort((a, b) => (a.tag === b.tag ? (a.text ?? '').localeCompare(b.text ?? '') : a.tag.localeCompare(b.tag)));
  return { ...node, children: sortedChildren };
}

export function normalizeXml(root: XmlNode, opts: NormalizeOptions = {}): string {
  const tree = opts.sortSiblings ? sortTree(root) : root;
  return `<?xml version="1.0" encoding="UTF-8"?>\n${renderNode(tree, 0)}\n`;
}
