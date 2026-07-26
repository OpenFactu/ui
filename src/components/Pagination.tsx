import * as React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../utils';
import { Select } from './Select';

export interface PaginationProps {
  /** Página actual, 1-based. */
  page: number;
  pageSize: number;
  /** Total de registros. */
  total: number;
  onPageChange: (page: number) => void;
  /** Opciones del selector de tamaño. [] oculta el selector. Default [10, 25, 50, 100]. */
  pageSizeOptions?: number[];
  onPageSizeChange?: (size: number) => void;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  pageSize,
  total,
  onPageChange,
  pageSizeOptions = [10, 25, 50, 100],
  onPageSizeChange,
  className,
}) => {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const showSizes = pageSizeOptions.length > 0 && onPageSizeChange;

  const navBtn =
    'inline-flex items-center gap-1 px-2 py-1 rounded-[var(--k-radius-xs,2px)] text-[12px] font-medium text-[var(--fg-body,#2d3a4a)] hover:text-accent hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent';

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 flex-wrap text-[12px] text-[var(--fg-muted,#52606f)]',
        className,
      )}
    >
      <span className="font-mono text-[11px] whitespace-nowrap">
        {from}–{to} de {total}
      </span>
      <div className="flex items-center gap-2">
        {showSizes && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Select
              options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
              value={String(pageSize)}
              onChange={(v) => onPageSizeChange!(Number(v))}
              ariaLabel="Registros por página"
              containerClassName="w-auto"
              className="px-2 py-1 text-[12px] gap-1 min-w-[56px]"
            />
            <span>por página</span>
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={navBtn}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Anterior
          </button>
          <span className="font-mono text-[11px] px-1 whitespace-nowrap">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            className={navBtn}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            Siguiente
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
