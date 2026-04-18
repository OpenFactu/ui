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
  compact: { cell: 'px-2.5 py-1', text: 'text-xs' },
  normal: { cell: 'px-3 py-2', text: 'text-sm' },
  comfy: { cell: 'px-4 py-3.5', text: 'text-sm' },
};

export function Table<T>({
  columns,
  data = [],
  onRowClick,
  className,
  emptyMessage = 'No se encontraron registros.',
  isLoading,
  density = 'compact',
  selectable = false,
  selectedKeys,
  onSelectionChange,
  rowKey,
}: TableProps<T>) {
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
    <div className={cn('w-full overflow-auto bg-white dark:bg-slate-900', className)}>
      <table
        className={cn(
          'w-full leading-tight text-left border-collapse font-sans min-w-full',
          cellText,
        )}
      >
        <thead className="bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-sm sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800">
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
            {columns.map((col, idx) => (
              <th
                key={idx}
                style={{ width: col.width }}
                className={cn(
                  cellPad,
                  'font-bold uppercase tracking-tight text-[10px] text-slate-500 dark:text-slate-400 font-display whitespace-nowrap',
                  col.align === 'center'
                    ? 'text-center'
                    : col.align === 'right'
                      ? 'text-right'
                      : 'text-left',
                  col.className,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td
                colSpan={totalCols}
                className={cn(cellPad, 'py-10 text-center text-slate-400 dark:text-slate-500 font-medium')}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                  <span className="animate-pulse">Sincronizando con el servidor...</span>
                </div>
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={totalCols}
                className={cn(cellPad, 'py-16 text-center text-slate-400 dark:text-slate-500')}
              >
                <div className="flex flex-col items-center gap-2 opacity-50">
                  <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1}
                      d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                    />
                  </svg>
                  <span className="text-xs font-semibold uppercase tracking-widest">
                    {emptyMessage}
                  </span>
                </div>
              </td>
            </tr>
          ) : (
            data.map((item, rowIdx) => {
              const key = getKey(item, rowIdx);
              const isRowSelected = selected.has(key);
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    'group transition-all duration-75 border-t border-slate-100 dark:border-slate-800',
                    isRowSelected
                      ? 'bg-primary/5 dark:bg-primary/10'
                      : rowIdx % 2 === 0
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-slate-50/50 dark:bg-slate-900',
                    onRowClick
                      ? 'cursor-pointer hover:bg-primary/5'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/50',
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

                    return (
                      <td
                        key={colIdx}
                        className={cn(
                          cellPad,
                          'text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-900 dark:group-hover:text-slate-100 transition-colors',
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
