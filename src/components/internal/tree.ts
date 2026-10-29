import { fold } from '../../internal/text';

/** Lógica del `TreeView`: aplanado, casillas en tres estados y filtro. Pura para poder probarla. */

export interface TreeNode<T = unknown> {
  id: string;
  label: string;
  children?: TreeNode<T>[];
  /** Tiene hijos que aún no se han cargado (`loadChildren`). */
  hasChildren?: boolean;
  disabled?: boolean;
  data?: T;
}

export interface FlatNode<T = unknown> {
  node: TreeNode<T>;
  level: number;
  parentId: string | null;
  /** Posición entre sus hermanos (1…n) y número de hermanos, para `aria-posinset` / `aria-setsize`. */
  position: number;
  siblings: number;
  expandable: boolean;
}

export const isExpandable = (node: TreeNode) => !!(node.children?.length || node.hasChildren);

/** Nodos visibles en orden, bajando solo por los expandidos. */
export function visibleNodes<T>(nodes: readonly TreeNode<T>[], expanded: ReadonlySet<string>, level = 1, parentId: string | null = null): FlatNode<T>[] {
  const out: FlatNode<T>[] = [];
  nodes.forEach((node, i) => {
    out.push({ node, level, parentId, position: i + 1, siblings: nodes.length, expandable: isExpandable(node) });
    if (node.children && expanded.has(node.id)) out.push(...visibleNodes(node.children, expanded, level + 1, node.id));
  });
  return out;
}

/** Todos los ids de un subárbol (incluido el nodo). */
export function descendantIds(node: TreeNode): string[] {
  return [node.id, ...(node.children ?? []).flatMap(descendantIds)];
}

/** Índice id → nodo y id → padre. */
export function indexTree<T>(nodes: readonly TreeNode<T>[]) {
  const byId = new Map<string, TreeNode<T>>(); const parent = new Map<string, string | null>();
  const walk = (list: readonly TreeNode<T>[], p: string | null) => list.forEach((n) => { byId.set(n.id, n); parent.set(n.id, p); if (n.children) walk(n.children, n.id); });
  walk(nodes, null);
  return { byId, parent };
}

export type CheckState = 'checked' | 'unchecked' | 'indeterminate';

/**
 * Estado de cada casilla a partir de las hojas marcadas: un padre está marcado si lo están todos sus hijos,
 * a medias si lo está alguno.
 */
export function checkStates(nodes: readonly TreeNode[], checked: ReadonlySet<string>): Map<string, CheckState> {
  const states = new Map<string, CheckState>();
  const visit = (node: TreeNode): CheckState => {
    if (!node.children?.length) {
      const s: CheckState = checked.has(node.id) ? 'checked' : 'unchecked';
      states.set(node.id, s); return s;
    }
    const kids = node.children.map(visit);
    const s: CheckState = kids.every((k) => k === 'checked') ? 'checked' : kids.some((k) => k !== 'unchecked') ? 'indeterminate' : 'unchecked';
    states.set(node.id, s); return s;
  };
  nodes.forEach(visit);
  return states;
}

/**
 * Marca o desmarca un nodo con todo su subárbol. El conjunto guarda solo **hojas** (y nodos sin hijos cargados): los
 * padres se deducen con `checkStates`. Los nodos desactivados no cambian.
 */
export function toggleChecked(nodes: readonly TreeNode[], checked: ReadonlySet<string>, id: string): Set<string> {
  const { byId } = indexTree(nodes);
  const node = byId.get(id);
  const next = new Set(checked);
  if (!node) return next;
  const leaves = descendantIds(node).map((d) => byId.get(d)!).filter((n) => !n.children?.length && !n.disabled).map((n) => n.id);
  const state = checkStates(nodes, checked).get(id);
  const turnOn = state !== 'checked';
  leaves.forEach((leaf) => (turnOn ? next.add(leaf) : next.delete(leaf)));
  return next;
}

/**
 * Filtra el árbol por texto (sin acentos ni mayúsculas). Se conservan los nodos que coinciden con todo su subárbol, y
 * los ancestros de cualquier coincidencia, para que se vea dónde está. Devuelve también qué hay que expandir.
 */
export function filterTree<T>(nodes: readonly TreeNode<T>[], query: string): { nodes: TreeNode<T>[]; expand: Set<string> } {
  const needle = fold(query.trim());
  const expand = new Set<string>();
  if (!needle) return { nodes: [...nodes], expand };
  const visit = (list: readonly TreeNode<T>[]): TreeNode<T>[] => list.flatMap((node) => {
    if (fold(node.label).includes(needle)) return [node];
    const kids = node.children ? visit(node.children) : [];
    if (!kids.length) return [];
    expand.add(node.id);
    return [{ ...node, children: kids }];
  });
  return { nodes: visit(nodes), expand };
}
