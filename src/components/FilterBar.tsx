import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';
import { DatePicker } from './DatePicker';
import { Input } from './Input';
import { SearchInput } from './SearchInput';
import { Select } from './Select';
import { SearchableSelect } from './SearchableSelect';

export interface FilterBarConfig {
  key: string;
  label: string;
  /**
   * `search-select` es un desplegable con buscador, para listas largas
   * (interlocutores, artículos, plan contable).
   */
  type: 'text' | 'select' | 'search-select' | 'date';
  options?: { label: string; value: any }[];
  placeholder?: string;
  /** Ancho del control en píxeles. Default 160. */
  width?: number;
}

export interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeFilters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClear: () => void;
  config: FilterBarConfig[];
  className?: string;
  searchPlaceholder?: string;
  /** Atajo que enfoca el buscador. Default 'mod+k'. `false` lo desactiva. */
  shortcut?: 'mod+k' | 'ctrl+k' | '/' | false;
  /** Fila de chips para retirar cada filtro sin perder el resto. */
  showActiveFilters?: boolean;
  /** Acciones de vista: exportación, densidad, etc. */
  actions?: React.ReactNode;
  /** Total después de aplicar filtros; se anuncia al cambiar. */
  resultCount?: number;
  ariaLabel?: string;
}

/**
 * Barra de búsqueda y filtros.
 *
 * Usa los controles de la librería, no los nativos: las opciones de un
 * `<select>` del sistema las pinta el sistema operativo y no hay forma de
 * tematizarlas —en modo oscuro se ven como de otra aplicación—, y un
 * `<input type="date">` abre el calendario del navegador, distinto en cada uno.
 */
export function FilterBar({
  searchTerm,
  onSearchChange,
  activeFilters,
  onFilterChange,
  onClear,
  config,
  className,
  searchPlaceholder = 'Buscar registros...',
  shortcut = 'mod+k',
  showActiveFilters = false,
  actions,
  resultCount,
  ariaLabel = 'Filtros de registros',
}: FilterBarProps) {
  const hayFiltros =
    Boolean(searchTerm) ||
    Object.values(activeFilters).some((v) => v !== '' && v !== null && v !== undefined);

  return (
    <div
      role="search"
      aria-label={ariaLabel}
      className={cn(
        'flex flex-wrap items-center gap-3 p-4 bg-[var(--bg-card,#ffffff)] border-b border-[var(--border-default,#e2e8f0)]',
        className,
      )}
    >
      <div className="flex-none w-full md:w-96">
        <SearchInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          shortcut={shortcut}
          clearable
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {config.map((filter) => {
          const valor = activeFilters[filter.key] ?? '';
          const ancho = { width: filter.width ?? 160 };

          if (filter.type === 'select') {
            return (
              <div key={filter.key} style={ancho}>
                <Select
                  value={String(valor)}
                  ariaLabel={filter.label}
                  onChange={(v) => onFilterChange(filter.key, v)}
                  placeholder={filter.label}
                  options={[
                    { value: '', label: filter.label },
                    ...(filter.options ?? []).map((o) => ({
                      value: String(o.value),
                      label: o.label,
                    })),
                  ]}
                />
              </div>
            );
          }

          if (filter.type === 'search-select') {
            return (
              <div key={filter.key} style={ancho}>
                <SearchableSelect
                  ariaLabel={filter.label}
                  value={String(valor)}
                  onChange={(v) => onFilterChange(filter.key, v)}
                  placeholder={filter.placeholder ?? filter.label}
                  clearable
                  options={(filter.options ?? []).map((o) => ({
                    value: String(o.value),
                    label: o.label,
                  }))}
                />
              </div>
            );
          }

          if (filter.type === 'date') {
            return (
              <div key={filter.key} style={ancho}>
                <DatePicker
                  ariaLabel={filter.label}
                  value={valor || null}
                  onChange={(v) => onFilterChange(filter.key, v ?? '')}
                  placeholder={filter.placeholder ?? filter.label}
                />
              </div>
            );
          }

          return (
            <div key={filter.key} style={ancho}>
              <Input
                value={valor}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                placeholder={filter.placeholder ?? filter.label}
                aria-label={filter.label}
              />
            </div>
          );
        })}

        {hayFiltros && (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 h-9 text-[11px] font-mono font-medium text-[var(--k-danger-fg)] hover:bg-[var(--k-danger-bg)] rounded-[var(--k-radius-xs,2px)] transition-colors uppercase tracking-[1px]"
          >
            <X size={12} />
            Limpiar
          </button>
        )}
      </div>
      {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      {(resultCount !== undefined || (showActiveFilters && hayFiltros)) && (
        <div className="flex w-full flex-wrap items-center gap-2 text-[12px] text-[var(--fg-muted,#52606f)]">
          {resultCount !== undefined && (
            <span role="status" className="mr-1 tabular-nums">
              {resultCount} {resultCount === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
          {showActiveFilters &&
            config
              .filter((filter) => {
                const value = activeFilters[filter.key];
                return value !== '' && value !== null && value !== undefined;
              })
              .map((filter) => {
                const value = activeFilters[filter.key];
                const label =
                  filter.options?.find((option) => String(option.value) === String(value))?.label ??
                  String(value);
                return (
                  <button
                    key={filter.key}
                    type="button"
                    onClick={() => onFilterChange(filter.key, '')}
                    aria-label={`Quitar filtro ${filter.label}: ${label}`}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-muted,#f1f5f9)] px-2 py-1 hover:border-[var(--border-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                  >
                    <span className="truncate">
                      {filter.label}:{' '}
                      <span className="font-medium text-[var(--fg-default,#0a1628)]">{label}</span>
                    </span>
                    <X size={12} aria-hidden="true" className="shrink-0" />
                  </button>
                );
              })}
        </div>
      )}
    </div>
  );
}
