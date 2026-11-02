import * as React from 'react';
import type { DropdownMenuItem } from '../DropdownMenu';
import type { SelectionBarAction } from '../SelectionBar';
import type { Density } from '../internal/density';
import type { TableAggregate, TableColumnFilter, TableFilters } from '../internal/tableFilters';

export type { TableAggregate, TableColumnFilter, TableFilterOption, TableFilterValue, TableFilters } from '../internal/tableFilters';

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
  sortAccessor?: (item: T) => unknown;
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
  /** Clases de cada celda según su columna y su fila, que ganan a las de serie. */
  cellClassName?: (column: TableColumn<T>, item: T, index: number) => string | undefined;
  /** Clases de cada cabecera, que ganan a las de serie. */
  headerClassName?: (column: TableColumn<T>) => string | undefined;
  /** Pinta la cabecera de una columna. Recibe el nombre de serie; ordenar y filtrar siguen siendo de la tabla. */
  renderHeader?: (column: TableColumn<T>, defaults: React.ReactNode) => React.ReactNode;
  /** Pinta el mensaje de tabla vacía. Recibe el de serie. */
  renderEmpty?: (defaults: React.ReactNode) => React.ReactNode;
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
