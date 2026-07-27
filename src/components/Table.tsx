import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronRight, Columns3, MoreHorizontal } from 'lucide-react';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { cn } from '../utils';
import { Checkbox } from './Checkbox';
import { Pagination } from './Pagination';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';
import { useContextMenu } from './ContextMenu';
import { Skeleton } from './Skeleton';
import { densityClasses, skeletonWidth, type Density } from './internal/density';
import { usePopover } from '../hooks/usePopover';
import { useIsNarrow } from '../hooks/useMediaQuery';

export interface TableColumn<T> {
  header: string;
  accessor?: keyof T | ((item: T, index: number) => React.ReactNode);
  cell?: (item: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
  width?: string;
  /** Si true, aplica estilo primary column: DM Mono 12px ink-900 medium. */
  primary?: boolean;
  /** Si true, la columna es ordenable. Por defecto usa `accessor` como clave.
   *  Si `accessor` es función o necesitas otra clave, pasa `sortAccessor`. */
  sortable?: boolean;
  /** Accessor específico para ordenar (cuando `accessor` es función o no existe). */
  sortAccessor?: (item: T) => any;
  /** Clave estable para ordenación/visibilidad/resize. Fallback: `header`
   *  (obligatorio si dos columnas comparten header). */
  id?: string;
  /**
   * Papel de la columna cuando la tabla se pinta como tarjetas en pantalla
   * estrecha (`responsive="cards"`). Sin indicar nada va al cuerpo con su
   * etiqueta delante.
   */
  card?: 'title' | 'subtitle' | 'status' | 'meta' | 'body' | 'hidden';
}

export type TableDensity = Density;

/** Acción de fila (menú ⋯ y click derecho). Mismo shape que DropdownMenuItem. */
export type RowAction = DropdownMenuItem;

export interface TablePagination {
  pageSize: number;
  /** Página controlada (1-based). Si se omite, la Table mantiene estado interno. */
  page?: number;
  onPageChange?: (page: number) => void;
  /** Modo servidor: total real de registros; `data` es SOLO la página actual
   *  y no se pagina en cliente. */
  total?: number;
  pageSizeOptions?: number[];
  /** Si se pasa, `pageSize` se trata como controlado. */
  onPageSizeChange?: (size: number) => void;
}

export interface TableInfinite {
  /** Quedan más filas por traer. */
  hasMore: boolean;
  /** Trae la página siguiente. Se llama una vez por cada acercamiento al final. */
  onLoadMore: () => void;
  /** Hay una petición en vuelo; se enseña un indicador y no se pide otra. */
  loading?: boolean;
  /** Qué poner cuando ya no queda nada. `false` no pone nada. */
  endMessage?: React.ReactNode | false;
}

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  /**
   * Estado vacío. Admite nodos, no solo texto: un vacío útil suele llevar
   * icono y un botón para crear el primer registro.
   */
  emptyMessage?: React.ReactNode;
  /**
   * Clases extra por fila, para el estado visual que solo conoce quien la usa:
   * la fila seleccionada de un panel, o tachar las ya asignadas. Sin esto hay
   * que salirse del componente y escribir la tabla a mano.
   */
  rowClassName?: (item: T, index: number) => string | undefined;
  isLoading?: boolean;
  /** Densidad de filas. Default: 'compact' (estilo Odoo). */
  density?: TableDensity;
  /** Si true, añade columna de checkboxes y permite multi-select.
   *  Con paginación en cliente, el checkbox de cabecera selecciona SOLO la página visible. */
  selectable?: boolean;
  /** Selección controlada. Si se omite, la Table mantiene estado interno. */
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Cómo extraer la key de cada fila. Default: item.id. */
  rowKey?: (item: T, index: number) => string | number;
  /** Paginación integrada (cliente o servidor, ver TablePagination). */
  pagination?: TablePagination;
  /**
   * Carga la página siguiente al acercarse al final, en lugar de paginar. Se
   * excluye con `pagination`: o se navega por páginas o se sigue bajando.
   */
  infinite?: TableInfinite;
  /** Filas expandibles: contenido del detalle. Añade columna chevron. */
  renderExpanded?: (item: T) => React.ReactNode;
  /** Expansión controlada. */
  expandedKeys?: Set<string | number>;
  onExpandedChange?: (keys: Set<string | number>) => void;
  /** Acciones por fila: botón ⋯ al hover + menú contextual con click derecho. */
  rowActions?: (item: T) => RowAction[];
  /** Fija la primera columna (y las utilitarias) al hacer scroll horizontal. */
  stickyFirstColumn?: boolean;
  /** Visibilidad controlada: key = col.id ?? col.header. */
  columnVisibility?: Record<string, boolean>;
  onColumnVisibilityChange?: (visibility: Record<string, boolean>) => void;
  /** Botón en la cabecera para mostrar/ocultar columnas. */
  showColumnToggle?: boolean;
  /** Redimensionar columnas arrastrando el borde de la cabecera. */
  resizableColumns?: boolean;
  /** Cómo se representa `isLoading`. Default 'skeleton'. */
  loadingVariant?: 'skeleton' | 'spinner';
  /** Filas fantasma en modo esqueleto. Default: el tamaño de página, o 8. */
  skeletonRows?: number;
  /**
   * Alto de la caja de contenido de cada celda fantasma. Por defecto es la
   * caja de línea del texto (`1.25em`), que clava la altura en tablas de solo
   * texto. Si las filas llevan Badges o botones serán algo más altas que el
   * esqueleto: pásale aquí la altura real (p. ej. `24`) para que coincida.
   */
  skeletonRowHeight?: number | string;
  /** Texto bajo el spinner (solo con loadingVariant='spinner'). */
  loadingLabel?: string;
  /**
   * Qué hacer cuando no cabe: 'scroll' (default) deja desplazar en horizontal;
   * 'cards' pinta una tarjeta por fila por debajo de `cardsBreakpoint`.
   */
  responsive?: 'scroll' | 'cards';
  /** Ancho por debajo del cual se pasa a tarjetas. Default 640. */
  cardsBreakpoint?: number;
  /**
   * Fila de totales al pie, alineada con las columnas. Se le pasan las filas
   * visibles y devuelve una celda por columna visible (o `null` para dejarla
   * vacía). Evita tener que montar un bloque de totales aparte que se
   * desalinea con la tabla.
   */
  summaryRow?: (rows: T[]) => Array<React.ReactNode>;
  /** Etiqueta de la primera celda del pie. Default 'Total'. */
  summaryLabel?: React.ReactNode;
  /** Fila extra al final del cuerpo, para el «+ Añadir línea». */
  appendRow?: React.ReactNode;
}

type SortDir = 'asc' | 'desc';

interface SortState {
  colKey: string;
  dir: SortDir;
}

function compareValues(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const da = a instanceof Date ? a.getTime() : NaN;
  const db = b instanceof Date ? b.getTime() : NaN;
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  // Intentar parseo numérico (strings tipo "1,234.56" con , y .)
  const na = Number(String(a).replace(/[^\d.-]/g, ''));
  const nb = Number(String(b).replace(/[^\d.-]/g, ''));
  if (!Number.isNaN(na) && !Number.isNaN(nb) && String(a).match(/\d/) && String(b).match(/\d/)) {
    return na - nb;
  }
  return String(a).localeCompare(String(b), undefined, { numeric: true });
}

function colKeyOf<T>(col: TableColumn<T>): string {
  return col.id ?? col.header;
}

/** Popover con checkboxes para mostrar/ocultar columnas. */
function ColumnToggle({
  entries,
  onToggle,
}: {
  entries: { key: string; header: string; visible: boolean }[];
  onToggle: (key: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const { anchorRef, popoverRef, style, ready } = usePopover<HTMLButtonElement>({
    open: isOpen,
    onClose: () => setIsOpen(false),
    align: 'end',
    minWidth: 180,
    scrollStrategy: 'close',
  });

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label="Mostrar u ocultar columnas"
        title="Columnas"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-accent hover:bg-[var(--bg-hover)] transition-colors"
      >
        <Columns3 className="h-3.5 w-3.5" />
      </button>
      {isOpen &&
        createPortal(
          <div
            ref={popoverRef}
            className={cn(
              'z-[var(--k-z-popover,999999)] min-w-[180px] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-1 shadow-lg',
              !ready && 'invisible',
            )}
            style={style}
          >
            <p className="px-2.5 pt-1.5 pb-1 text-[9px] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
              Columnas
            </p>
            {entries.map((entry) => (
              <label
                key={entry.key}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--k-radius-xs,2px)] text-[12px] text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)] cursor-pointer"
              >
                <Checkbox checked={entry.visible} onChange={() => onToggle(entry.key)} size="sm" />
                <span className="truncate">{entry.header}</span>
              </label>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Celda de acciones de fila.
 *
 * Con una sola acción no se pliega: esconder un único botón detrás de un menú
 * cuesta dos clics para llegar a lo mismo y no ahorra nada de ancho, así que se
 * pinta directo. A partir de dos sí compensa el desplegable. El menú de click
 * derecho de la fila sigue ofreciéndolas en ambos casos.
 */
const RowActionsCell: React.FC<{ actions: RowAction[] | null; alwaysVisible?: boolean }> = ({
  actions,
  alwaysVisible,
}) => {
  if (!actions || actions.length === 0) return null;

  const revealClass = alwaysVisible
    ? ''
    : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-within:opacity-100';
  const btnClass = cn(
    'p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-accent hover:bg-[var(--bg-hover)] transition-all disabled:opacity-40 disabled:pointer-events-none',
    revealClass,
  );

  if (actions.length === 1) {
    const only = actions[0];
    const label = typeof only.label === 'string' ? only.label : 'Acción de la fila';
    return (
      <button
        type="button"
        title={label}
        aria-label={label}
        disabled={only.disabled}
        onClick={only.onClick}
        className={cn(btnClass, only.destructive && 'hover:text-[var(--k-danger-fg)]')}
      >
        {only.icon ?? <MoreHorizontal className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <DropdownMenu items={actions} align="end">
      <button type="button" aria-label="Acciones de la fila" className={btnClass}>
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>
    </DropdownMenu>
  );
};

export function Table<T>({
  columns,
  data = [],
  onRowClick,
  rowClassName,
  className,
  emptyMessage = 'No se encontraron registros.',
  isLoading,
  density = 'normal',
  selectable = false,
  selectedKeys,
  onSelectionChange,
  rowKey,
  pagination,
  infinite,
  renderExpanded,
  expandedKeys,
  onExpandedChange,
  rowActions,
  stickyFirstColumn = false,
  columnVisibility,
  onColumnVisibilityChange,
  showColumnToggle = false,
  resizableColumns = false,
  loadingVariant = 'skeleton',
  skeletonRows,
  skeletonRowHeight,
  loadingLabel = 'Sincronizando…',
  responsive = 'scroll',
  cardsBreakpoint = 640,
  summaryRow,
  summaryLabel = 'Total',
  appendRow,
}: TableProps<T>) {
  // ── Visibilidad de columnas — controlada o interna ─────────────────────
  const [internalVisibility, setInternalVisibility] = React.useState<Record<string, boolean>>({});
  const visibility = columnVisibility ?? internalVisibility;
  const setVisibility = (next: Record<string, boolean>) => {
    if (columnVisibility === undefined) setInternalVisibility(next);
    onColumnVisibilityChange?.(next);
  };
  const isColVisible = (col: TableColumn<T>) => visibility[colKeyOf(col)] !== false;
  const visibleColumns = columns.filter(isColVisible);

  // ── Ordenación — cíclico: null → asc → desc → null (clave estable) ────
  const [sort, setSort] = React.useState<SortState | null>(null);

  const toggleSort = (colKey: string) => {
    setSort((prev) => {
      if (!prev || prev.colKey !== colKey) return { colKey, dir: 'asc' };
      if (prev.dir === 'asc') return { colKey, dir: 'desc' };
      return null;
    });
  };

  const sortedData = React.useMemo(() => {
    if (!sort) return data;
    const col = columns.find((c) => colKeyOf(c) === sort.colKey);
    if (!col) return data;
    const getVal = (item: T): any => {
      if (col.sortAccessor) return col.sortAccessor(item);
      if (typeof col.accessor === 'function') return col.accessor(item, 0);
      if (col.accessor) return (item as any)[col.accessor];
      return null;
    };
    const sorted = [...data].sort((a, b) => compareValues(getVal(a), getVal(b)));
    return sort.dir === 'desc' ? sorted.reverse() : sorted;
  }, [data, sort, columns]);

  // ── Paginación — cliente (total omitido) o servidor (total presente) ──
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(pagination?.pageSize ?? 25);
  const serverMode = pagination?.total !== undefined;

  const { sentinelRef } = useInfiniteScroll({
    hasMore: infinite?.hasMore ?? false,
    onLoadMore: infinite?.onLoadMore ?? (() => {}),
    loading: infinite?.loading,
    disabled: !infinite || isLoading,
  });

  /** Pie de la carga incremental, compartido por la tabla y las tarjetas. */
  const infiniteFooter = infinite && (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      {infinite.loading && (
        <div className="flex items-center justify-center gap-2 py-3 text-[11px] font-mono uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-accent/20 border-t-accent" />
          Cargando más
        </div>
      )}
      {!infinite.hasMore && !infinite.loading && infinite.endMessage !== false && (
        <div className="py-3 text-center text-[10px] font-mono uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
          {infinite.endMessage ?? 'No hay más registros'}
        </div>
      )}
    </>
  );
  const pageSize = pagination
    ? pagination.onPageSizeChange
      ? pagination.pageSize
      : internalPageSize
    : sortedData.length || 1;
  const totalRecords = serverMode ? pagination!.total! : sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const rawPage = pagination?.page ?? internalPage;
  const page = Math.min(rawPage, totalPages);

  const setPage = (next: number) => {
    if (pagination?.page === undefined) setInternalPage(next);
    pagination?.onPageChange?.(next);
  };
  const setPageSize = (size: number) => {
    if (!pagination?.onPageSizeChange) setInternalPageSize(size);
    if (pagination?.page === undefined) setInternalPage(1);
    pagination?.onPageSizeChange?.(size);
  };

  const pagedData = React.useMemo(() => {
    // Con carga incremental no se recorta: las filas se van acumulando.
    if (!pagination || serverMode || infinite) return sortedData;
    return sortedData.slice((page - 1) * pageSize, page * pageSize);
  }, [sortedData, pagination, serverMode, page, pageSize]);

  // ── Selección — controlada o interna ──────────────────────────────────
  const [internalSelected, setInternalSelected] = React.useState<Set<string | number>>(
    () => new Set(),
  );
  const selected = selectedKeys ?? internalSelected;
  const setSelected = (next: Set<string | number>) => {
    if (selectedKeys === undefined) setInternalSelected(next);
    onSelectionChange?.(next);
  };

  const getKey = React.useCallback(
    (item: T, idx: number): string | number => {
      if (rowKey) return rowKey(item, idx);
      const anyItem = item as any;
      return anyItem?.id ?? idx;
    },
    [rowKey],
  );

  const pageKeys = React.useMemo(() => pagedData.map((d, i) => getKey(d, i)), [pagedData, getKey]);
  const allSelected = pageKeys.length > 0 && pageKeys.every((k) => selected.has(k));
  const someSelected = !allSelected && pageKeys.some((k) => selected.has(k));
  const headerState: 'checked' | 'unchecked' | 'indeterminate' = allSelected
    ? 'checked'
    : someSelected
      ? 'indeterminate'
      : 'unchecked';

  const toggleAll = (checked: boolean) => {
    const next = new Set(selected);
    if (checked) pageKeys.forEach((k) => next.add(k));
    else pageKeys.forEach((k) => next.delete(k));
    setSelected(next);
  };

  const toggleRow = (key: string | number) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  // ── Expansión — controlada o interna ──────────────────────────────────
  const [internalExpanded, setInternalExpanded] = React.useState<Set<string | number>>(
    () => new Set(),
  );
  const expanded = expandedKeys ?? internalExpanded;
  const toggleExpanded = (key: string | number) => {
    const next = new Set(expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    if (expandedKeys === undefined) setInternalExpanded(next);
    onExpandedChange?.(next);
  };

  // ── Acciones por fila (menú contextual) ───────────────────────────────
  const { contextMenu, openContextMenu } = useContextMenu();

  // ── Resize de columnas ─────────────────────────────────────────────────
  const [colWidths, setColWidths] = React.useState<Record<string, number>>({});
  const resizingRef = React.useRef(false);

  const startResize = (event: React.PointerEvent, colKey: string) => {
    event.preventDefault();
    event.stopPropagation();
    const th = (event.target as HTMLElement).closest('th');
    if (!th) return;
    const startX = event.clientX;
    const startWidth = th.offsetWidth;
    resizingRef.current = true;

    const onMove = (e: PointerEvent) => {
      const width = Math.max(60, startWidth + (e.clientX - startX));
      setColWidths((prev) => ({ ...prev, [colKey]: width }));
    };
    const onUp = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      // Evitar que el click posterior dispare la ordenación.
      setTimeout(() => {
        resizingRef.current = false;
      }, 0);
    };
    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  };

  // ── Sticky: offsets de las columnas fijas medidos sobre la cabecera ───
  const headerRowRef = React.useRef<HTMLTableRowElement>(null);
  const [stickyLefts, setStickyLefts] = React.useState<number[]>([]);
  const hasExpand = !!renderExpanded;
  const hasTrailing = !!rowActions || showColumnToggle;
  const leadingCount = (selectable ? 1 : 0) + (hasExpand ? 1 : 0);
  // Celdas sticky: utilitarias iniciales + primera columna de datos.
  const stickyCount = stickyFirstColumn ? leadingCount + 1 : 0;

  React.useLayoutEffect(() => {
    if (!stickyFirstColumn || !headerRowRef.current) return;
    const cells = Array.from(headerRowRef.current.children) as HTMLElement[];
    const lefts: number[] = [];
    let acc = 0;
    for (let i = 0; i < stickyCount && i < cells.length; i++) {
      lefts.push(acc);
      acc += cells[i].offsetWidth;
    }
    setStickyLefts(lefts);
  }, [stickyFirstColumn, stickyCount, visibleColumns.length, density, colWidths, data]);

  const stickyCellStyle = (cellIdx: number): React.CSSProperties | undefined => {
    if (!stickyFirstColumn || cellIdx >= stickyCount) return undefined;
    return { position: 'sticky', left: stickyLefts[cellIdx] ?? 0, zIndex: 2 };
  };

  const stickyCellClass = (cellIdx: number, isRowSelected: boolean): string | false =>
    stickyFirstColumn &&
    cellIdx < stickyCount &&
    cn(
      isRowSelected
        ? 'bg-[color-mix(in_srgb,var(--color-accent)_12%,var(--bg-card))]'
        : 'bg-[var(--bg-card,#ffffff)] group-hover:bg-[var(--bg-hover)]',
      cellIdx === stickyCount - 1 &&
        'shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)] dark:shadow-[2px_0_4px_-2px_rgba(0,0,0,0.5)]',
    );

  const skeletonRowCount = skeletonRows ?? Math.min(pagination?.pageSize ?? 8, 12);
  const cellPad = densityClasses[density].cell;
  const cellText = densityClasses[density].text;
  const totalCols =
    visibleColumns.length + (selectable ? 1 : 0) + (hasExpand ? 1 : 0) + (hasTrailing ? 1 : 0);

  const toggleEntries = columns.map((col) => ({
    key: colKeyOf(col),
    header: col.header,
    visible: isColVisible(col),
  }));

  // ── Vista de tarjetas en pantalla estrecha ────────────────────────────
  const narrow = useIsNarrow(cardsBreakpoint);
  const asCards = responsive === 'cards' && narrow;

  if (asCards) {
    const byRole = (role: TableColumn<T>['card']) => visibleColumns.filter((c) => c.card === role);
    const titleCol = byRole('title')[0] ?? visibleColumns.find((c) => c.primary) ?? visibleColumns[0];
    const subtitleCols = byRole('subtitle');
    const statusCols = byRole('status');
    const metaCols = byRole('meta');
    const bodyCols = visibleColumns.filter(
      (c) =>
        c !== titleCol &&
        !subtitleCols.includes(c) &&
        !statusCols.includes(c) &&
        !metaCols.includes(c) &&
        c.card !== 'hidden',
    );

    const render = (col: TableColumn<T>, item: T, idx: number): React.ReactNode => {
      if (col.cell) return col.cell(item, idx);
      if (typeof col.accessor === 'function') return col.accessor(item, idx);
      if (col.accessor) return item[col.accessor] as React.ReactNode;
      return null;
    };

    return (
      <div className={cn('w-full flex flex-col gap-2', className)}>
        {isLoading ? (
          Array.from({ length: skeletonRowCount }).map((_, i) => (
            <div
              key={i}
              className="rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-3 flex flex-col gap-2"
            >
              <Skeleton height={14} width="55%" />
              <Skeleton height={11} width="35%" />
            </div>
          ))
        ) : pagedData.length === 0 ? (
          <div className="rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] py-10 text-center">
            <span className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
              {emptyMessage}
            </span>
          </div>
        ) : (
          pagedData.map((item, rowIdx) => {
            const key = getKey(item, rowIdx);
            const isRowSelected = selected.has(key);
            const actions = rowActions ? rowActions(item) : null;
            return (
              <div
                key={key}
                onClick={() => onRowClick?.(item)}
                onContextMenu={
                  actions && actions.length > 0 ? (e) => openContextMenu(e, actions) : undefined
                }
                style={{ animation: `k-row-in 0.35s ease-out ${Math.min(rowIdx * 20, 200)}ms both` }}
                className={cn(
                  'rounded-[var(--k-radius-sm,4px)] border bg-[var(--bg-card,#ffffff)] p-3 flex flex-col gap-2 transition-colors',
                  isRowSelected ? 'border-accent bg-accent/5' : 'border-[var(--border-default,#e2e8f0)]',
                  onRowClick && 'cursor-pointer active:bg-[var(--bg-hover,#f1f5f9)]',
                  rowClassName?.(item, rowIdx),
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 min-w-0">
                    {selectable && (
                      <span onClick={(e) => e.stopPropagation()} className="pt-0.5">
                        <Checkbox
                          checked={isRowSelected}
                          onChange={() => toggleRow(key)}
                          size="sm"
                          aria-label={`Seleccionar fila ${rowIdx + 1}`}
                        />
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="font-mono text-[13px] font-medium text-[var(--fg-default,#0a1628)] truncate">
                        {titleCol && render(titleCol, item, rowIdx)}
                      </div>
                      {subtitleCols.map((col) => (
                        <div
                          key={colKeyOf(col)}
                          className="text-[12px] text-[var(--fg-muted,#52606f)] truncate"
                        >
                          {render(col, item, rowIdx)}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {statusCols.map((col) => (
                      <React.Fragment key={colKeyOf(col)}>{render(col, item, rowIdx)}</React.Fragment>
                    ))}
                    <span onClick={(e) => e.stopPropagation()}>
                      <RowActionsCell actions={actions} alwaysVisible />
                    </span>
                  </div>
                </div>

                {bodyCols.length > 0 && (
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {bodyCols.map((col) => (
                      <div key={colKeyOf(col)} className="flex flex-col min-w-0">
                        <dt className="text-[9px] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
                          {col.header}
                        </dt>
                        <dd
                          className={cn(
                            'text-[12px] text-[var(--fg-body,#2d3a4a)] truncate',
                            col.align === 'right' && 'font-mono tabular-nums',
                          )}
                        >
                          {render(col, item, rowIdx)}
                        </dd>
                      </div>
                    ))}
                  </dl>
                )}

                {metaCols.length > 0 && (
                  <div className="flex items-center justify-end gap-3 pt-1 border-t border-[var(--border-subtle,#f1f5f9)] font-mono text-[13px] tabular-nums text-[var(--fg-default,#0a1628)]">
                    {metaCols.map((col) => (
                      <React.Fragment key={colKeyOf(col)}>{render(col, item, rowIdx)}</React.Fragment>
                    ))}
                  </div>
                )}

                {renderExpanded && expanded.has(key) && (
                  <div className="pt-2 border-t border-[var(--border-subtle,#f1f5f9)]">
                    {renderExpanded(item)}
                  </div>
                )}
              </div>
            );
          })
        )}

        {infiniteFooter}

        {pagination && !infinite && !isLoading && (
          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalRecords}
            onPageChange={setPage}
            pageSizeOptions={pagination.pageSizeOptions}
            onPageSizeChange={setPageSize}
            className="px-1 py-2"
          />
        )}
        {contextMenu}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'w-full bg-[var(--bg-card,#ffffff)] border border-[var(--border-default,#e2e8f0)] rounded-[var(--k-radius-xs,2px)]',
        className,
      )}
    >
      <div className="w-full overflow-auto">
        <table
          className={cn(
            // min-w para móvil: si la tabla tiene varias columnas no caben en
            // pantalla pequeña → scroll horizontal del wrapper (overflow-auto).
            'w-full leading-tight text-left border-collapse font-sans min-w-[720px] sm:min-w-full',
            cellText,
          )}
        >
          <thead className="bg-[var(--bg-card,#ffffff)] sticky top-0 z-[3] border-b border-[var(--border-default,#e2e8f0)]">
            <tr ref={headerRowRef}>
              {selectable && (
                <th
                  className={cn(cellPad, 'w-8 bg-[var(--bg-card,#ffffff)]', stickyCellClass(0, false))}
                  style={stickyCellStyle(0)}
                >
                  <Checkbox
                    state={headerState}
                    checked={allSelected}
                    onChange={toggleAll}
                    size="sm"
                    aria-label="Seleccionar todas las filas"
                  />
                </th>
              )}
              {hasExpand && (
                <th
                  className={cn(
                    cellPad,
                    'w-8 bg-[var(--bg-card,#ffffff)]',
                    stickyCellClass(selectable ? 1 : 0, false),
                  )}
                  style={stickyCellStyle(selectable ? 1 : 0)}
                />
              )}
              {visibleColumns.map((col, idx) => {
                const colKey = colKeyOf(col);
                const isSortable = !!col.sortable;
                const isSorted = sort?.colKey === colKey;
                const dir = isSorted ? sort!.dir : null;
                const cellIdx = leadingCount + idx;
                const width = colWidths[colKey] ?? col.width;
                return (
                  <th
                    key={colKey}
                    style={{
                      width,
                      minWidth: colWidths[colKey],
                      ...stickyCellStyle(cellIdx),
                    }}
                    onClick={
                      isSortable
                        ? () => {
                            if (!resizingRef.current) toggleSort(colKey);
                          }
                        : undefined
                    }
                    className={cn(
                      cellPad,
                      'relative font-mono text-[10px] tracking-[1px] uppercase font-normal text-[var(--fg-subtle,#657486)] whitespace-nowrap select-none',
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                          ? 'text-right'
                          : 'text-left',
                      isSortable &&
                        'cursor-pointer hover:text-accent dark:hover:text-accent transition-colors',
                      isSorted && 'text-accent dark:text-accent',
                      stickyCellClass(cellIdx, false),
                      col.className,
                    )}
                  >
                    <span
                      className={cn(
                        'inline-flex items-center gap-1',
                        col.align === 'right' && 'justify-end w-full',
                      )}
                    >
                      {col.header}
                      {isSortable && (
                        <svg
                          className="shrink-0 opacity-60"
                          width="10"
                          height="10"
                          viewBox="0 0 10 10"
                          aria-hidden
                        >
                          <path
                            d="M5 1L8 4H2z"
                            fill="currentColor"
                            opacity={dir === 'asc' ? 1 : 0.3}
                          />
                          <path
                            d="M5 9L2 6H8z"
                            fill="currentColor"
                            opacity={dir === 'desc' ? 1 : 0.3}
                          />
                        </svg>
                      )}
                    </span>
                    {resizableColumns && (
                      <span
                        onPointerDown={(e) => startResize(e, colKey)}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent transition-colors"
                      />
                    )}
                  </th>
                );
              })}
              {hasTrailing && (
                <th className={cn(cellPad, 'w-8 text-right')}>
                  {showColumnToggle && (
                    <ColumnToggle
                      entries={toggleEntries}
                      onToggle={(key) => setVisibility({ ...visibility, [key]: !(visibility[key] !== false) })}
                    />
                  )}
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading && loadingVariant === 'skeleton' ? (
              // Se conservan las filas reales de la cabecera y se rellena el
              // cuerpo con barras: al llegar los datos no salta el layout.
              Array.from({ length: skeletonRowCount }).map((_, rowIdx) => (
                <tr
                  key={`skeleton-${rowIdx}`}
                  aria-hidden="true"
                  style={{ animation: `k-row-in 0.45s ease-out ${Math.min(rowIdx * 15, 300)}ms both` }}
                  className="border-b border-[var(--border-subtle,#f1f5f9)] last:border-b-0"
                >
                  {selectable && (
                    <td className={cn(cellPad, 'w-8')}>
                      <span className={cn('flex items-center', !skeletonRowHeight && 'h-[1.25em]')} style={skeletonRowHeight ? { height: skeletonRowHeight } : undefined}>
                        <Skeleton variant="rect" width={14} height={14} />
                      </span>
                    </td>
                  )}
                  {hasExpand && (
                    <td className={cn(cellPad, 'w-8')}>
                      <span className={cn('flex items-center', !skeletonRowHeight && 'h-[1.25em]')} style={skeletonRowHeight ? { height: skeletonRowHeight } : undefined}>
                        <Skeleton variant="rect" width={14} height={14} />
                      </span>
                    </td>
                  )}
                  {visibleColumns.map((col, colIdx) => (
                    <td
                      key={colKeyOf(col)}
                      className={cn(
                        cellPad,
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                            ? 'text-right'
                            : 'text-left',
                      )}
                    >
                      {/* El contenedor reproduce la caja de línea del texto
                          real (leading-tight = 1.25em) para que la fila
                          fantasma mida exactamente lo mismo que la de datos. */}
                      <span
                        className={cn(
                          'flex items-center',
                          !skeletonRowHeight && 'h-[1.25em]',
                          col.align === 'right' && 'justify-end',
                          col.align === 'center' && 'justify-center',
                        )}
                        style={skeletonRowHeight ? { height: skeletonRowHeight } : undefined}
                      >
                        <Skeleton
                          height={densityClasses[density].bar}
                          width={skeletonWidth(rowIdx, colIdx)}
                        />
                      </span>
                    </td>
                  ))}
                  {hasTrailing && <td className={cn(cellPad, 'w-8')} />}
                </tr>
              ))
            ) : isLoading ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className={cn(cellPad, 'py-10 text-center text-[var(--fg-subtle,#657486)]')}
                >
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                    <span className="animate-pulse font-mono text-[11px] tracking-wider uppercase">
                      {loadingLabel}
                    </span>
                  </div>
                </td>
              </tr>
            ) : pagedData.length === 0 ? (
              <tr>
                <td
                  colSpan={totalCols}
                  className={cn(cellPad, 'py-16 text-center text-[var(--fg-subtle,#657486)]')}
                >
                  <div className="flex flex-col items-center gap-2">
                    <svg className="h-8 w-8 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                      />
                    </svg>
                    {typeof emptyMessage === 'string' ? (
                      <span className="text-[10px] font-mono uppercase tracking-[1.5px]">
                        {emptyMessage}
                      </span>
                    ) : (
                      emptyMessage
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pagedData.map((item, rowIdx) => {
                const key = getKey(item, rowIdx);
                // Animación escalonada al montar: cada fila entra con 15ms de delay
                // acumulado, limitado a 300ms total para no parecer lenta en tablas
                // grandes.
                const animDelay = Math.min(rowIdx * 15, 300);
                const isRowSelected = selected.has(key);
                const isExpanded = expanded.has(key);
                const actions = rowActions ? rowActions(item) : null;
                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() => onRowClick?.(item)}
                      onContextMenu={
                        actions && actions.length > 0
                          ? (e) => openContextMenu(e, actions)
                          : undefined
                      }
                      style={{
                        animation: `k-row-in 0.45s ease-out ${animDelay}ms both`,
                      }}
                      className={cn(
                        'group transition-all duration-200 border-b border-[var(--border-subtle,#f1f5f9)] last:border-b-0',
                        isRowSelected
                          ? 'bg-accent/5 dark:bg-accent/10 shadow-inner'
                          : 'hover:bg-[var(--bg-hover)]',
                        onRowClick && 'cursor-pointer hover:shadow-sm hover:-translate-y-px',
                        rowClassName?.(item, rowIdx),
                      )}
                    >
                      {selectable && (
                        <td
                          className={cn(cellPad, 'w-8', stickyCellClass(0, isRowSelected))}
                          style={stickyCellStyle(0)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isRowSelected}
                            onChange={() => toggleRow(key)}
                            size="sm"
                            aria-label={`Seleccionar fila ${rowIdx + 1}`}
                          />
                        </td>
                      )}
                      {hasExpand && (
                        <td
                          className={cn(
                            cellPad,
                            'w-8',
                            stickyCellClass(selectable ? 1 : 0, isRowSelected),
                          )}
                          style={stickyCellStyle(selectable ? 1 : 0)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            aria-label={isExpanded ? 'Contraer fila' : 'Expandir fila'}
                            aria-expanded={isExpanded}
                            onClick={() => toggleExpanded(key)}
                            className="p-0.5 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-accent transition-colors"
                          >
                            <ChevronRight
                              className={cn(
                                'h-3.5 w-3.5 transition-transform duration-200',
                                isExpanded && 'rotate-90',
                              )}
                            />
                          </button>
                        </td>
                      )}
                      {visibleColumns.map((col, colIdx) => {
                        let content: React.ReactNode = null;
                        if (col.cell) {
                          content = col.cell(item, rowIdx);
                        } else if (typeof col.accessor === 'function') {
                          content = col.accessor(item, rowIdx);
                        } else if (col.accessor) {
                          content = item[col.accessor] as React.ReactNode;
                        }

                        const isPrimary = col.primary;
                        const isRightAligned = col.align === 'right';
                        const cellIdx = leadingCount + colIdx;

                        return (
                          <td
                            key={colKeyOf(col)}
                            style={stickyCellStyle(cellIdx)}
                            className={cn(
                              cellPad,
                              'transition-colors',
                              isPrimary
                                ? 'font-mono text-[12px] font-medium text-[var(--fg-default,#0a1628)]'
                                : isRightAligned
                                  ? 'font-mono text-[12px] text-[var(--fg-default,#0a1628)]'
                                  : 'text-[var(--fg-body,#2d3a4a)]',
                              col.align === 'center'
                                ? 'text-center'
                                : col.align === 'right'
                                  ? 'text-right'
                                  : 'text-left',
                              stickyCellClass(cellIdx, isRowSelected),
                              col.className,
                            )}
                          >
                            {content}
                          </td>
                        );
                      })}
                      {hasTrailing && (
                        <td className={cn(cellPad, 'w-8 text-right')} onClick={(e) => e.stopPropagation()}>
                          <RowActionsCell actions={actions} />
                        </td>
                      )}
                    </tr>
                    {hasExpand && isExpanded && (
                      <tr className="border-b border-[var(--border-subtle,#f1f5f9)] last:border-b-0 bg-[var(--bg-muted)]">
                        <td colSpan={totalCols} className={cn(cellPad, 'py-3')}>
                          {renderExpanded(item)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })
            )}
            {appendRow && !isLoading && (
              <tr className="border-t border-[var(--border-subtle,#f1f5f9)]">
                <td colSpan={totalCols} className="p-0">
                  {appendRow}
                </td>
              </tr>
            )}
            {infinite && (
              <tr aria-hidden="true">
                <td colSpan={totalCols} className="p-0">
                  {infiniteFooter}
                </td>
              </tr>
            )}
          </tbody>
          {summaryRow && !isLoading && pagedData.length > 0 && (
            <tfoot className="border-t-2 border-[var(--border-default,#e2e8f0)]">
              <tr>
                {selectable && <td className={cellPad} />}
                {hasExpand && <td className={cellPad} />}
                {(() => {
                  const cells = summaryRow(pagedData);
                  return visibleColumns.map((col, i) => (
                    <td
                      key={colKeyOf(col)}
                      className={cn(
                        cellPad,
                        'font-mono text-[12px] font-semibold text-[var(--fg-default,#0a1628)]',
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                            ? 'text-right'
                            : 'text-left',
                      )}
                    >
                      {/* La primera celda lleva la etiqueta si no se ha dado contenido. */}
                      {cells[i] ?? (i === 0 ? (
                        <span className="font-sans text-[10px] uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
                          {summaryLabel}
                        </span>
                      ) : null)}
                    </td>
                  ));
                })()}
                {hasTrailing && <td className={cellPad} />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {pagination && !infinite && (!isLoading || loadingVariant === 'skeleton') && (
        <div className="border-t border-[var(--border-default,#e2e8f0)] px-4 py-2">
          {isLoading ? (
            // El pie se mantiene ocupando su sitio: si se ocultara, la tabla
            // daría un salto de altura justo al terminar de cargar.
            <div className="flex items-center justify-between h-[26px]">
              <Skeleton height={11} width={90} />
              <Skeleton height={11} width={150} />
            </div>
          ) : (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={totalRecords}
              onPageChange={setPage}
              pageSizeOptions={pagination.pageSizeOptions}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}
      {contextMenu}
    </div>
  );
}
