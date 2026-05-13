/**
 * Minimal XML parser → `XmlNode` AST. Dev-only, used for diffing/inspection.
 *
 * Scope:
 *  - Element nodes with attributes (namespace prefixes preserved verbatim).
 *  - Text nodes (whitespace-collapsed when between elements).
 *  - Skips XML declaration, comments, processing instructions, DOCTYPE.
 *  - CDATA contents flattened into text.
 *
 * Not a conformant XML 1.1 parser. Sufficient for AG eTax / RIAG payloads.
 */

export interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  /** namespace prefix → uri declared on this node */
  namespaces: Record<string, string>;
  text?: string;
  children: XmlNode[];
}

const decodeEntities = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(parseInt(d, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/&amp;/g, '&');

interface ParserState { src: string; pos: number }

function skipWhitespace(st: ParserState): void {
  while (st.pos < st.src.length && /\s/.test(st.src[st.pos])) st.pos++;
}

function parseAttrs(raw: string): { attrs: Record<string, string>; ns: Record<string, string> } {
  const attrs: Record<string, string> = {};
  const ns: Record<string, string> = {};
  const re = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const key = m[1];
    const val = decodeEntities(m[2] ?? m[3] ?? '');
    if (key === 'xmlns') ns[''] = val;
    else if (key.startsWith('xmlns:')) ns[key.slice(6)] = val;
    else attrs[key] = val;
  }
  return { attrs, ns };
}

function parseElement(st: ParserState): XmlNode | null {
  // Expect '<'
  if (st.src[st.pos] !== '<') return null;
  st.pos++;

  // Read tag + attrs until '>' or '/>'
  let tagEnd = st.pos;
  while (tagEnd < st.src.length && st.src[tagEnd] !== '>') tagEnd++;
  const headerRaw = st.src.slice(st.pos, tagEnd);
  const selfClosing = headerRaw.endsWith('/');
  const inner = selfClosing ? headerRaw.slice(0, -1) : headerRaw;
  const wsIdx = inner.search(/\s/);
  const tag = wsIdx === -1 ? inner.trim() : inner.slice(0, wsIdx).trim();
  const attrRaw = wsIdx === -1 ? '' : inner.slice(wsIdx);
  const { attrs, ns } = parseAttrs(attrRaw);
  st.pos = tagEnd + 1;

  const node: XmlNode = { tag, attrs, namespaces: ns, children: [] };
  if (selfClosing) return node;

  // Children loop
  let textBuf = '';
  while (st.pos < st.src.length) {
    if (st.src.startsWith('</', st.pos)) {
      const end = st.src.indexOf('>', st.pos);
      st.pos = end + 1;
      if (textBuf.trim() && node.children.length === 0) {
        node.text = decodeEntities(textBuf.trim());
      }
      return node;
    }
    if (st.src.startsWith('<!--', st.pos)) {
      const end = st.src.indexOf('-->', st.pos);
      st.pos = end === -1 ? st.src.length : end + 3;
      continue;
    }
    if (st.src.startsWith('<![CDATA[', st.pos)) {
      const end = st.src.indexOf(']]>', st.pos);
      const content = st.src.slice(st.pos + 9, end === -1 ? st.src.length : end);
      textBuf += content;
      st.pos = end === -1 ? st.src.length : end + 3;
      continue;
    }
    if (st.src.startsWith('<?', st.pos)) {
      const end = st.src.indexOf('?>', st.pos);
      st.pos = end === -1 ? st.src.length : end + 2;
      continue;
    }
    if (st.src[st.pos] === '<') {
      const child = parseElement(st);
      if (child) node.children.push(child);
      textBuf = '';
      continue;
    }
    textBuf += st.src[st.pos++];
  }
  if (textBuf.trim() && node.children.length === 0) {
    node.text = decodeEntities(textBuf.trim());
  }
  return node;
}

export function parseXml(src: string): XmlNode {
  const trimmed = src.replace(/^\uFEFF/, '');
  const st: ParserState = { src: trimmed, pos: 0 };
  skipWhitespace(st);
  // Skip prolog/DOCTYPE
  while (st.pos < st.src.length && st.src.startsWith('<?', st.pos)) {
    const end = st.src.indexOf('?>', st.pos);
    st.pos = end === -1 ? st.src.length : end + 2;
    skipWhitespace(st);
  }
  while (st.pos < st.src.length && st.src.startsWith('<!', st.pos)) {
    const end = st.src.indexOf('>', st.pos);
    st.pos = end === -1 ? st.src.length : end + 1;
    skipWhitespace(st);
  }
  skipWhitespace(st);
  const root = parseElement(st);
  if (!root) throw new Error('parseXml: no root element found');
  return root;
}
