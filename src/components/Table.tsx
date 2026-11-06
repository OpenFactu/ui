import { useComponentDefaults } from '../context/ComponentDefaults';
import { Spinner } from './Spinner';
import * as React from 'react';
import { UiIcon } from '../icons';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import { cn } from '../utils';
import { Checkbox } from './Checkbox';
import { Pagination } from './Pagination';
import { useContextMenu } from './ContextMenu';
import { Skeleton } from './Skeleton';
import { Alert } from './Alert';
import { Button } from './Button';
import { formatNumber } from '../internal/intl';
import { aggregate as aggregateValues, isEmptyFilter } from './internal/tableFilters';
import { useI18n } from '../i18n/I18nProvider';
import { useIsNarrow } from '../hooks/useMediaQuery';
import { SelectionBar } from './SelectionBar';
import { densityClasses, skeletonWidth } from './internal/density';
import { ColumnFilter, ColumnToggle, RowActionsCell, colKeyOf } from './table/parts';
import { TableCards } from './table/TableCards';
import { TableToolbar } from './table/TableToolbar';
import { useColumnLayout } from './table/useColumnLayout';
import { useTableData } from './table/useTableData';
import type { TableColumn, TableDensity, TableProps } from './table/types';

export type {
  RowAction, TableAggregate, TableBulkAction, TableColumn, TableColumnFilter, TableDensity, TableFilterOption, TableFilterValue, TableFilters,
  TableInfinite, TablePagination, TableProps, TableSort,
} from './table/types';

export function Table<T>(rawProps: TableProps<T>) {
  const {
  columns,
  data = [],
  onRowClick,
  rowClassName,
  className,
  emptyMessage: emptyMessageProp,
  isLoading: initialLoading,
  isRefreshing = false,
  refreshingLabel: refreshingLabelProp,
  errorMessage,
  onRetry,
  retryLabel: retryLabelProp,
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
  loadingLabel: loadingLabelProp,
  responsive = 'auto',
  cardsBreakpoint = responsive === 'auto' ? 768 : 640,
  summaryRow,
  summaryByColumn,
  summaryLabel: summaryLabelProp,
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
  cellClassName,
  headerClassName,
  renderHeader,
  renderEmpty,
  } = useComponentDefaults('Table', rawProps);
  const { messages: m, format } = useI18n();
  const t = m.table;
  const emptyMessageDefault = emptyMessageProp ?? t.empty;
  const emptyMessage = renderEmpty ? renderEmpty(emptyMessageDefault) : emptyMessageDefault;
  const refreshingLabel = refreshingLabelProp ?? t.refreshing;
  const retryLabel = retryLabelProp ?? m.common.retry;
  const loadingLabel = loadingLabelProp ?? t.syncing;
  const summaryLabel = summaryLabelProp ?? m.status.total;
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
            ? 'flex items-center gap-2 px-4 py-2 text-[length:calc(12px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]'
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
          title={blockingError ? t.loadError : t.refreshError}
          action={onRetry && (
            <Button type="button" size="sm" variant="secondary" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
        >
          {errorMessage}
          {!blockingError && <p className="mt-1">{t.staleData}</p>}
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

  const {
    filters, setFilters, setFilter, search, setSearch, valueOf, filterableColumns, activeFilterColumns, filteredData,
    sort, changeSort, toggleSort, sortedData,
    serverMode, pageSize, totalRecords, page, setPage, setPageSize, pagedData,
  } = useTableData({
    columns, data, pagination, infinite, filters: filtersProp, defaultFilters, onFiltersChange, filterMode,
    search: searchProp, onSearchChange, sort: controlledSort, defaultSort, onSortChange, sortMode,
  });

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
        <div className="flex items-center justify-center gap-2 py-3 text-[length:calc(11px*var(--k-text-scale,1))] font-mono uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
          <Spinner size="xs" />
          {t.loadingMore}
        </div>
      )}
      {!infinite.hasMore && !infinite.loading && infinite.endMessage !== false && (
        <div className="py-3 text-center text-[length:calc(10px*var(--k-text-scale,1))] font-mono uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
          {infinite.endMessage ?? t.end}
        </div>
      )}
    </>
  );
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

  const hasExpand = !!renderExpanded;
  const hasTrailing = !!rowActions || showColumnToggle;
  const leadingCount = (selectable ? 1 : 0) + (hasExpand ? 1 : 0);
  const totalCols =
    visibleColumns.length + (selectable ? 1 : 0) + (hasExpand ? 1 : 0) + (hasTrailing ? 1 : 0);
  const { colWidths, resizingRef, startResize, headerRowRef, scrollerRef, overflow, measureOverflow, stickyCellStyle, stickyCellClass } = useColumnLayout({
    columnCount: visibleColumns.length,
    pinnedStart: pinnedLeft.length,
    pinnedEnd: pinnedRight.length,
    leadingCount,
    hasTrailing,
    totalCols,
    density: densidad,
    data,
  });

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
    ? format(m.common.ofTotal, { current: filteredData.length, total: data.length })
    : null;
  const toolbarEl = (cards: boolean) => showToolbar && (
    <TableToolbar
      cards={cards}
      searchable={Boolean(searchable)}
      search={search}
      onSearchChange={setSearch}
      searchPlaceholder={searchConfig.placeholder}
      filteredInfo={filteredInfo}
      densityToggle={densityToggle}
      density={densidad}
      onDensityChange={changeDensity}
      toolbar={toolbar}
      activeFilterColumns={activeFilterColumns}
      filters={filters}
      onFilterChange={setFilter}
      onClearFilters={() => setFilters({})}
    />
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
      countLabel={(n) => format(t.selected, { count: n })}
      actions={selected.size ? bulkActions(selectedRows) : []}
      onClear={() => setSelected(new Set())}
      selectAll={canSelectAll ? { total: allFilteredKeys.length, label: format(t.selectAll, { total: allFilteredKeys.length }), onSelect: () => setSelected(new Set([...selected, ...allFilteredKeys])) } : undefined}
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
    return (
      <TableCards
        columns={columns}
        visibleColumns={visibleColumns}
        ariaLabel={ariaLabel}
        className={className}
        feedback={feedback}
        toolbar={toolbarEl(true)}
        selectable={selectable}
        isRowSelectable={isRowSelectable}
        allSelected={allSelected}
        headerState={headerState}
        isLoading={Boolean(isLoading)}
        isRefreshing={isRefreshing}
        blockingError={blockingError}
        pageKeyCount={pageKeys.length}
        onToggleAll={toggleAll}
        sort={sort}
        onSortChange={changeSort}
        filterableColumns={filterableColumns}
        filters={filters}
        onFilterChange={setFilter}
        showColumnToggle={showColumnToggle}
        toggleEntries={toggleEntries}
        onToggleColumn={(key) => setVisibility({ ...visibility, [key]: visibility[key] === false })}
        skeletonRowCount={skeletonRowCount}
        pagedData={pagedData}
        emptyMessage={emptyMessage}
        getKey={getKey}
        selected={selected}
        onToggleRow={toggleRow}
        rowActions={rowActions}
        onRowClick={onRowClick}
        onRowKeyDown={activateRow}
        onOpenContextMenu={openContextMenu}
        rowClassName={rowClassName}
        expanded={expanded}
        onToggleExpanded={toggleExpanded}
        renderExpanded={renderExpanded}
        infiniteFooter={infiniteFooter}
        hasSummary={hasSummary}
        summaryLabel={summaryLabel}
        summaryCells={summaryCells}
        pagination={pagination}
        infinite={infinite}
        page={page}
        pageSize={pageSize}
        totalRecords={totalRecords}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        bulkBar={bulkBar}
        contextMenu={contextMenu}
      />
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
            'w-full leading-tight text-start border-collapse font-sans min-w-[720px] sm:min-w-full',
            cellText,
          )}
        >
          <thead className={cn(
            'bg-[var(--bg-card,#ffffff)] sticky top-0 z-[3] border-b border-[var(--border-default,#e2e8f0)]',
            headerVariant === 'muted' && 'bg-[var(--bg-muted,#f8fafc)] [&_th]:bg-[var(--bg-muted,#f8fafc)]',
            variant === 'grid' && '[&_th+th]:border-s [&_th+th]:border-[var(--border-default,#e2e8f0)]',
          )}>
            <tr ref={headerRowRef}>
              {selectable && (
                <th
                  className={cn(cellPad, 'w-8 bg-[var(--bg-card,#ffffff)]', stickyCellClass(0, false))}
                  style={stickyCellStyle(0)}
                >
                  <label className="k-table-check">
                    <Checkbox
                      state={headerState}
                      checked={allSelected}
                      disabled={isLoading || pageKeys.length === 0}
                      onChange={toggleAll}
                      size="sm"
                      aria-label={t.selectPage}
                    />
                  </label>
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
                      'relative font-mono text-[length:calc(10px*var(--k-text-scale,1))] tracking-[1px] uppercase font-normal text-[var(--fg-subtle,#657486)] whitespace-nowrap select-none',
                      col.align === 'center'
                        ? 'text-center'
                        : col.align === 'right'
                          ? 'text-end'
                          : 'text-start',
                      isSortable &&
                        'cursor-pointer hover:text-accent dark:hover:text-accent transition-colors',
                      isSorted && 'text-accent dark:text-accent',
                      stickyCellClass(cellIdx, false),
                      col.className,
                      headerClassName?.(col),
                    )}
                  >
                    <HeaderContent
                      type={isSortable ? 'button' : undefined}
                      onClick={isSortable ? () => { if (!resizingRef.current) toggleSort(colKey); } : undefined}
                      className={cn(
                        'inline-flex items-center gap-1 uppercase',
                        isSortable && 'k-table-sort rounded-[var(--k-radius-xs,2px)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
                        col.align === 'right' && (col.filter ? 'justify-end' : 'justify-end w-full'),
                      )}
                    >
                      {renderHeader ? renderHeader(col, col.header) : col.header}
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
                        className="absolute end-0 top-0 h-full w-1 cursor-col-resize hover:bg-accent transition-colors"
                      />
                    )}
                  </th>
                );
              })}
              {hasTrailing && (
                <th className={cn(cellPad, 'w-8 text-end', stickyCellClass(totalCols - 1, false))} style={stickyCellStyle(totalCols - 1)}>
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
                  style={{ animation: `k-row-in calc(0.45s * var(--k-motion, 1)) ease-out calc(${Math.min(rowIdx * 15, 300)}ms * var(--k-motion, 1)) both` }}
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
                            ? 'text-end'
                            : 'text-start',
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
                    <Spinner size="sm" />
                    <span className="animate-pulse font-mono text-[length:calc(11px*var(--k-text-scale,1))] tracking-wider uppercase">
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
                      <span className="text-[length:calc(10px*var(--k-text-scale,1))] font-mono uppercase tracking-[1.5px]">
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
                        animation: `k-row-in calc(0.45s * var(--k-motion, 1)) ease-out calc(${animDelay}ms * var(--k-motion, 1)) both`,
                      }}
                      className={cn(
                        'group transition-all duration-200 border-b border-[var(--border-subtle,#f1f5f9)] last:border-b-0',
                        isRowSelected
                          ? 'k-table-row-selected'
                          : cn(striped && 'bg-[var(--bg-muted,#f8fafc)]', 'hover:bg-[var(--bg-hover)]'),
                        variant === 'grid' && '[&_td+td]:border-s [&_td+td]:border-[var(--border-default,#e2e8f0)]',
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
                          <label className="k-table-check">
                            <Checkbox
                              checked={isRowSelected}
                              disabled={isRowSelectable ? !isRowSelectable(item) : false}
                              onChange={() => toggleRow(key)}
                              size="sm"
                              aria-label={format(t.selectRow, { row: rowIdx + 1 })}
                            />
                          </label>
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
                            aria-label={isExpanded ? t.collapseRow : t.expandRow}
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
                                ? 'font-mono text-[length:calc(12px*var(--k-text-scale,1))] font-medium text-[var(--fg-default,#0a1628)]'
                                : isRightAligned
                                  ? 'font-mono text-[length:calc(12px*var(--k-text-scale,1))] text-[var(--fg-default,#0a1628)]'
                                  : 'text-[var(--fg-body,#2d3a4a)]',
                              col.align === 'center'
                                ? 'text-center'
                                : col.align === 'right'
                                  ? 'text-end'
                                  : 'text-start',
                              stickyCellClass(cellIdx, isRowSelected, striped),
                              col.className,
                              cellClassName?.(col, item, rowIdx),
                            )}
                          >
                            {content}
                          </td>
                        );
                      })}
                      {hasTrailing && (
                        <td className={cn(cellPad, 'w-8 text-end', stickyCellClass(totalCols - 1, isRowSelected, striped))} style={stickyCellStyle(totalCols - 1)} onClick={(e) => e.stopPropagation()}>
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
                        'font-mono text-[length:calc(12px*var(--k-text-scale,1))] font-semibold text-[var(--fg-default,#0a1628)]',
                        stickyCellClass(leadingCount + i, false),
                        col.align === 'center'
                          ? 'text-center'
                          : col.align === 'right'
                            ? 'text-end'
                            : 'text-start',
                      )}
                    >
                      {/* La primera celda lleva la etiqueta si no se ha dado contenido. */}
                      {cells[i] ?? (i === 0 ? (
                        <span className="font-sans text-[length:calc(10px*var(--k-text-scale,1))] uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
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
