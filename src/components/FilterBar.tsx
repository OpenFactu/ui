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

interface FilterBarProps {
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
}: FilterBarProps) {
  const hayFiltros =
    Boolean(searchTerm) ||
    Object.values(activeFilters).some((v) => v !== '' && v !== null && v !== undefined);

  return (
    <div
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
    </div>
  );
}
