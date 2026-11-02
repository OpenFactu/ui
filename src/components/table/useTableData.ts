import * as React from 'react';
import { isEmptyFilter, matchesFilter, matchesSearch, type TableFilterValue, type TableFilters } from '../internal/tableFilters';
import { colKeyOf, compareValues } from './parts';
import type { TableColumn, TableProps, TableSort } from './types';

type DataOptions<T> = Pick<TableProps<T>, 'columns' | 'data' | 'pagination' | 'infinite' | 'defaultFilters' | 'onFiltersChange' | 'filterMode' | 'defaultSort' | 'onSortChange' | 'sortMode' | 'onSearchChange'> & {
  filters?: TableFilters;
  search?: string;
  sort?: TableSort | null;
};

/** Lo que la tabla hace con sus filas antes de pintarlas: filtrar, buscar, ordenar y paginar. Cada estado puede venir de fuera. */
export function useTableData<T>({
  columns,
  data = [],
  pagination,
  infinite,
  filters: filtersProp,
  defaultFilters,
  onFiltersChange,
  filterMode = 'client',
  search: searchProp,
  onSearchChange,
  sort: controlledSort,
  defaultSort = null,
  onSortChange,
  sortMode = 'client',
}: DataOptions<T>) {
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
    if (col.accessor) return (item as Record<string, unknown>)[col.accessor as string];
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
    const getVal = (item: T): unknown => {
      if (col.sortAccessor) return col.sortAccessor(item);
      if (typeof col.accessor === 'function') return col.accessor(item, 0);
      if (col.accessor) return (item as Record<string, unknown>)[col.accessor as string];
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

  return {
    filters, setFilters, setFilter, search, setSearch, valueOf, filterableColumns, activeFilterColumns, filteredData,
    sort, changeSort, toggleSort, sortedData,
    serverMode, pageSize, totalRecords, page, setPage, setPageSize, pagedData,
  };
}
