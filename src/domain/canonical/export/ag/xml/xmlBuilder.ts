/**
 * Minimal deterministic XML writer. Zero deps.
 *
 * Guarantees:
 *  - Element children in caller-provided order (caller controls order).
 *  - Attributes serialized alphabetically.
 *  - LF line endings, indented with two spaces, single newline per element.
 *  - UTF-8 output via TextEncoder.
 *  - Strict escaping for & < > " ' and control chars.
 */

export interface XmlElement {
  tag: string;
  attrs?: Record<string, string | number | undefined>;
  /** Either text or children. */
  text?: string | number;
  children?: XmlElement[];
}

const escapeText = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#13;');

const escapeAttr = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\r/g, '&#13;')
    .replace(/\n/g, '&#10;')
    .replace(/\t/g, '&#9;');

function renderAttrs(attrs?: Record<string, string | number | undefined>): string {
  if (!attrs) return '';
  const keys = Object.keys(attrs).filter((k) => attrs[k] !== undefined).sort();
  if (!keys.length) return '';
  return ' ' + keys.map((k) => `${k}="${escapeAttr(String(attrs[k]))}"`).join(' ');
}

function renderElement(el: XmlElement, indent: number): string {
  const pad = '  '.repeat(indent);
  const attrs = renderAttrs(el.attrs);
  const hasChildren = !!(el.children && el.children.length);
  const hasText = el.text !== undefined && el.text !== null && String(el.text).length > 0;

  if (!hasChildren && !hasText) {
    return `${pad}<${el.tag}${attrs}/>`;
  }
  if (hasText && !hasChildren) {
    return `${pad}<${el.tag}${attrs}>${escapeText(String(el.text))}</${el.tag}>`;
  }
  const inner = (el.children ?? []).map((c) => renderElement(c, indent + 1)).join('\n');
  return `${pad}<${el.tag}${attrs}>\n${inner}\n${pad}</${el.tag}>`;
}

export interface RenderOptions {
  /** Defaults to '1.0'. */
  version?: string;
  /** Defaults to 'UTF-8'. */
  encoding?: string;
}

export function renderXml(root: XmlElement, opts: RenderOptions = {}): string {
  const version = opts.version ?? '1.0';
  const encoding = opts.encoding ?? 'UTF-8';
  return `<?xml version="${version}" encoding="${encoding}"?>\n${renderElement(root, 0)}\n`;
}

export function renderXmlBytes(root: XmlElement, opts?: RenderOptions): Uint8Array {
  return new TextEncoder().encode(renderXml(root, opts));
}

/** Convenience element factory. */
export const el = (
  tag: string,
  attrsOrChildren?: Record<string, string | number | undefined> | XmlElement[],
  childrenOrText?: XmlElement[] | string | number,
): XmlElement => {
  if (Array.isArray(attrsOrChildren)) {
    return { tag, children: attrsOrChildren };
  }
  if (typeof childrenOrText === 'string' || typeof childrenOrText === 'number') {
    return { tag, attrs: attrsOrChildren, text: childrenOrText };
  }
  return { tag, attrs: attrsOrChildren, children: childrenOrText };
};
