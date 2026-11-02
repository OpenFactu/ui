import * as React from 'react';
import { UiIcon } from '../../icons';
import { useI18n } from '../../i18n/I18nProvider';
import { DropdownMenu } from '../DropdownMenu';
import { SearchInput } from '../SearchInput';
import { describeFilter, type TableFilterValue, type TableFilters } from '../internal/tableFilters';
import { colKeyOf } from './parts';
import type { TableColumn, TableDensity } from './types';

interface TableToolbarProps<T> {
  /** Vista de tarjetas: el recuento va en otro sitio y la densidad no se ofrece. */
  cards: boolean;
  searchable: boolean;
  search: string;
  onSearchChange: (query: string) => void;
  searchPlaceholder?: string;
  filteredInfo: string | null;
  densityToggle: boolean;
  density: TableDensity;
  onDensityChange: (density: TableDensity) => void;
  toolbar?: React.ReactNode;
  activeFilterColumns: TableColumn<T>[];
  filters: TableFilters;
  onFilterChange: (key: string, value: TableFilterValue | undefined) => void;
  onClearFilters: () => void;
}

/** Buscador, densidad, acciones propias y filtros activos. */
export function TableToolbar<T>({
  cards, searchable, search, onSearchChange, searchPlaceholder, filteredInfo, densityToggle, density, onDensityChange,
  toolbar, activeFilterColumns, filters, onFilterChange, onClearFilters,
}: TableToolbarProps<T>) {
  const { messages: m, format } = useI18n();
  const t = m.table;
  return (
    <div className="k-table-toolbar" data-cards={cards || undefined}>
      <div className="k-table-toolbar-row">
        {searchable && (
          <div className="k-table-search">
            <SearchInput
              value={search}
              onChange={onSearchChange}
              placeholder={searchPlaceholder ?? m.common.searchPlaceholder}
              aria-label={t.search}
              clearable
              shortcut={false}
              trailing={cards && filteredInfo ? <span className="k-table-results" aria-live="polite">{filteredInfo}</span> : undefined}
            />
          </div>
        )}
        <div className="k-table-toolbar-end">
          {filteredInfo && !cards && <span className="k-table-results" aria-live="polite">{filteredInfo}</span>}
          {/* En tarjetas la density no cambia nada: no se ofrece. */}
          {densityToggle && !cards && (
            <DropdownMenu
              align="end"
              className="k-table-tool"
              items={(['compact', 'normal', 'comfy'] as const).map((d) => ({
                label: t.density[d],
                icon: density === d ? <UiIcon slot="check" size={14} /> : <span className="inline-block w-[14px]" />,
                onClick: () => onDensityChange(d),
              }))}
            >
              <UiIcon slot="sliders-horizontal" size={14} />
              <span>{t.density[density]}</span>
            </DropdownMenu>
          )}
          {toolbar}
        </div>
      </div>
      {(activeFilterColumns.length > 0 || (cards && filteredInfo && !searchable)) && (
        <div className="k-table-chips" role="group" aria-label={t.activeFilters}>
          {activeFilterColumns.map((col) => (
            <span key={colKeyOf(col)} className="k-table-chip">
              <span className="k-table-chip-key">{col.header}:</span>
              <span className="k-table-chip-value">{describeFilter(col.filter!, filters[colKeyOf(col)], t)}</span>
              <button type="button" aria-label={format(t.removeFilter, { column: String(col.header) })} onClick={() => onFilterChange(colKeyOf(col), undefined)}>
                <UiIcon slot="x" size={12} />
              </button>
            </span>
          ))}
          {activeFilterColumns.length > 0 && <button type="button" className="k-table-clear" onClick={onClearFilters}>{t.clearFilters}</button>}
          {/* En tarjetas el recuento va aquí y no en una fila suelta. */}
          {cards && filteredInfo && !searchable && <span className="k-table-results k-table-results-end" aria-live="polite">{filteredInfo}</span>}
        </div>
      )}
    </div>
  );
}
