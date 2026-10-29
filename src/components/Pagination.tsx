import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { Select } from './Select';
import { pageItems } from './internal/tableFilters';
import { useI18n } from '../i18n/I18nProvider';

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
  const { messages: m, format } = useI18n();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const showSizes = pageSizeOptions.length > 0 && onPageSizeChange;

  const navBtn =
    'inline-flex items-center gap-1 px-2 py-1 rounded-[var(--k-radius-xs,2px)] text-[12px] font-medium text-[var(--fg-body,#2d3a4a)] hover:text-accent hover:bg-[var(--bg-hover)] transition-colors disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent';

  return (
    <div data-k-mobile="Pagination"
      className={cn(
        'flex items-center justify-between gap-3 flex-wrap text-[12px] text-[var(--fg-muted,#52606f)]',
        className,
      )}
    >
      <span className="font-mono text-[11px] whitespace-nowrap">
        {format(m.pagination.range, { from, to, total })}
      </span>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {showSizes && (
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <Select
              options={pageSizeOptions.map((size) => ({ value: String(size), label: String(size) }))}
              value={String(pageSize)}
              onChange={(v) => onPageSizeChange!(Number(v))}
              ariaLabel={m.pagination.pageSize}
              containerClassName="w-auto"
              className="px-2 py-1 text-[12px] gap-1 min-w-[56px]"
            />
            <span>{m.pagination.perPage}</span>
          </span>
        )}
        <div className="flex items-center gap-1">
          <button
            type="button"
            className={navBtn}
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
          >
            <UiIcon slot="chevron-left" className="h-3.5 w-3.5" />
            <span className="k-pages-label">{m.common.previous}</span>
          </button>
          {/* Números de página con «…» en los saltos; siempre el mismo número de huecos para que no bailen. */}
          <span className="k-pages" role="list">
            {pageItems(page, totalPages).map((n, i) =>
              n === null ? (
                <span key={`gap-${i}`} role="listitem" className="k-pages-gap" aria-hidden="true">…</span>
              ) : (
                <span key={n} role="listitem">
                  <button
                    type="button"
                    className="k-pages-btn"
                    aria-label={format(m.pagination.page, { page: n })}
                    aria-current={n === page ? 'page' : undefined}
                    onClick={() => n !== page && onPageChange(n)}
                  >
                    {n}
                  </button>
                </span>
              ),
            )}
          </span>
          <button
            type="button"
            className={navBtn}
            onClick={() => onPageChange(page + 1)}
            disabled={page >= totalPages}
          >
            <span className="k-pages-label">{m.common.next}</span>
            <UiIcon slot="chevron-right" className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
