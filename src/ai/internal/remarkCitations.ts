/** Convierte `[1]` y `[1][2]` del texto en un elemento `ai-cite`, sin tocar el código, los enlaces ni las imágenes. */

interface MdNode { type: string; value?: string; children?: MdNode[]; data?: { hName?: string; hProperties?: Record<string, string> } }

const MARKER = /\[\d{1,3}\](?:[ ,]*\[\d{1,3}\])*/g;
const OPAQUE = new Set(['link', 'linkReference', 'image', 'imageReference', 'inlineCode', 'code', 'html', 'definition']);

function citeText(value: string): MdNode[] | null {
  MARKER.lastIndex = 0;
  if (!MARKER.test(value)) return null;
  MARKER.lastIndex = 0;
  const nodes: MdNode[] = [];
  let cursor = 0;
  for (let match = MARKER.exec(value); match; match = MARKER.exec(value)) {
    if (match.index > cursor) nodes.push({ type: 'text', value: value.slice(cursor, match.index) });
    const refs = (match[0].match(/\d+/g) ?? []).join(',');
    nodes.push({ type: 'aiCitation', children: [], data: { hName: 'ai-cite', hProperties: { refs } } });
    cursor = match.index + match[0].length;
  }
  if (cursor < value.length) nodes.push({ type: 'text', value: value.slice(cursor) });
  return nodes;
}

function walk(node: MdNode) {
  if (!node.children || OPAQUE.has(node.type)) return;
  const next: MdNode[] = [];
  for (const child of node.children) {
    const replaced = child.type === 'text' && child.value ? citeText(child.value) : null;
    if (replaced) next.push(...replaced);
    else { walk(child); next.push(child); }
  }
  node.children = next;
}

/** Plugin de remark. Lo que no corresponda a ninguna fuente lo decide quien pinta `ai-cite`. */
export function remarkCitations() {
  return (tree: unknown) => walk(tree as MdNode);
}

/** El texto citado como cita de Markdown, listo para el compositor. */
export function quoteMarkdown(text: string): string {
  return text.trim().split('\n').map((line) => `> ${line}`.trimEnd()).join('\n');
}
