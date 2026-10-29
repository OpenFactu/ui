import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { Collapse } from './Collapse';
import { Spinner } from './Spinner';
import { checkStates, filterTree, isExpandable, toggleChecked, visibleNodes, type CheckState, type TreeNode } from './internal/tree';
import { useMessages } from '../i18n/I18nProvider';

export type { TreeNode } from './internal/tree';

export interface TreeViewProps<T = unknown> {
  nodes: readonly TreeNode<T>[];
  /** Nodos expandidos (controlado). */
  expanded?: readonly string[];
  defaultExpanded?: readonly string[];
  onExpandedChange?: (ids: string[]) => void;
  /** Nodo seleccionado (selección simple). */
  selected?: string | null;
  onSelect?: (id: string, node: TreeNode<T>) => void;
  /** Casillas en tres estados: marcar un padre marca su rama. `checked` son las hojas marcadas. */
  checkable?: boolean;
  checked?: readonly string[];
  onCheckedChange?: (ids: string[]) => void;
  /** Carga perezosa: hijos de un nodo con `hasChildren` al expandirlo por primera vez. */
  loadChildren?: (node: TreeNode<T>) => Promise<TreeNode<T>[]>;
  /** Texto de filtro: deja lo que coincide, con sus ancestros, y lo expande. */
  filter?: string;
  /** Icono de cada nodo. Por defecto carpetas y documentos. */
  getIcon?: (node: TreeNode<T>, expanded: boolean) => React.ReactNode;
  /** Contenido de la fila en lugar del texto (contadores, etiquetas…). */
  renderLabel?: (node: TreeNode<T>) => React.ReactNode;
  /** Texto si no hay nodos (o el filtro no encuentra nada). */
  empty?: React.ReactNode;
  'aria-label'?: string;
  className?: string;
}

const defaultIcon = (node: TreeNode, expanded: boolean) =>
  isExpandable(node) ? <UiIcon slot={expanded ? 'folder-open' : 'folder'} size={15} /> : <UiIcon slot="file" size={15} />;

const CheckBox: React.FC<{ state: CheckState }> = ({ state }) => (
  <span className="k-tree-check" data-state={state} aria-hidden="true">
    {state === 'checked' && <UiIcon slot="check" size={11} />}
    {state === 'indeterminate' && <UiIcon slot="minus" size={11} />}
  </span>
);

/**
 * Árbol jerárquico (carpetas, categorías, plan de cuentas, permisos). Sigue el patrón de árbol de WAI-ARIA: flechas para
 * moverse, abrir y cerrar, Inicio y Fin, y escribir una letra salta al siguiente nodo que empieza por ella. Las ramas se
 * despliegan animando su altura; admite casillas en tres estados, carga perezosa y filtro.
 */
export function TreeView<T = unknown>({
  nodes, expanded: controlledExpanded, defaultExpanded = [], onExpandedChange, selected, onSelect, checkable, checked = [], onCheckedChange,
  loadChildren, filter = '', getIcon = defaultIcon, renderLabel, empty: emptyProp, className, ...rest
}: TreeViewProps<T>) {
  const emptyDefault = useMessages('status').noItems;
  const empty = emptyProp ?? emptyDefault;
  const [internalExpanded, setInternalExpanded] = React.useState<string[]>([...defaultExpanded]);
  const expandedList = controlledExpanded ?? internalExpanded;
  const [loaded, setLoaded] = React.useState<Record<string, TreeNode<T>[]>>({});
  const [loading, setLoading] = React.useState<Set<string>>(new Set());
  const [focusId, setFocusId] = React.useState<string | null>(null);
  const root = React.useRef<HTMLUListElement>(null);
  const typeahead = React.useRef({ text: '', at: 0 });

  // Árbol con los hijos cargados a demanda ya colocados.
  const tree = React.useMemo(() => {
    const merge = (list: readonly TreeNode<T>[]): TreeNode<T>[] => list.map((n) => {
      const kids = loaded[n.id] ?? n.children;
      return kids ? { ...n, children: merge(kids), hasChildren: n.hasChildren && !kids.length ? false : n.hasChildren } : n;
    });
    return merge(nodes);
  }, [nodes, loaded]);

  const { nodes: shownTree, expand: filterExpand } = React.useMemo(() => filterTree(tree, filter), [tree, filter]);
  const expandedSet = React.useMemo(() => new Set([...expandedList, ...filterExpand]), [expandedList, filterExpand]);
  const flat = React.useMemo(() => visibleNodes(shownTree, expandedSet), [shownTree, expandedSet]);
  const states = React.useMemo(() => (checkable ? checkStates(tree, new Set(checked)) : null), [checkable, tree, checked]);
  const activeId = focusId && flat.some((f) => f.node.id === focusId) ? focusId : (selected && flat.some((f) => f.node.id === selected) ? selected : flat[0]?.node.id ?? null);

  const setExpanded = (ids: string[]) => { if (controlledExpanded === undefined) setInternalExpanded(ids); onExpandedChange?.(ids); };
  const toggleExpand = async (node: TreeNode<T>, open?: boolean) => {
    const isOpen = expandedSet.has(node.id);
    const next = open ?? !isOpen;
    if (next === isOpen) return;
    setExpanded(next ? [...expandedList, node.id] : expandedList.filter((id) => id !== node.id));
    if (next && loadChildren && node.hasChildren && !node.children?.length && !loaded[node.id]) {
      setLoading((s) => new Set(s).add(node.id));
      try {
        const kids = await loadChildren(node);
        setLoaded((l) => ({ ...l, [node.id]: kids }));
      } finally {
        setLoading((s) => { const n = new Set(s); n.delete(node.id); return n; });
      }
    }
  };
  const toggleCheck = (node: TreeNode<T>) => { if (!node.disabled) onCheckedChange?.([...toggleChecked(tree, new Set(checked), node.id)]); };
  const activate = (node: TreeNode<T>) => {
    if (node.disabled) return;
    if (checkable) toggleCheck(node);
    onSelect?.(node.id, node);
  };

  const focusNode = (id: string) => {
    setFocusId(id);
    requestAnimationFrame(() => root.current?.querySelector<HTMLElement>(`[data-tree-id="${CSS.escape(id)}"]`)?.focus());
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    const index = flat.findIndex((f) => f.node.id === activeId);
    if (index < 0) return;
    const current = flat[index];
    const go = (i: number) => { const target = flat[Math.max(0, Math.min(flat.length - 1, i))]; if (target) focusNode(target.node.id); };
    switch (event.key) {
      case 'ArrowDown': event.preventDefault(); go(index + 1); return;
      case 'ArrowUp': event.preventDefault(); go(index - 1); return;
      case 'Home': event.preventDefault(); go(0); return;
      case 'End': event.preventDefault(); go(flat.length - 1); return;
      case 'ArrowRight':
        event.preventDefault();
        if (current.expandable && !expandedSet.has(current.node.id)) void toggleExpand(current.node, true);
        else if (current.expandable && flat[index + 1]?.parentId === current.node.id) go(index + 1);
        return;
      case 'ArrowLeft':
        event.preventDefault();
        if (current.expandable && expandedSet.has(current.node.id)) void toggleExpand(current.node, false);
        else if (current.parentId) focusNode(current.parentId);
        return;
      case 'Enter': case ' ': event.preventDefault(); activate(current.node); return;
      default:
        if (event.key.length === 1 && /\S/.test(event.key) && !event.ctrlKey && !event.metaKey) {
          // Búsqueda tecleando: varias letras seguidas forman un prefijo.
          const now = Date.now();
          const t = typeahead.current;
          t.text = now - t.at < 700 ? t.text + event.key.toLowerCase() : event.key.toLowerCase();
          t.at = now;
          const order = [...flat.slice(index + 1), ...flat.slice(0, index + 1)];
          const hit = order.find((f) => f.node.label.toLowerCase().startsWith(t.text)) ?? (t.text.length > 1 ? undefined : order.find((f) => f.node.label.toLowerCase().startsWith(event.key.toLowerCase())));
          if (hit) focusNode(hit.node.id);
        }
    }
  };

  const renderLevel = (list: readonly TreeNode<T>[], level: number): React.ReactNode => list.map((node, i) => {
    const open = expandedSet.has(node.id);
    const expandable = isExpandable(node);
    const state = states?.get(node.id);
    const isSelected = selected === node.id;
    return (
      <li
        key={node.id}
        role="treeitem"
        data-tree-id={node.id}
        aria-level={level}
        aria-setsize={list.length}
        aria-posinset={i + 1}
        aria-expanded={expandable ? open : undefined}
        aria-selected={onSelect ? isSelected : undefined}
        aria-checked={state ? (state === 'indeterminate' ? 'mixed' : state === 'checked') : undefined}
        aria-disabled={node.disabled || undefined}
        aria-busy={loading.has(node.id) || undefined}
        tabIndex={node.id === activeId ? 0 : -1}
        className="k-tree-item"
        onFocus={(e) => { if (e.target === e.currentTarget) setFocusId(node.id); }}
      >
        <div
          className="k-tree-row"
          data-selected={isSelected || undefined}
          data-disabled={node.disabled || undefined}
          style={{ paddingLeft: `calc(${level - 1} * var(--k-tree-indent, 18px) + 6px)` }}
          onClick={(e) => { e.stopPropagation(); setFocusId(node.id); if (expandable && !checkable && !onSelect) void toggleExpand(node); else activate(node); }}
        >
          <span
            className="k-tree-twisty"
            data-open={open || undefined}
            aria-hidden="true"
            onClick={expandable ? (e) => { e.stopPropagation(); setFocusId(node.id); void toggleExpand(node); } : undefined}
          >
            {loading.has(node.id) ? <Spinner size="xs" tone="muted" /> : expandable && <UiIcon slot="chevron-right" size={13} />}
          </span>
          {state && <span onClick={(e) => { e.stopPropagation(); toggleCheck(node); }}><CheckBox state={state} /></span>}
          <span className="k-tree-icon" aria-hidden="true">{getIcon(node, open)}</span>
          <span className="k-tree-label">{renderLabel ? renderLabel(node) : node.label}</span>
        </div>
        {expandable && node.children && node.children.length > 0 && (
          <Collapse open={open}>
            <ul role="group" className="k-tree-group">{renderLevel(node.children, level + 1)}</ul>
          </Collapse>
        )}
      </li>
    );
  });

  if (!flat.length) return <div className={cn('k-tree-empty', className)}>{empty}</div>;
  return (
    <ul
      ref={root}
      role="tree"
      aria-label={rest['aria-label']}
      aria-multiselectable={checkable || undefined}
      data-k-mobile="TreeView"
      className={cn('k-tree', className)}
      onKeyDown={onKeyDown}
    >
      {renderLevel(shownTree, 1)}
    </ul>
  );
}
