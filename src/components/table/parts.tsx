import * as React from 'react';
import { UiIcon } from '../../icons';
import { useI18n, useMessages } from '../../i18n/I18nProvider';
import { usePopover } from '../../hooks/usePopover';
import { useIsMobile } from '../../hooks/useMediaQuery';
import { cn } from '../../utils';
import { Checkbox } from '../Checkbox';
import { DateRangePicker } from '../DateRangePicker';
import { DropdownMenu } from '../DropdownMenu';
import { Input } from '../Input';
import { NumberInput } from '../NumberInput';
import { adaptivePortal } from '../internal/MobileOverlay';
import { isEmptyFilter, type TableFilterValue } from '../internal/tableFilters';
import type { RowAction, TableColumn } from './types';

export function compareValues(a: unknown, b: unknown): number {
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

export function colKeyOf<T>(col: TableColumn<T>): string {
  return col.id ?? col.header;
}

/** Popover con checkboxes para mostrar/ocultar columnas. */
export function ColumnToggle({
  entries,
  onToggle,
}: {
  entries: { key: string; header: string; visible: boolean }[];
  onToggle: (key: string) => void;
}) {
  const tt = useMessages('table');
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
        aria-label={tt.toggleColumns}
        aria-expanded={isOpen}
        title={tt.columns}
        onClick={() => setIsOpen(!isOpen)}
        className="k-table-col-toggle p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-accent hover:bg-[var(--bg-hover)] transition-colors"
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
            <p className="px-2.5 pt-1.5 pb-1 text-[length:calc(10px*var(--k-text-scale,1))] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
              {tt.columns}
            </p>
            {entries.map((entry) => (
              <label
                key={entry.key}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--k-radius-xs,2px)] text-[length:calc(12px*var(--k-text-scale,1))] text-[var(--fg-body,#2d3a4a)] hover:bg-[var(--bg-hover)] cursor-pointer"
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
          { open: isOpen, onClose: () => setIsOpen(false), title: tt.columns, presentation: mobile ? 'sheet' : 'anchored', anchorRef },
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
export const RowActionsCell: React.FC<{ actions: RowAction[] | null; alwaysVisible?: boolean }> = ({
  actions,
  alwaysVisible,
}) => {
  const tt = useMessages('table');
  if (!actions || actions.length === 0) return null;

  const revealClass = alwaysVisible
    ? ''
    : 'k-reveal opacity-0 group-hover:opacity-100 focus-visible:opacity-100 focus-within:opacity-100';
  const btnClass = cn(
    'k-touch-40 p-1 rounded-[var(--k-radius-xs,2px)] text-[var(--fg-subtle,#657486)] hover:text-accent hover:bg-[var(--bg-hover)] transition-all disabled:opacity-40 disabled:pointer-events-none',
    // En las tarjetas (pantalla táctil) el área de toque llega a 40 px.
    alwaysVisible && 'inline-flex min-h-10 min-w-10 items-center justify-center',
    revealClass,
  );

  if (actions.length === 1 && actions[0].icon && !actions[0].destructive) {
    const only = actions[0];
    const label = typeof only.label === 'string' ? only.label : tt.rowAction;
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
      <span className="sr-only">{tt.rowActions}</span>
      <UiIcon slot="more-horizontal" className="h-3.5 w-3.5" />
    </DropdownMenu>
  );
};

/** Botón de filtro de una columna y su panel (texto, opciones, rango numérico o de fechas). */
export function ColumnFilter<T>({
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
  const { messages: { table: tt, common }, format: fmt } = useI18n();
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
            placeholder={filter.placeholder ?? tt.filterContains}
            aria-label={fmt(tt.filterColumn, { column: String(column.header) })}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') close(); }}
          />
        );
      case 'select': {
        const marked = Array.isArray(value) ? value : [];
        return (
          <div className="k-table-filter-options" role="group" aria-label={fmt(tt.filterColumn, { column: String(column.header) })}>
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
            <NumberInput label={tt.rangeFrom} value={r.min ?? null} min={filter.min} max={filter.max} step={filter.step} onChange={(min) => onChange({ ...r, min })} />
            <NumberInput label={tt.rangeTo} value={r.max ?? null} min={filter.min} max={filter.max} step={filter.step} onChange={(max) => onChange({ ...r, max })} />
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
        aria-label={fmt(active ? tt.filterByActive : tt.filterBy, { column: String(column.header) })}
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
              {active && <button type="button" onClick={() => onChange(undefined)}>{common.clear}</button>}
            </div>
            {body}
          </div>,
          document.body,
          { open: isOpen, onClose: close, title: fmt(tt.filterColumn, { column: String(column.header) }), presentation: mobile ? 'sheet' : 'anchored', anchorRef },
        )}
    </>
  );
}
