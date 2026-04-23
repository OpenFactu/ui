import * as React from 'react';
import { cn } from '../utils';
import { Checkbox } from './Checkbox';

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
}

export type TableDensity = 'compact' | 'normal' | 'comfy';

export interface TableProps<T> {
  columns: TableColumn<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  className?: string;
  emptyMessage?: string;
  isLoading?: boolean;
  /** Densidad de filas. Default: 'compact' (estilo Odoo). */
  density?: TableDensity;
  /** Si true, añade columna de checkboxes y permite multi-select. */
  selectable?: boolean;
  /** Selección controlada. Si se omite, la Table mantiene estado interno. */
  selectedKeys?: Set<string | number>;
  onSelectionChange?: (keys: Set<string | number>) => void;
  /** Cómo extraer la key de cada fila. Default: item.id. */
  rowKey?: (item: T, index: number) => string | number;
}

const densityClasses: Record<TableDensity, { cell: string; text: string }> = {
  compact: { cell: 'px-4 py-2', text: 'text-[12px]' },
  normal: { cell: 'px-4 py-3', text: 'text-[13px]' },
  comfy: { cell: 'px-4 py-4', text: 'text-[13px]' },
};

type SortDir = 'asc' | 'desc';

interface SortState {
  colIdx: number;
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

export function Table<T>({
  columns,
  data = [],
  onRowClick,
  className,
  emptyMessage = 'No se encontraron registros.',
  isLoading,
  density = 'normal',
  selectable = false,
  selectedKeys,
  onSelectionChange,
  rowKey,
}: TableProps<T>) {
  // Estado de ordenación — cíclico: null → asc → desc → null
  const [sort, setSort] = React.useState<SortState | null>(null);

  const toggleSort = (colIdx: number) => {
    setSort((prev) => {
      if (!prev || prev.colIdx !== colIdx) return { colIdx, dir: 'asc' };
      if (prev.dir === 'asc') return { colIdx, dir: 'desc' };
      return null;
    });
  };

  const sortedData = React.useMemo(() => {
    if (!sort) return data;
    const col = columns[sort.colIdx];
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
  // Selección — controlada o interna
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

  const allKeys = React.useMemo(() => data.map((d, i) => getKey(d, i)), [data, getKey]);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selected.has(k));
  const someSelected = !allSelected && allKeys.some((k) => selected.has(k));
  const headerState: 'checked' | 'unchecked' | 'indeterminate' = allSelected
    ? 'checked'
    : someSelected
      ? 'indeterminate'
      : 'unchecked';

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(allKeys));
    } else {
      setSelected(new Set());
    }
  };

  const toggleRow = (key: string | number) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };

  const cellPad = densityClasses[density].cell;
  const cellText = densityClasses[density].text;
  const totalCols = columns.length + (selectable ? 1 : 0);

  return (
    <div
      className={cn(
        'w-full overflow-auto bg-white dark:bg-slate-900 border border-[var(--k-line)] dark:border-slate-800 rounded-[2px]',
        className,
      )}
    >
      <table
        className={cn(
          // min-w para móvil: si la tabla tiene varias columnas no caben en
          // pantalla pequeña → scroll horizontal del wrapper (overflow-auto).
          'w-full leading-tight text-left border-collapse font-sans min-w-[720px] sm:min-w-full',
          cellText,
        )}
      >
        <thead className="bg-white dark:bg-slate-900 sticky top-0 z-[1] border-b border-[var(--k-line)] dark:border-slate-800">
          <tr>
            {selectable && (
              <th className={cn(cellPad, 'w-8')}>
                <Checkbox
                  state={headerState}
                  checked={allSelected}
                  onChange={toggleAll}
                  size="sm"
                  aria-label="Seleccionar todas las filas"
                />
              </th>
            )}
            {columns.map((col, idx) => {
              const isSortable = !!col.sortable;
              const isSorted = sort?.colIdx === idx;
              const dir = isSorted ? sort!.dir : null;
              return (
                <th
                  key={idx}
                  style={{ width: col.width }}
                  onClick={isSortable ? () => toggleSort(idx) : undefined}
                  className={cn(
                    cellPad,
                    'font-mono text-[10px] tracking-[1px] uppercase font-normal text-[var(--k-ink-400)] dark:text-slate-500 whitespace-nowrap select-none',
                    col.align === 'center'
                      ? 'text-center'
                      : col.align === 'right'
                        ? 'text-right'
                        : 'text-left',
                    isSortable &&
                      'cursor-pointer hover:text-accent dark:hover:text-accent transition-colors',
                    isSorted && 'text-accent dark:text-accent',
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
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={totalCols}
                className={cn(cellPad, 'py-10 text-center text-[var(--k-ink-400)] dark:text-slate-500')}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-5 h-5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
                  <span className="animate-pulse font-mono text-[11px] tracking-wider uppercase">
                    Sincronizando…
                  </span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={totalCols}
                className={cn(cellPad, 'py-16 text-center text-[var(--k-ink-400)] dark:text-slate-500')}
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
                  <span className="text-[10px] font-mono uppercase tracking-[1.5px]">
                    {emptyMessage}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            sortedData.map((item, rowIdx) => {
              const key = getKey(item, rowIdx);
              // Animación escalonada al montar: cada fila entra con 15ms de delay
              // acumulado, limitado a 300ms total para no parecer lenta en tablas
              // grandes.
              const animDelay = Math.min(rowIdx * 15, 300);
              const isRowSelected = selected.has(key);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(item)}
                  style={{
                    animation: `k-row-in 0.45s ease-out ${animDelay}ms both`,
                  }}
                  className={cn(
                    'group transition-all duration-200 border-b border-[var(--k-line-2)] dark:border-slate-800 last:border-b-0',
                    isRowSelected
                      ? 'bg-accent/5 dark:bg-accent/10 shadow-inner'
                      : 'hover:bg-[var(--k-surface)] dark:hover:bg-slate-800/50',
                    onRowClick && 'cursor-pointer hover:shadow-sm hover:-translate-y-px',
                  )}
                >
                  {selectable && (
                    <td className={cn(cellPad, 'w-8')} onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={isRowSelected}
                        onChange={() => toggleRow(key)}
                        size="sm"
                        aria-label={`Seleccionar fila ${rowIdx + 1}`}
                      />
                    </td>
                  )}
                  {columns.map((col, colIdx) => {
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

                    return (
                      <td
                        key={colIdx}
                        className={cn(
                          cellPad,
                          'transition-colors',
                          isPrimary
                            ? 'font-mono text-[12px] font-medium text-[var(--k-ink-900)] dark:text-slate-100'
                            : isRightAligned
                              ? 'font-mono text-[12px] text-[var(--k-ink-900)] dark:text-slate-100'
                              : 'text-[var(--k-ink-700)] dark:text-slate-300',
                          col.align === 'center'
                            ? 'text-center'
                            : col.align === 'right'
                              ? 'text-right'
                              : 'text-left',
                          col.className,
                        )}
                      >
                        {content}
                      </td>
                    );
                  })}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
