import { Search, Filter, X } from 'lucide-react';
import { cn } from '../utils';

export interface FilterBarConfig {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date';
  options?: { label: string; value: any }[];
  placeholder?: string;
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
}

const inputCls =
  'h-9 px-3 bg-white dark:bg-slate-900 border border-[var(--k-line)] dark:border-slate-700 rounded-[2px] text-[12px] font-medium text-[var(--k-ink-700)] dark:text-slate-200 focus:outline-none focus:border-accent hover:border-[var(--k-ink-400)] transition-colors';

export function FilterBar({
  searchTerm,
  onSearchChange,
  activeFilters,
  onFilterChange,
  onClear,
  config,
  className,
  searchPlaceholder = 'Buscar registros...',
}: FilterBarProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3 p-4 bg-white dark:bg-slate-900 border-b border-[var(--k-line)] dark:border-slate-800',
        className,
      )}
    >
      {/* Global Search */}
      <div className="relative flex-none w-full md:w-96">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--k-ink-400)] dark:text-slate-500"
          size={14}
        />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className={cn(inputCls, 'w-full pl-9')}
        />
      </div>

      {/* Dynamic Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {config.map((filter) => (
          <div key={filter.key} className="relative">
            {filter.type === 'select' ? (
              <select
                value={activeFilters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                className={cn(inputCls, 'pr-8 appearance-none cursor-pointer min-w-[120px]')}
              >
                <option value="">{filter.label}</option>
                {filter.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : filter.type === 'date' ? (
              <input
                type="date"
                value={activeFilters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                className={cn(inputCls, 'cursor-pointer')}
              />
            ) : (
              <input
                type="text"
                value={activeFilters[filter.key] || ''}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
                placeholder={filter.label}
                className={cn(inputCls, 'min-w-[120px]')}
              />
            )}

            {filter.type === 'select' && (
              <Filter
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--k-ink-400)] dark:text-slate-600 pointer-events-none"
                size={12}
              />
            )}
          </div>
        ))}

        {(searchTerm || Object.values(activeFilters).some((v) => v !== '')) && (
          <button
            onClick={onClear}
            className="inline-flex items-center gap-1.5 px-3 h-9 text-[11px] font-mono font-medium text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-rose-500/10 rounded-[2px] transition-colors uppercase tracking-[1px]"
          >
            <X size={12} />
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
}
