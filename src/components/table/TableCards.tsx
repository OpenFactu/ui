import * as React from 'react';
import { UiIcon } from '../../icons';
import { useI18n } from '../../i18n/I18nProvider';
import { cn } from '../../utils';
import { Checkbox } from '../Checkbox';
import { DropdownMenu } from '../DropdownMenu';
import { Pagination } from '../Pagination';
import { Skeleton } from '../Skeleton';
import type { TableFilterValue, TableFilters } from '../internal/tableFilters';
import { ColumnFilter, ColumnToggle, RowActionsCell, colKeyOf } from './parts';
import type { RowAction, TableColumn, TableInfinite, TablePagination, TableProps, TableSort } from './types';

type RowKey = string | number;

interface TableCardsProps<T> extends Pick<TableProps<T>, 'ariaLabel' | 'className' | 'selectable' | 'isRowSelectable' | 'rowActions' | 'onRowClick' | 'rowClassName' | 'renderExpanded'> {
  columns: TableColumn<T>[];
  visibleColumns: TableColumn<T>[];
  feedback: React.ReactNode;
  toolbar: React.ReactNode;
  allSelected: boolean;
  headerState: 'checked' | 'unchecked' | 'indeterminate';
  isLoading: boolean;
  isRefreshing: boolean;
  blockingError: boolean;
  pageKeyCount: number;
  onToggleAll: (checked: boolean) => void;
  sort: TableSort | null;
  onSortChange: (sort: TableSort | null) => void;
  filterableColumns: TableColumn<T>[];
  filters: TableFilters;
  onFilterChange: (key: string, value: TableFilterValue | undefined) => void;
  showColumnToggle: boolean;
  toggleEntries: { key: string; header: string; visible: boolean }[];
  onToggleColumn: (key: string) => void;
  skeletonRowCount: number;
  pagedData: T[];
  emptyMessage: React.ReactNode;
  getKey: (item: T, index: number) => RowKey;
  selected: Set<RowKey>;
  onToggleRow: (key: RowKey) => void;
  onRowKeyDown: (event: React.KeyboardEvent, item: T) => void;
  onOpenContextMenu: (event: React.MouseEvent, actions: RowAction[]) => void;
  expanded: Set<RowKey>;
  onToggleExpanded: (key: RowKey) => void;
  infiniteFooter: React.ReactNode;
  hasSummary: boolean;
  summaryLabel: React.ReactNode;
  summaryCells: React.ReactNode[];
  pagination?: TablePagination;
  infinite?: TableInfinite;
  page: number;
  pageSize: number;
  totalRecords: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  bulkBar: React.ReactNode;
  contextMenu: React.ReactNode;
}

/** Vista en pantalla estrecha: cada fila es una tarjeta y las columnas se reparten según su papel (`card`). */
export function TableCards<T>({
  columns, visibleColumns, ariaLabel, className, feedback, toolbar, selectable, isRowSelectable, allSelected, headerState,
  isLoading, isRefreshing, blockingError, pageKeyCount, onToggleAll, sort, onSortChange, filterableColumns, filters, onFilterChange,
  showColumnToggle, toggleEntries, onToggleColumn, skeletonRowCount, pagedData, emptyMessage, getKey, selected, onToggleRow,
  rowActions, onRowClick, onRowKeyDown, onOpenContextMenu, rowClassName, expanded, onToggleExpanded, renderExpanded, infiniteFooter,
  hasSummary, summaryLabel, summaryCells, pagination, infinite, page, pageSize, totalRecords, onPageChange, onPageSizeChange, bulkBar, contextMenu,
}: TableCardsProps<T>) {
  const { messages: m, format } = useI18n();
  const t = m.table;
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
      {toolbar}
      {/* Una sola tira que se desliza en horizontal: en un móvil, cada control en su propia fila se comía la pantalla. */}
      <div className="k-table-strip" role="toolbar" aria-label={t.options}>
        {selectable && (
          <span className="k-table-strip-check">
            <Checkbox
              checked={allSelected}
              state={headerState}
              disabled={isLoading || pageKeyCount === 0}
              onChange={onToggleAll}
              label={t.selectPage}
              size="sm"
            />
          </span>
        )}
        {columns.some((column) => column.sortable) && (
            <DropdownMenu className="k-table-filter-pill" items={[
              { label: t.sortOriginal, onClick: () => onSortChange(null) },
              ...columns.filter((column) => column.sortable).flatMap((column) =>
                (['asc', 'desc'] as const).map((dir) => ({
                  label: format(dir === 'asc' ? t.sortAsc : t.sortDesc, { column: String(column.header) }),
                  onClick: () => onSortChange({ colKey: colKeyOf(column), dir }),
                })),
              ),
            ]}>
              <UiIcon slot="chevrons-up-down" size={14} />
              {sort ? `${columns.find((column) => colKeyOf(column) === sort.colKey)?.header ?? t.sortBy} ${sort.dir === 'asc' ? '↑' : '↓'}` : <>{t.sort}<span className="sr-only">{t.sortRecords}</span></>}
            </DropdownMenu>
        )}
        {filterableColumns.map((col) => (
          <ColumnFilter key={colKeyOf(col)} column={col} value={filters[colKeyOf(col)]} onChange={(v) => onFilterChange(colKeyOf(col), v)} labelled />
        ))}
        {showColumnToggle && <ColumnToggle entries={toggleEntries} onToggle={onToggleColumn} />}
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
              <span className="text-[length:calc(10px*var(--k-text-scale,1))] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">{emptyMessage}</span>
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
                onKeyDown={(event) => onRowKeyDown(event, item)}
                onContextMenu={
                  actions && actions.length > 0 ? (e) => onOpenContextMenu(e, actions) : undefined
                }
                style={{ animation: `k-row-in calc(0.35s * var(--k-motion, 1)) ease-out calc(${Math.min(rowIdx * 20, 200)}ms * var(--k-motion, 1)) both` }}
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
                          onChange={() => onToggleRow(key)}
                          size="sm"
                          aria-label={format(t.selectRow, { row: rowIdx + 1 })}
                        />
                      </label>
                    )}
                    <div className="min-w-0">
                      <div
                        className={cn(
                          'text-[var(--fg-default,#0a1628)] truncate',
                          // La fuente monoespaciada es para códigos (columna `primary`); un nombre va en la del cuerpo.
                          titleCol?.primary
                            ? 'font-mono text-[length:calc(13px*var(--k-text-scale,1))] font-medium'
                            : 'text-sm font-semibold',
                        )}
                      >
                        {titleCol && render(titleCol, item, rowIdx)}
                      </div>
                      {subtitleCols.map((col) => (
                        <div
                          key={colKeyOf(col)}
                          className="text-[length:calc(12px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)] truncate"
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
                        <dt className="text-[length:calc(9px*var(--k-text-scale,1))] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
                          {col.header}
                        </dt>
                        <dd
                          className={cn(
                            'text-[length:calc(12px*var(--k-text-scale,1))] text-[var(--fg-body,#2d3a4a)] truncate',
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
                  <div className="flex items-center justify-end gap-3 pt-1 border-t border-[var(--border-subtle,#f1f5f9)] font-mono text-[length:calc(13px*var(--k-text-scale,1))] tabular-nums text-[var(--fg-default,#0a1628)]">
                    {metaCols.map((col) => (
                      <React.Fragment key={colKeyOf(col)}>{render(col, item, rowIdx)}</React.Fragment>
                    ))}
                  </div>
                )}

                {renderExpanded && (
                  <button
                    type="button"
                    aria-expanded={expanded.has(key)}
                    onClick={(event) => { event.stopPropagation(); onToggleExpanded(key); }}
                    className="self-start text-[length:calc(12px*var(--k-text-scale,1))] text-accent focus-visible:ring-1 focus-visible:ring-accent"
                  >
                    {expanded.has(key) ? t.hideDetail : t.showDetail}
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
        <section aria-label={t.summary} className="rounded-[var(--k-radius-sm)] border border-[var(--border-default)] bg-[var(--bg-muted)] p-4">
          <p className="mb-3 text-[length:calc(12px*var(--k-text-scale,1))] font-semibold text-[var(--fg-default)]">{summaryLabel}</p>
          <dl className="space-y-2 text-[length:calc(12px*var(--k-text-scale,1))]">
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
          onPageChange={onPageChange}
          pageSizeOptions={pagination.pageSizeOptions}
          onPageSizeChange={onPageSizeChange}
          className="px-1 py-2"
        />
      )}
      {bulkBar}
      {contextMenu}
    </div>
  );
}
