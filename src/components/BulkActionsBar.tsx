import * as React from 'react';
import { cn } from '../utils';

export interface BulkActionsBarProps {
  /** Cantidad de filas seleccionadas. Si es 0, el componente no renderiza nada. */
  count: number;
  /** Callback para limpiar la selección. */
  onClear?: () => void;
  /** Acciones (botones, dropdowns) a la derecha. */
  children?: React.ReactNode;
  /** Texto del label, default "seleccionados". Permite localización. */
  label?: string;
  className?: string;
}

/**
 * Barra que aparece encima de una Table cuando hay filas seleccionadas.
 * Muestra el conteo, un botón para deseleccionar todo y un slot para acciones bulk.
 *
 * Uso típico:
 * ```tsx
 * <BulkActionsBar count={selected.size} onClear={() => setSelected(new Set())}>
 *   <Button onClick={onDelete}>Eliminar</Button>
 *   <Button onClick={onExport}>Exportar</Button>
 * </BulkActionsBar>
 * ```
 */
export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  count,
  onClear,
  children,
  label = 'seleccionados',
  className,
}) => {
  if (count === 0) return null;

  return (
    <div
      className={cn(
        'sticky top-0 z-20 flex flex-wrap items-center gap-3 px-4 py-2',
        'bg-[var(--bg-muted,#f1f5f9)] border-b border-[var(--border-default,#e2e8f0)]',
        'text-sm font-medium text-[var(--fg-default,#0a1628)]',
        'animate-in fade-in slide-in-from-top-1 duration-150',
        className,
      )}
    >
      <span role="status" className="font-bold tabular-nums">
        {count} <span className="font-normal opacity-80">{label}</span>
      </span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-xs underline text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-default,#0a1628)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Deseleccionar
        </button>
      )}
      <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
};
