import { Spinner } from './Spinner';
import { isPrimaryPointer, startPointerDrag } from '../internal/pointerDrag';
import * as React from 'react';
import { adaptivePortal } from './internal/MobileOverlay';
import { UiIcon } from '../icons';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { cn } from '../utils';
import { Checkbox } from './Checkbox';
import { Pagination } from './Pagination';
import { DropdownMenu, DropdownMenuItem } from './DropdownMenu';
import { useContextMenu } from './ContextMenu';
import { Skeleton } from './Skeleton';
import { densityClasses, skeletonWidth, type Density } from './internal/density';
import { usePopover } from '../hooks/usePopover';
import { useIsNarrow, useIsMobile } from '../hooks/useMediaQuery';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { Alert } from './Alert';
import { Button } from './Button';
import { SelectionBar, type SelectionBarAction } from './SelectionBar';
import { Input } from './Input';
import { NumberInput } from './NumberInput';
import { SearchInput } from './SearchInput';
import { DateRangePicker } from './DateRangePicker';
import { formatNumber } from '../internal/intl';
import {
  aggregate as aggregateValues,
  describeFilter,
  isEmptyFilter,
  matchesFilter,
  matchesSearch,
  type TableAggregate,
  type TableColumnFilter,
  type TableFilterValue,
  type TableFilters,
} from './internal/tableFilters';

export type { TableAggregate, TableColumnFilter, TableFilterOption, TableFilterValue, TableFilters } from './internal/tableFilters';

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
  /** Filtro de la columna: botón en la cabecera (y en la barra en móvil) y chip mientras está activo. */
  filter?: TableColumnFilter;
  /** Valor con el que se filtra y se busca. Por defecto `sortAccessor` o `accessor`. */
  filterAccessor?: (item: T) => unknown;
  /** Fija la columna a la izquierda o a la derecha al desplazar en horizontal. */
  pin?: 'left' | 'right';
  /**
   * Agregado al pie sobre TODAS las filas filtradas (no solo la página): `sum`, `avg`, `min`, `max`, `count`, o una
   * función que recibe las filas. Sin `summaryRow` ni `summaryByColumn`, basta con esto para tener fila de totales.
   */
  aggregate?: TableAggregate | ((rows: T[]) => React.ReactNode);
  /** Formato del agregado numérico (importes, porcentajes…). Default número con 2 decimales como mucho. */
  aggregateFormat?: (value: number) => React.ReactNode;
}

/** Acción sobre las filas seleccionadas, en la barra que aparece al seleccionar. */
export type TableBulkAction = SelectionBarAction;

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
  /** Actualiza en segundo plano conservando filas, selección y expansión. */
  isRefreshing?: boolean;
  refreshingLabel?: string;
  /** Error de carga. Con datos conserva las filas; sin datos sustituye al vacío. */
  errorMessage?: React.ReactNode;
  /** Solicita otro intento. La aplicación gestiona la petición y sus estados. */
  onRetry?: () => void;
  retryLabel?: string;
  /** Densidad de filas. Default: 'normal'. */
  density?: TableDensity;
  /** Filas lisas, alternas o rejilla con separadores verticales. */
  variant?: 'default' | 'striped' | 'grid';
  /** Cabecera con superficie atenuada para separar los encabezados del cuerpo. */
  headerVariant?: 'default' | 'muted';
  /** Nombre accesible de la tabla o del listado de tarjetas. */
  ariaLabel?: string;
  /** Limita el área de scroll; la cabecera permanece visible. */
  maxHeight?: number | string;
  /** Ordenación controlada. `null` conserva el orden recibido. */
  sort?: TableSort | null;
  defaultSort?: TableSort | null;
  onSortChange?: (sort: TableSort | null) => void;
  /** 'server' emite el cambio sin reordenar los datos recibidos. Default 'client'. */
  sortMode?: 'client' | 'server';
  /** Si true, añade columna de checkboxes y permite multi-select.
   *  Con paginación en cliente, el checkbox de cabecera selecciona SOLO la página visible. */
  selectable?: boolean;
  /** Excluye filas de la selección individual y de «seleccionar página». */
  isRowSelectable?: (item: T) => boolean;
  /** Selección controlada. Si se omite, la Table mantiene estado interno. */
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Key estable: por defecto item.id, o índice original en data como alternativa.
   * El índice recibido corresponde a data antes de ordenar o paginar.
   * Para datos remotos o que cambian, proporciona siempre una identidad estable. */
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
   * Qué hacer cuando no cabe: 'auto' (default) usa tarjetas en móvil; 'scroll' deja desplazar en horizontal;
   * 'cards' pinta una tarjeta por fila por debajo de `cardsBreakpoint`.
   */
  responsive?: 'auto' | 'scroll' | 'cards';
  /** Ancho de tarjetas: 768 en auto y 640 en cards; un valor explícito tiene prioridad. */
  cardsBreakpoint?: number;
  /**
   * Fila de totales al pie, alineada con las columnas. Se le pasan las filas
   * visibles y devuelve una celda por columna visible (o `null` para dejarla
   * vacía). Evita tener que montar un bloque de totales aparte que se
   * desalinea con la tabla.
   */
  summaryRow?: (rows: T[]) => Array<React.ReactNode>;
  /** Totales de la página por `col.id ?? col.header`. Conservan su columna al
   * ocultar otras; tienen prioridad sobre summaryRow y aparecen también en móvil. */
  summaryByColumn?: (rows: T[]) => Record<string, React.ReactNode>;
  /** Etiqueta de la primera celda del pie. Default 'Total'. */
  summaryLabel?: React.ReactNode;
  /** Fila extra al final del cuerpo, para el «+ Añadir línea». */
  appendRow?: React.ReactNode;
  /** Buscador en la barra superior: busca en todas las columnas, sin acentos ni mayúsculas. */
  searchable?: boolean | { placeholder?: string };
  /** Búsqueda controlada. */
  search?: string;
  onSearchChange?: (query: string) => void;
  /** Filtros controlados por `col.id ?? col.header`. */
  filters?: TableFilters;
  defaultFilters?: TableFilters;
  onFiltersChange?: (filters: TableFilters) => void;
  /** 'server' solo avisa de filtros y búsqueda, sin filtrar `data`. Default 'client'. */
  filterMode?: 'client' | 'server';
  /** Selector de densidad (compacta, normal, cómoda) en la barra superior. */
  densityToggle?: boolean;
  onDensityChange?: (density: TableDensity) => void;
  /** Contenido extra a la derecha de la barra superior (exportar, crear…). */
  toolbar?: React.ReactNode;
  /** Con selección: barra flotante con el recuento y estas acciones. */
  bulkActions?: (rows: T[]) => TableBulkAction[];
}

export interface TableSort {
  colKey: string;
  dir: 'asc' | 'desc';
}

function compareValues(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  const da = a instanceof Date ? a.getTime() : NaN;
  const db = b instanceof Date ? b.getTime() : NaN;
  if (!Number.isNaN(da) && !Number.isNaN(db)) return da - db;
  // Los códigos no son importes: quitar letras mezcla series y referencias.
  // Para importes formateados, sortAccessor debe devolver el número original.
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
  const mobile = useIsMobile();
  const { anchorRef, popoverRef, style, ready, mounted, popoverProps } = usePopover<HTMLButtonElement>({
    open: isOpen && !mobile,
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
        aria-expanded={isOpen}
        title="Columnas"
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-accent hover:bg-[var(--bg-hover)] transition-colors"
      >
        <UiIcon slot="columns-3" className="h-3.5 w-3.5" />
      </button>
      {(isOpen || mounted) &&
        adaptivePortal(
          <div
            ref={popoverRef}
            {...(mobile ? undefined : popoverProps)}
            className={cn(
              'z-[var(--k-z-popover,999999)] min-w-[180px] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-1 shadow-lg k-appear',
              !ready && !mobile && 'invisible',
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
                <Checkbox
                  checked={entry.visible}
                  disabled={entry.visible && entries.filter((column) => column.visible).length === 1}
                  onChange={() => onToggle(entry.key)}
                  size="sm"
                />
                <span className="truncate">{entry.header}</span>
              </label>
            ))}
          </div>,
          document.body,
          { open: isOpen, onClose: () => setIsOpen(false), title: 'Columnas', presentation: mobile ? 'sheet' : 'anchored', anchorRef },
        )}
    </>
  );
}

/**
 * Celda de acciones de fila.
 *
 * Una única acción no destructiva con icono propio puede mostrarse directamente.
 * Los tres puntos siempre abren el menú, incluso cuando solo hay una acción.
 * Las acciones destructivas requieren elegir explícitamente el elemento.
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
    // En las tarjetas (pantalla táctil) el área de toque llega a 40 px.
    alwaysVisible && 'inline-flex min-h-10 min-w-10 items-center justify-center',
    revealClass,
  );

  if (actions.length === 1 && actions[0].icon && !actions[0].destructive) {
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
        {only.icon ?? <UiIcon slot="more-horizontal" className="h-3.5 w-3.5" />}
      </button>
    );
  }

  return (
    <DropdownMenu items={actions} align="end" className={cn(btnClass, 'cursor-pointer')}>
      <span className="sr-only">Acciones de la fila</span>
      <UiIcon slot="more-horizontal" className="h-3.5 w-3.5" />
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
  isLoading: initialLoading,
  isRefreshing = false,
  refreshingLabel = 'Actualizando registros…',
  errorMessage,
  onRetry,
  retryLabel = 'Reintentar',
  density = 'normal',
  variant = 'default',
  headerVariant = 'default',
  ariaLabel,
  maxHeight,
  sort: controlledSort,
  defaultSort = null,
  onSortChange,
  sortMode = 'client',
  selectable = false,
  isRowSelectable,
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
  responsive = 'auto',
  cardsBreakpoint = responsive === 'auto' ? 768 : 640,
  summaryRow,
  summaryByColumn,
  summaryLabel = 'Total',
  appendRow,
  searchable,
  search: searchProp,
  onSearchChange,
  filters: filtersProp,
  defaultFilters,
  onFiltersChange,
  filterMode = 'client',
  densityToggle = false,
  onDensityChange,
  toolbar,
  bulkActions,
}: TableProps<T>) {
  // ── Densidad — con selector, se recuerda la elegida ───────────────────
  const [densityChoice, setDensityChoice] = React.useState<TableDensity>(density);
  React.useEffect(() => setDensityChoice(density), [density]);
  const densidad = densityToggle ? densityChoice : density;
  const changeDensity = (next: TableDensity) => { setDensityChoice(next); onDensityChange?.(next); };
  const isLoading = initialLoading || (isRefreshing && data.length === 0);
  const hasError = Boolean(errorMessage) && !isLoading && !isRefreshing;
  const blockingError = hasError && data.length === 0;
  const feedback = (
    <>
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={
          isRefreshing && !isLoading
            ? 'flex items-center gap-2 px-4 py-2 text-[12px] text-[var(--fg-muted,#52606f)]'
            : 'sr-only'
        }
      >
        {isLoading ? loadingLabel : isRefreshing ? (
          <>
            <UiIcon slot="refresh-cw" size={14} aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
            {refreshingLabel}
          </>
        ) : null}
      </div>
      {hasError && (
        <Alert
          tone="danger"
          role="alert"
          className="m-3"
          title={blockingError ? 'No se han podido cargar los registros' : 'No se han podido actualizar los registros'}
          action={onRetry && (
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        >
          {errorMessage}
          {!blockingError && <p className="mt-1">Se muestran los últimos datos disponibles.</p>}
        </Alert>
      )}
    </>
  );
  // ── Visibilidad de columnas — controlada o interna ─────────────────────
  const [internalVisibility, setInternalVisibility] = React.useState<Record<string, boolean>>({});
  const visibility = columnVisibility ?? internalVisibility;
  const setVisibility = (next: Record<string, boolean>) => {
    if (columnVisibility === undefined) setInternalVisibility(next);
    onColumnVisibilityChange?.(next);
  };
  const isColVisible = (col: TableColumn<T>) => visibility[colKeyOf(col)] !== false;
  // Las fijadas a la izquierda van primero y las de la derecha al final; `stickyFirstColumn` fija la primera.
  const visibleBase = columns.filter(isColVisible);
  const pinOf = (col: TableColumn<T>, index: number) => col.pin ?? (stickyFirstColumn && index === 0 ? 'left' : undefined);
  const pinnedLeft = visibleBase.filter((c, i) => pinOf(c, i) === 'left');
  const pinnedRight = visibleBase.filter((c, i) => pinOf(c, i) === 'right');
  const visibleColumns = [...pinnedLeft, ...visibleBase.filter((c, i) => !pinOf(c, i)), ...pinnedRight];

  // ── Filtros y búsqueda — controlados o internos ───────────────────────
  const [internalFilters, setInternalFilters] = React.useState<TableFilters>(defaultFilters ?? {});
  const filters = filtersProp ?? internalFilters;
  const setFilters = (next: TableFilters) => {
    if (filtersProp === undefined) setInternalFilters(next);
    onFiltersChange?.(next);
    if (pagination) setPage(1);
  };
  const setFilter = (key: string, value: TableFilterValue | undefined) => {
    const next = { ...filters };
    if (value === undefined || isEmptyFilter(value)) delete next[key];
    else next[key] = value;
    setFilters(next);
  };
  const [internalSearch, setInternalSearch] = React.useState('');
  const search = searchProp ?? internalSearch;
  const setSearch = (query: string) => {
    if (searchProp === undefined) setInternalSearch(query);
    onSearchChange?.(query);
    if (pagination) setPage(1);
  };
  /** Valor de una celda para filtrar, buscar y agregar. */
  const valueOf = (col: TableColumn<T>, item: T): unknown => {
    if (col.filterAccessor) return col.filterAccessor(item);
    if (col.sortAccessor) return col.sortAccessor(item);
    if (typeof col.accessor === 'function') return col.accessor(item, 0);
    if (col.accessor) return (item as any)[col.accessor];
    return null;
  };
  const filterableColumns = columns.filter((c) => c.filter);
  const activeFilterColumns = filterableColumns.filter((c) => !isEmptyFilter(filters[colKeyOf(c)]));
  const filteredData = React.useMemo(() => {
    if (filterMode === 'server' || (activeFilterColumns.length === 0 && !search.trim())) return data;
    return data.filter((item) =>
      activeFilterColumns.every((c) => matchesFilter(valueOf(c, item), c.filter!, filters[colKeyOf(c)])) &&
      matchesSearch(columns.map((c) => valueOf(c, item)), search),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, columns, filters, search, filterMode]);

  // ── Ordenación — cíclico: null → asc → desc → null (clave estable) ────
  const [internalSort, setInternalSort] = React.useState<TableSort | null>(defaultSort);
  const sort = controlledSort === undefined ? internalSort : controlledSort;

  const changeSort = (next: TableSort | null) => {
    if (controlledSort === undefined) setInternalSort(next);
    onSortChange?.(next);
    if (pagination) setPage(1);
  };
  const toggleSort = (colKey: string) => {
    changeSort(!sort || sort.colKey !== colKey
      ? { colKey, dir: 'asc' }
      : sort.dir === 'asc' ? { colKey, dir: 'desc' } : null);
  };

  const sortedData = React.useMemo(() => {
    if (!sort || sortMode === 'server') return filteredData;
    const col = columns.find((c) => colKeyOf(c) === sort.colKey);
    if (!col) return filteredData;
    const getVal = (item: T): any => {
      if (col.sortAccessor) return col.sortAccessor(item);
      if (typeof col.accessor === 'function') return col.accessor(item, 0);
      if (col.accessor) return (item as any)[col.accessor];
      return null;
    };
    const direction = sort.dir === 'desc' ? -1 : 1;
    // Invertir el comparador conserva el orden de las filas con el mismo valor.
    return [...filteredData].sort((a, b) => direction * compareValues(getVal(a), getVal(b)));
  }, [filteredData, sort, columns, sortMode]);

  // ── Paginación — cliente (total omitido) o servidor (total presente) ──
  const [internalPage, setInternalPage] = React.useState(1);
  const [internalPageSize, setInternalPageSize] = React.useState(pagination?.pageSize ?? 25);
  const serverMode = pagination?.total !== undefined;

  const { sentinelRef } = useInfiniteScroll({
    hasMore: infinite?.hasMore ?? false,
    onLoadMore: infinite?.onLoadMore ?? (() => {}),
    loading: infinite?.loading,
    disabled: !infinite || isLoading || isRefreshing || Boolean(errorMessage),
  });

  /** Pie de la carga incremental, compartido por la tabla y las tarjetas. */
  const infiniteFooter = infinite && !isLoading && !hasError && (
    <>
      <div ref={sentinelRef} aria-hidden="true" className="h-px w-full" />
      {infinite.loading && (
        <div className="flex items-center justify-center gap-2 py-3 text-[11px] font-mono uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
          <Spinner size="xs" label="Cargando" />
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
  const page = Math.max(1, Math.min(rawPage, totalPages));

  const setPage = (next: number) => {
    if (pagination?.page === undefined) setInternalPage(next);
    pagination?.onPageChange?.(next);
  };
  const setPageSize = (size: number) => {
    if (!pagination?.onPageSizeChange) setInternalPageSize(size);
    pagination?.onPageSizeChange?.(size);
    setPage(1);
  };

  const pagedData = React.useMemo(() => {
    // Con carga incremental no se recorta: las filas se van acumulando.
    if (!pagination || serverMode || infinite) return sortedData;
    return sortedData.slice((page - 1) * pageSize, page * pageSize);
  }, [sortedData, pagination, serverMode, page, pageSize, infinite]);

  // ── Selección — controlada o interna ──────────────────────────────────
  const [internalSelected, setInternalSelected] = React.useState<Set<string | number>>(
    () => new Set(),
  );
  const selected = selectedKeys ?? internalSelected;
  const setSelected = (next: Set<string | number>) => {
    if (selectedKeys === undefined) setInternalSelected(next);
    onSelectionChange?.(next);
  };

  const sourceIndices = React.useMemo(() => new Map(data.map((item, index) => [item, index])), [data]);
  const getKey = React.useCallback(
    (item: T, idx: number): string | number => {
      const sourceIndex = sourceIndices.get(item) ?? idx;
      if (rowKey) return rowKey(item, sourceIndex);
      const anyItem = item as any;
      return anyItem?.id ?? sourceIndex;
    },
    [rowKey, sourceIndices],
  );

  const pageKeys = React.useMemo(
    () => pagedData.flatMap((item, index) => isRowSelectable && !isRowSelectable(item) ? [] : [getKey(item, index)]),
    [pagedData, getKey, isRowSelectable],
  );
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
  const stopResize = React.useRef<() => void>(() => undefined);
  React.useEffect(() => () => stopResize.current(), []);

  const startResize = (event: React.PointerEvent, colKey: string) => {
    if (!isPrimaryPointer(event)) return;
    event.preventDefault();
    event.stopPropagation();
    const th = (event.target as HTMLElement).closest('th');
    if (!th) return;
    const startX = event.clientX;
    const startWidth = th.offsetWidth;
    resizingRef.current = true;
    stopResize.current = startPointerDrag(event, {
      onMove: (e) => {
        const width = Math.max(60, startWidth + (e.clientX - startX));
        setColWidths((prev) => ({ ...prev, [colKey]: width }));
      },
      // Evitar que el click posterior dispare la ordenación.
      onEnd: () => { setTimeout(() => { resizingRef.current = false; }, 0); },
    });
  };

  // ── Columnas fijas: offsets medidos sobre la cabecera ────────────────
  const headerRowRef = React.useRef<HTMLTableRowElement>(null);
  const scrollerRef = React.useRef<HTMLDivElement>(null);
  const [stickyLefts, setStickyLefts] = React.useState<number[]>([]);
  const [stickyRights, setStickyRights] = React.useState<Record<number, number>>({});
  const [overflow, setOverflow] = React.useState({ left: false, right: false });
  const hasExpand = !!renderExpanded;
  const hasTrailing = !!rowActions || showColumnToggle;
  const leadingCount = (selectable ? 1 : 0) + (hasExpand ? 1 : 0);
  const totalCols =
    visibleColumns.length + (selectable ? 1 : 0) + (hasExpand ? 1 : 0) + (hasTrailing ? 1 : 0);
  // Fijas a la izquierda: las utilitarias iniciales y las columnas fijadas. A la derecha: las fijadas y la de acciones.
  const stickyCount = pinnedLeft.length > 0 ? leadingCount + pinnedLeft.length : 0;
  const rightCount = pinnedRight.length > 0 ? pinnedRight.length + (hasTrailing ? 1 : 0) : 0;

  React.useLayoutEffect(() => {
    if ((!stickyCount && !rightCount) || !headerRowRef.current) return;
    const cells = Array.from(headerRowRef.current.children) as HTMLElement[];
    const lefts: number[] = [];
    let acc = 0;
    for (let i = 0; i < stickyCount && i < cells.length; i++) { lefts.push(acc); acc += cells[i].offsetWidth; }
    const rights: Record<number, number> = {};
    acc = 0;
    for (let i = cells.length - 1; i >= cells.length - rightCount && i >= 0; i--) { rights[i] = acc; acc += cells[i].offsetWidth; }
    setStickyLefts(lefts);
    setStickyRights(rights);
  }, [stickyCount, rightCount, visibleColumns.length, densidad, colWidths, data]);

  // La sombra del borde de las fijas solo aparece cuando hay contenido pasando por debajo.
  const measureOverflow = React.useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const left = el.scrollLeft > 1;
    const right = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    setOverflow((o) => (o.left === left && o.right === right ? o : { left, right }));
  }, []);
  // Se mide al cambiar el tamaño del contenedor o de la tabla, y cuando cambian columnas, datos o densidad; no en cada render.
  useResizeObserver(() => [scrollerRef.current, scrollerRef.current?.firstElementChild], measureOverflow);
  React.useLayoutEffect(measureOverflow, [measureOverflow, visibleColumns.length, densidad, colWidths, data]);

  const stickyCellStyle = (cellIdx: number): React.CSSProperties | undefined => {
    if (cellIdx < stickyCount) return { position: 'sticky', left: stickyLefts[cellIdx] ?? 0, zIndex: 2 };
    if (rightCount && cellIdx >= totalCols - rightCount) return { position: 'sticky', right: stickyRights[cellIdx] ?? 0, zIndex: 2 };
    return undefined;
  };

  const stickyCellClass = (cellIdx: number, isRowSelected: boolean, striped = false): string | false => {
    const left = cellIdx < stickyCount;
    const right = rightCount > 0 && cellIdx >= totalCols - rightCount;
    if (!left && !right) return false;
    return cn(
      isRowSelected
        ? 'bg-[color-mix(in_srgb,var(--color-accent)_8%,var(--bg-card))]'
        : striped ? 'bg-[var(--bg-muted,#f8fafc)] group-hover:bg-[var(--bg-hover)]'
        : 'bg-[var(--bg-card,#ffffff)] group-hover:bg-[var(--bg-hover)]',
      left && cellIdx === stickyCount - 1 && 'k-table-edge-left',
      right && cellIdx === totalCols - rightCount && 'k-table-edge-right',
    );
  };

  const narrow = useIsNarrow(cardsBreakpoint);
  const asCards = responsive !== 'scroll' && narrow;
  const skeletonRowCount = skeletonRows ?? Math.min(pagination?.pageSize ?? 8, 12);
  const cellPad = densityClasses[densidad].cell;
  const cellText = densityClasses[densidad].text;
  const hasAggregates = visibleColumns.some((c) => c.aggregate);
  const hasSummary = !!(summaryByColumn || summaryRow || hasAggregates) && !isLoading && pagedData.length > 0;
  const keyedSummary = hasSummary ? summaryByColumn?.(pagedData) : undefined;
  const aggregateCell = (col: TableColumn<T>): React.ReactNode => {
    if (!col.aggregate) return null;
    if (typeof col.aggregate === 'function') return col.aggregate(sortedData);
    const value = aggregateValues(sortedData.map((row) => valueOf(col, row)), col.aggregate);
    if (value === null) return '—';
    return col.aggregateFormat ? col.aggregateFormat(value) : formatNumber(value, undefined, { maximumFractionDigits: 2 });
  };
  const summaryCells = hasSummary
    ? keyedSummary
      ? visibleColumns.map((col) => keyedSummary[colKeyOf(col)])
      : summaryRow
        ? summaryRow(pagedData)
        : visibleColumns.map(aggregateCell)
    : [];

  // ── Barra superior: buscador, filtros activos, densidad ───────────────
  const searchConfig = typeof searchable === 'object' ? searchable : {};
  const showToolbar = Boolean(searchable || toolbar || (densityToggle && !asCards) || activeFilterColumns.length > 0);
  const filteredInfo = filterMode === 'client' && (search.trim() || activeFilterColumns.length > 0)
    ? `${filteredData.length} de ${data.length}`
    : null;
  const toolbarEl = (cards: boolean) => showToolbar && (
    <div className="k-table-toolbar" data-cards={cards || undefined}>
      <div className="k-table-toolbar-row">
        {searchable && (
          <div className="k-table-search">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={searchConfig.placeholder ?? 'Buscar…'}
              aria-label="Buscar en la tabla"
              clearable
              shortcut={false}
              trailing={cards && filteredInfo ? <span className="k-table-results" aria-live="polite">{filteredInfo}</span> : undefined}
            />
          </div>
        )}
        <div className="k-table-toolbar-end">
          {filteredInfo && !cards && <span className="k-table-results" aria-live="polite">{filteredInfo}</span>}
          {/* En tarjetas la densidad no cambia nada: no se ofrece. */}
          {densityToggle && !cards && (
            <DropdownMenu
              align="end"
              className="k-table-tool"
              items={(['compact', 'normal', 'comfy'] as const).map((d) => ({
                label: DENSITY_LABELS[d],
                icon: densidad === d ? <UiIcon slot="check" size={14} /> : <span className="inline-block w-[14px]" />,
                onClick: () => changeDensity(d),
              }))}
            >
              <UiIcon slot="sliders-horizontal" size={14} />
              <span>{DENSITY_LABELS[densidad]}</span>
            </DropdownMenu>
          )}
          {toolbar}
        </div>
      </div>
      {(activeFilterColumns.length > 0 || (cards && filteredInfo && !searchable)) && (
        <div className="k-table-chips" role="list" aria-label="Filtros activos">
          {activeFilterColumns.map((col) => (
            <span key={colKeyOf(col)} role="listitem" className="k-table-chip">
              <span className="k-table-chip-key">{col.header}:</span>
              <span className="k-table-chip-value">{describeFilter(col.filter!, filters[colKeyOf(col)])}</span>
              <button type="button" aria-label={`Quitar el filtro de ${col.header}`} onClick={() => setFilter(colKeyOf(col), undefined)}>
                <UiIcon slot="x" size={12} />
              </button>
            </span>
          ))}
          {activeFilterColumns.length > 0 && <button type="button" className="k-table-clear" onClick={() => setFilters({})}>Quitar filtros</button>}
          {/* En tarjetas el recuento va aquí y no en una fila suelta. */}
          {cards && filteredInfo && !searchable && <span className="k-table-results k-table-results-end" aria-live="polite">{filteredInfo}</span>}
        </div>
      )}
    </div>
  );

  // ── Acciones en lote ──────────────────────────────────────────────────
  const selectedRows = React.useMemo(
    () => (bulkActions && selected.size ? data.filter((item, i) => selected.has(getKey(item, i))) : []),
    [bulkActions, selected, data, getKey],
  );
  const allFilteredKeys = React.useMemo(
    () => (bulkActions ? sortedData.flatMap((item, i) => (isRowSelectable && !isRowSelectable(item) ? [] : [getKey(item, i)])) : []),
    [bulkActions, sortedData, isRowSelectable, getKey],
  );
  const canSelectAll = Boolean(pagination) && !serverMode && allSelected && allFilteredKeys.length > pageKeys.length && !allFilteredKeys.every((k) => selected.has(k));
  const bulkBar = selectable && bulkActions && (
    <SelectionBar
      count={selected.size}
      countLabel={(n) => (n === 1 ? '1 seleccionada' : `${n} seleccionadas`)}
      actions={selected.size ? bulkActions(selectedRows) : []}
      onClear={() => setSelected(new Set())}
      selectAll={canSelectAll ? { total: allFilteredKeys.length, label: `Seleccionar las ${allFilteredKeys.length}`, onSelect: () => setSelected(new Set([...selected, ...allFilteredKeys])) } : undefined}
    />
  );

  const toggleEntries = columns.map((col) => ({
    key: colKeyOf(col),
    header: col.header,
    visible: isColVisible(col),
  }));

  // ── Vista de tarjetas en pantalla estrecha ────────────────────────────
  const activateRow = (event: React.KeyboardEvent, item: T) => {
    if (event.target !== event.currentTarget || !onRowClick) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick(item);
    }
  };

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
      <div
        aria-label={ariaLabel}
        role={ariaLabel ? 'region' : undefined}
        data-k-mobile="TableCards" className={cn('k-table-cards w-full flex flex-col gap-2', className)}
      >
        {feedback}
        {toolbarEl(true)}
        {/* Una sola tira que se desliza en horizontal: en un móvil, cada control en su propia fila se comía la pantalla. */}
        <div className="k-table-strip" role="toolbar" aria-label="Opciones del listado">
          {selectable && (
            <span className="k-table-strip-check">
              <Checkbox
                checked={allSelected}
                state={headerState}
                disabled={isLoading || pageKeys.length === 0}
                onChange={toggleAll}
                label="Seleccionar página"
                size="sm"
              />
            </span>
          )}
          {columns.some((column) => column.sortable) && (
              <DropdownMenu className="k-table-filter-pill" items={[
                { label: 'Orden original', onClick: () => changeSort(null) },
                ...columns.filter((column) => column.sortable).flatMap((column) =>
                  (['asc', 'desc'] as const).map((dir) => ({
                    label: `${column.header}: ${dir === 'asc' ? 'ascendente' : 'descendente'}`,
                    onClick: () => changeSort({ colKey: colKeyOf(column), dir }),
                  })),
                ),
              ]}>
                <UiIcon slot="chevrons-up-down" size={14} />
                {sort ? `${columns.find((column) => colKeyOf(column) === sort.colKey)?.header ?? 'Orden'} ${sort.dir === 'asc' ? '↑' : '↓'}` : <>Ordenar<span className="sr-only"> registros</span></>}
              </DropdownMenu>
          )}
          {filterableColumns.map((col) => (
            <ColumnFilter key={colKeyOf(col)} column={col} value={filters[colKeyOf(col)]} onChange={(v) => setFilter(colKeyOf(col), v)} labelled />
          ))}
          {showColumnToggle && <ColumnToggle entries={toggleEntries} onToggle={(key) => setVisibility({ ...visibility, [key]: visibility[key] === false })} />}
        </div>
        <div aria-busy={isLoading || isRefreshing || undefined} className="flex flex-col gap-2">
          {isLoading ? (
            Array.from({ length: skeletonRowCount }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-3 flex flex-col gap-2"
              >
                <Skeleton height={14} width="55%" />
                <Skeleton height={11} width="35%" />
              </div>
            ))
          ) : blockingError ? null : pagedData.length === 0 ? (
            <div className="rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] py-10 text-center">
              {typeof emptyMessage === 'string' ? (
                <span className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">{emptyMessage}</span>
              ) : emptyMessage}
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
                  tabIndex={onRowClick ? 0 : undefined}
                  onKeyDown={(event) => activateRow(event, item)}
                  onContextMenu={
                    actions && actions.length > 0 ? (e) => openContextMenu(e, actions) : undefined
                  }
                  style={{ animation: `k-row-in 0.35s ease-out ${Math.min(rowIdx * 20, 200)}ms both` }}
                  className={cn(
                    'rounded-[var(--k-radius-sm,4px)] border bg-[var(--bg-card,#ffffff)] p-3 flex flex-col gap-2 transition-colors',
                    isRowSelected ? 'border-accent bg-accent/5' : 'border-[var(--border-default,#e2e8f0)]',
                    onRowClick && 'cursor-pointer active:bg-[var(--bg-hover,#f1f5f9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                    rowClassName?.(item, rowIdx),
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2 min-w-0">
                      {selectable && (
                        // La etiqueta amplía la zona táctil a 44 px sin agrandar la casilla: tocar alrededor también marca.
                        <label onClick={(e) => e.stopPropagation()} className="k-table-card-check">
                          <Checkbox
                            checked={isRowSelected}
                            disabled={isRowSelectable ? !isRowSelectable(item) : false}
                            onChange={() => toggleRow(key)}
                            size="sm"
                            aria-label={`Seleccionar fila ${rowIdx + 1}`}
                          />
                        </label>
                      )}
                      <div className="min-w-0">
                        <div
                          className={cn(
                            'text-[var(--fg-default,#0a1628)] truncate',
                            // La fuente monoespaciada es para códigos (columna `primary`); un nombre va en la del cuerpo.
                            titleCol?.primary
                              ? 'font-mono text-[13px] font-medium'
                              : 'text-sm font-semibold',
                          )}
                        >
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

                  {renderExpanded && (
                    <button
                      type="button"
                      aria-expanded={expanded.has(key)}
                      onClick={(event) => { event.stopPropagation(); toggleExpanded(key); }}
                      className="self-start text-[12px] text-accent focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      {expanded.has(key) ? 'Ocultar detalle' : 'Ver detalle'}
                    </button>
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

        </div>
        {infiniteFooter}

        {hasSummary && (
          <section aria-label="Resumen de la tabla" className="rounded-[var(--k-radius-sm)] border border-[var(--border-default)] bg-[var(--bg-muted)] p-4">
            <p className="mb-3 text-[12px] font-semibold text-[var(--fg-default)]">{summaryLabel}</p>
            <dl className="space-y-2 text-[12px]">
              {visibleColumns.map((col, index) => summaryCells[index] != null && (
                <div key={colKeyOf(col)} className="flex flex-wrap justify-between gap-3">
                  <dt className="text-[var(--fg-muted)]">{col.header}</dt>
                  <dd className="font-mono text-[var(--fg-default)]">{summaryCells[index]}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {pagination && !infinite && !isLoading && !blockingError && (
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
        {bulkBar}
        {contextMenu}
      </div>
    );
  }

  return (
    <div
      data-k-mobile="Table"
      data-overflow-left={overflow.left || undefined}
      data-overflow-right={overflow.right || undefined}
      className={cn('k-table w-full bg-[var(--bg-card,#ffffff)] border border-[var(--border-default,#e2e8f0)]', className)}
    >
      {feedback}
      {toolbarEl(false)}
      <div ref={scrollerRef} onScroll={measureOverflow} className="k-table-scroll w-full overflow-auto" style={{ maxHeight }}>
        <table
          aria-label={ariaLabel}
          aria-busy={isLoading || isRefreshing || undefined}
          className={cn(
            // min-w para móvil: si la tabla tiene varias columnas no caben en
            // pantalla pequeña → scroll horizontal del wrapper (overflow-auto).
            'w-full leading-tight text-left border-collapse font-sans min-w-[720px] sm:min-w-full',
            cellText,
          )}
        >
          <thead className={cn(
            'bg-[var(--bg-card,#ffffff)] sticky top-0 z-[3] border-b border-[var(--border-default,#e2e8f0)]',
            headerVariant === 'muted' && 'bg-[var(--bg-muted,#f8fafc)] [&_th]:bg-[var(--bg-muted,#f8fafc)]',
            variant === 'grid' && '[&_th+th]:border-l [&_th+th]:border-[var(--border-default,#e2e8f0)]',
          )}>
            <tr ref={headerRowRef}>
              {selectable && (
                <th
                  className={cn(cellPad, 'w-8 bg-[var(--bg-card,#ffffff)]', stickyCellClass(0, false))}
                  style={stickyCellStyle(0)}
                >
                  <Checkbox
                    state={headerState}
                    checked={allSelected}
                    disabled={isLoading || pageKeys.length === 0}
                    onChange={toggleAll}
                    size="sm"
                    aria-label="Seleccionar página"
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
                const HeaderContent = isSortable ? 'button' : 'span';
                return (
                  <th
                    key={colKey}
                    scope="col"
                    aria-sort={isSortable ? dir === 'asc' ? 'ascending' : dir === 'desc' ? 'descending' : 'none' : undefined}
                    style={{
                      width,
                      minWidth: colWidths[colKey],
                      ...stickyCellStyle(cellIdx),
                    }}
                    data-filtered={!isEmptyFilter(filters[colKey]) || undefined}
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
                    <HeaderContent
                      type={isSortable ? 'button' : undefined}
                      onClick={isSortable ? () => { if (!resizingRef.current) toggleSort(colKey); } : undefined}
                      className={cn(
                        'inline-flex items-center gap-1 uppercase',
                        isSortable && 'rounded-[var(--k-radius-xs,2px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        col.align === 'right' && (col.filter ? 'justify-end' : 'justify-end w-full'),
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
                    </HeaderContent>
                    {col.filter && (
                      <ColumnFilter column={col} value={filters[colKey]} onChange={(v) => setFilter(colKey, v)} />
                    )}
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
                <th className={cn(cellPad, 'w-8 text-right', stickyCellClass(totalCols - 1, false))} style={stickyCellStyle(totalCols - 1)}>
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
                          height={densityClasses[densidad].bar}
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
                    <Spinner size="sm" label="Cargando" />
                    <span className="animate-pulse font-mono text-[11px] tracking-wider uppercase">
                      {loadingLabel}
                    </span>
                  </div>
                </td>
              </tr>
            ) : blockingError ? null : pagedData.length === 0 ? (
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
                const striped = variant === 'striped' && rowIdx % 2 === 1;
                const actions = rowActions ? rowActions(item) : null;
                return (
                  <React.Fragment key={key}>
                    <tr
                      onClick={() => onRowClick?.(item)}
                      tabIndex={onRowClick ? 0 : undefined}
                      onKeyDown={(event) => activateRow(event, item)}
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
                          ? 'k-table-row-selected'
                          : cn(striped && 'bg-[var(--bg-muted,#f8fafc)]', 'hover:bg-[var(--bg-hover)]'),
                        variant === 'grid' && '[&_td+td]:border-l [&_td+td]:border-[var(--border-default,#e2e8f0)]',
                        onRowClick && 'cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
                        rowClassName?.(item, rowIdx),
                      )}
                    >
                      {selectable && (
                        <td
                          className={cn(cellPad, 'w-8 k-table-select-cell', stickyCellClass(0, isRowSelected, striped))}
                          style={stickyCellStyle(0)}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isRowSelected}
                            disabled={isRowSelectable ? !isRowSelectable(item) : false}
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
                            stickyCellClass(selectable ? 1 : 0, isRowSelected, striped),
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
                            <UiIcon slot="chevron-right"
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
                              stickyCellClass(cellIdx, isRowSelected, striped),
                              col.className,
                            )}
                          >
                            {content}
                          </td>
                        );
                      })}
                      {hasTrailing && (
                        <td className={cn(cellPad, 'w-8 text-right', stickyCellClass(totalCols - 1, isRowSelected, striped))} style={stickyCellStyle(totalCols - 1)} onClick={(e) => e.stopPropagation()}>
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
            {appendRow && !isLoading && !blockingError && (
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
          {hasSummary && (
            <tfoot className={cn('k-table-foot border-t-2 border-[var(--border-default,#e2e8f0)]', maxHeight !== undefined && 'k-table-foot-sticky')}>
              <tr>
                {selectable && <td className={cn(cellPad, stickyCellClass(0, false))} style={stickyCellStyle(0)} />}
                {hasExpand && <td className={cn(cellPad, stickyCellClass(selectable ? 1 : 0, false))} style={stickyCellStyle(selectable ? 1 : 0)} />}
                {(() => {
                  const cells = summaryCells;
                  return visibleColumns.map((col, i) => (
                    <td
                      key={colKeyOf(col)}
                      style={stickyCellStyle(leadingCount + i)}
                      className={cn(
                        cellPad,
                        'font-mono text-[12px] font-semibold text-[var(--fg-default,#0a1628)]',
                        stickyCellClass(leadingCount + i, false),
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
                {hasTrailing && <td className={cn(cellPad, stickyCellClass(totalCols - 1, false))} style={stickyCellStyle(totalCols - 1)} />}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      {pagination && !infinite && !blockingError && (!isLoading || loadingVariant === 'skeleton') && (
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
      {bulkBar}
      {contextMenu}
    </div>
  );
}

const DENSITY_LABELS: Record<TableDensity, string> = { compact: 'Compacta', normal: 'Normal', comfy: 'Cómoda' };

/** Botón de filtro de una columna y su panel (texto, opciones, rango numérico o de fechas). */
function ColumnFilter<T>({
  column,
  value,
  onChange,
  labelled = false,
}: {
  column: TableColumn<T>;
  value: TableFilterValue | undefined;
  onChange: (value: TableFilterValue | undefined) => void;
  /** Con el nombre de la columna (barra de la vista de tarjetas). */
  labelled?: boolean;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const mobile = useIsMobile();
  const filter = column.filter!;
  const active = !isEmptyFilter(value);
  const close = React.useCallback(() => setIsOpen(false), []);
  const { anchorRef, popoverRef, style, ready, mounted, popoverProps } = usePopover<HTMLButtonElement>({
    open: isOpen && !mobile,
    onClose: close,
    align: column.align === 'right' ? 'end' : 'start',
    minWidth: filter.type === 'date-range' ? 280 : 220,
    scrollStrategy: 'close',
  });

  const body = (() => {
    switch (filter.type) {
      case 'text':
        return (
          <Input
            autoFocus
            value={typeof value === 'string' ? value : ''}
            placeholder={filter.placeholder ?? 'Contiene…'}
            aria-label={`Filtrar ${column.header}`}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') close(); }}
          />
        );
      case 'select': {
        const marked = Array.isArray(value) ? value : [];
        return (
          <div className="k-table-filter-options" role="group" aria-label={`Filtrar ${column.header}`}>
            {filter.options.map((option) => (
              <Checkbox
                key={option.value}
                size="sm"
                label={option.label}
                checked={marked.includes(option.value)}
                onChange={(checked) => onChange(checked ? [...marked, option.value] : marked.filter((v) => v !== option.value))}
              />
            ))}
          </div>
        );
      }
      case 'range': {
        const r = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as { min?: number | null; max?: number | null };
        return (
          <div className="k-table-filter-range">
            <NumberInput label="Desde" value={r.min ?? null} min={filter.min} max={filter.max} step={filter.step} onChange={(min) => onChange({ ...r, min })} />
            <NumberInput label="Hasta" value={r.max ?? null} min={filter.min} max={filter.max} step={filter.step} onChange={(max) => onChange({ ...r, max })} />
          </div>
        );
      }
      case 'date-range': {
        const d = (value && typeof value === 'object' && !Array.isArray(value) ? value : {}) as { start?: string | null; end?: string | null };
        return <DateRangePicker value={{ start: d.start ?? null, end: d.end ?? null }} onChange={(range) => onChange(range)} months={1} />;
      }
    }
  })();

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        aria-label={`Filtrar por ${column.header}${active ? ' (activo)' : ''}`}
        aria-expanded={isOpen}
        data-active={active || undefined}
        className={labelled ? 'k-table-filter-pill' : 'k-table-filter-btn'}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
      >
        <UiIcon slot="filter" size={labelled ? 14 : 12} />
        {labelled && <span>{column.header}</span>}
      </button>
      {(isOpen || mounted) &&
        adaptivePortal(
          <div
            ref={popoverRef}
            {...(mobile ? undefined : popoverProps)}
            className={cn('k-table-filter-panel k-appear', !ready && !mobile && 'invisible')}
            style={style}
          >
            <div className="k-table-filter-head">
              <span>{column.header}</span>
              {active && <button type="button" onClick={() => onChange(undefined)}>Limpiar</button>}
            </div>
            {body}
          </div>,
          document.body,
          { open: isOpen, onClose: close, title: `Filtrar ${column.header}`, presentation: mobile ? 'sheet' : 'anchored', anchorRef },
        )}
    </>
  );
}
