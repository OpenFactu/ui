import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useIsMobile } from '../hooks/useMediaQuery';
import { useAnimatedPresence } from '../hooks/useAnimatedPresence';
import { DropdownMenu } from './DropdownMenu';

export interface SelectionBarAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface SelectionBarProps {
  /** Cuántos elementos hay seleccionados. Con 0 la barra sale (animada) y deja de ocupar sitio. */
  count: number;
  actions: SelectionBarAction[];
  /** La X: vaciar la selección. */
  onClear: () => void;
  /** Ofrece «Seleccionar los N» cuando solo está marcada una parte (la página de una tabla, por ejemplo). */
  selectAll?: { total: number; onSelect: () => void; label?: React.ReactNode };
  /** Texto del recuento. Default «1 seleccionado» / «N seleccionados». */
  countLabel?: (count: number) => React.ReactNode;
  /** Cuántas acciones caben a la vista; el resto va a «Más». Default 4 en escritorio y 1 en móvil. */
  maxInline?: number;
  /**
   * `sticky` (por defecto): pegada al pie de su contenedor mientras se desplaza. `fixed`: al pie de la ventana.
   * En móvil siempre va al pie de la ventana, a todo el ancho, por encima de la zona segura.
   */
  position?: 'sticky' | 'fixed';
  'aria-label'?: string;
  className?: string;
}

const defaultCount = (n: number) => (n === 1 ? '1 seleccionado' : `${n} seleccionados`);

/**
 * Barra flotante de acciones sobre una selección: recuento, «Seleccionar los N», acciones (las que no caben, en
 * «Más») y la X para vaciar. Sirve para tablas, listas, galerías o tableros: no sabe de dónde sale la selección.
 *
 * ```tsx
 * <SelectionBar
 *   count={seleccion.size}
 *   onClear={() => setSeleccion(new Set())}
 *   actions={[{ label: 'Exportar', onClick: exportar }, { label: 'Eliminar', destructive: true, onClick: eliminar }]}
 * />
 * ```
 */
export const SelectionBar: React.FC<SelectionBarProps> = ({
  count,
  actions,
  onClear,
  selectAll,
  countLabel = defaultCount,
  maxInline,
  position = 'sticky',
  'aria-label': ariaLabel = 'Acciones sobre la selección',
  className,
}) => {
  const mobile = useIsMobile();
  const { mounted, state, ref } = useAnimatedPresence({ open: count > 0, role: 'exit' });
  // Mientras sale conserva el último recuento: si no, se vería «0 seleccionados» al desaparecer.
  const shown = React.useRef(count);
  if (count > 0) shown.current = count;
  if (!mounted) return null;

  const inline = maxInline ?? (mobile ? 1 : 4);
  const visible = actions.slice(0, inline);
  const overflow = actions.slice(inline);
  // En móvil «Seleccionar los N» también pasa al menú: en una fila de 360 px no cabe todo.
  const selectAllInMenu = Boolean(selectAll) && mobile;
  const menu = [
    ...(selectAll && selectAllInMenu ? [{ label: typeof selectAll.label === 'string' ? selectAll.label : `Seleccionar los ${selectAll.total}`, onClick: selectAll.onSelect }] : []),
    ...overflow.map((a, i) => ({ label: a.label, icon: a.icon, onClick: a.onClick, destructive: a.destructive, disabled: a.disabled, separatorBefore: i === 0 && selectAllInMenu })),
  ];

  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      role="toolbar"
      aria-label={ariaLabel}
      data-state={state}
      data-position={mobile ? 'fixed' : position}
      className={cn('k-selection-bar', className)}
      onKeyDown={(event) => {
        const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
        if (!keys.includes(event.key)) return;
        const items = [...event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), [role="button"]')];
        const at = items.indexOf(document.activeElement as HTMLElement);
        if (at < 0) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (at + (event.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length;
        items[next]?.focus();
      }}
    >
      <button type="button" className="k-selection-bar-close" aria-label="Quitar la selección" onClick={onClear}>
        <UiIcon slot="x" size={16} />
      </button>
      <span className="k-selection-bar-count" aria-live="polite">{countLabel(shown.current)}</span>
      {selectAll && !selectAllInMenu && (
        <button type="button" className="k-selection-bar-all" onClick={selectAll.onSelect}>
          {selectAll.label ?? `Seleccionar los ${selectAll.total}`}
        </button>
      )}
      <span className="k-selection-bar-sep" aria-hidden="true" />
      <div className="k-selection-bar-actions">
        {visible.map((action) => (
          <button
            key={action.label}
            type="button"
            className="k-selection-bar-action"
            data-destructive={action.destructive || undefined}
            disabled={action.disabled}
            onClick={action.onClick}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
        {menu.length > 0 && (
          <DropdownMenu items={menu} align="end" className="k-selection-bar-action k-selection-bar-more">
            <UiIcon slot="more-horizontal" size={16} />
            <span className="sr-only">Más acciones</span>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
};
