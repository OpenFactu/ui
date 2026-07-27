import * as React from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';

/** Estado de madurez de una sección. Se pinta como distintivo junto al nombre. */
export type NavStatus = 'beta' | 'alpha' | 'nuevo' | 'pronto';

export interface NavMenuItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  /**
   * Grupo al que pertenece. Los que lo comparten se pliegan bajo un
   * desplegable con ese nombre; los que no lo llevan quedan sueltos en la
   * barra, en el orden en que llegan.
   */
  group?: string;
  status?: NavStatus;
  /** Distintivo propio; si se indica sustituye al de `status`. */
  badge?: React.ReactNode;
  disabled?: boolean;
  /** Texto de ayuda bajo el nombre, solo dentro del desplegable. */
  description?: string;
}

export interface NavMenuProps {
  items: NavMenuItem[];
  /** Id del ítem activo. */
  value?: string;
  onChange: (id: string, item: NavMenuItem) => void;
  /**
   * Envoltorio de cada ítem, para pintar un `<Link>` del router en lugar de un
   * botón sin dejar de heredar estilos, teclado y accesibilidad.
   */
  renderItem?: (item: NavMenuItem, content: React.ReactNode) => React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
  'aria-label'?: string;
}

const STATUS_LABEL: Record<NavStatus, string> = {
  beta: 'BETA',
  alpha: 'ALPHA',
  nuevo: 'NUEVO',
  pronto: 'PRONTO',
};

const STATUS_CLASS: Record<NavStatus, string> = {
  beta: 'text-[var(--k-info-fg)] bg-[var(--k-info-bg)] border-[rgb(var(--k-info-rgb)/0.3)]',
  alpha:
    'text-[var(--k-warning-fg)] bg-[var(--k-warning-bg)] border-[rgb(var(--k-warning-rgb)/0.3)]',
  nuevo:
    'text-[var(--k-success-fg)] bg-[var(--k-success-bg)] border-[rgb(var(--k-success-rgb)/0.3)]',
  pronto: 'text-[var(--fg-subtle,#657486)] bg-[var(--bg-muted)] border-[var(--border-default)]',
};

const SIZES = {
  sm: { item: 'h-8 px-2.5 text-[12px] gap-1.5', icon: 12 },
  md: { item: 'h-9 px-3 text-[13px] gap-2', icon: 14 },
};

const StatusBadge: React.FC<{ status: NavStatus }> = ({ status }) => (
  <span
    className={cn(
      'shrink-0 rounded-[var(--k-radius-xs,2px)] border px-1 py-px font-mono text-[9px] font-semibold leading-none tracking-wider',
      STATUS_CLASS[status],
    )}
  >
    {STATUS_LABEL[status]}
  </span>
);

/** Lo que se muestra de un ítem: icono, nombre y distintivo. */
const ItemContent: React.FC<{ item: NavMenuItem }> = ({ item }) => (
  <>
    {item.icon && <span className="shrink-0">{item.icon}</span>}
    <span className="truncate">{item.label}</span>
    {item.badge ?? (item.status && <StatusBadge status={item.status} />)}
  </>
);

interface Grupo {
  name: string;
  items: NavMenuItem[];
}

/** Entrada de la barra: o un ítem suelto, o un grupo con desplegable. */
type Entrada = { kind: 'item'; item: NavMenuItem } | { kind: 'group'; group: Grupo };

/**
 * Agrupa conservando el orden de llegada: un grupo ocupa el sitio de su primer
 * ítem, de forma que reordenar el catálogo reordena la barra sin más.
 */
function agrupar(items: NavMenuItem[]): Entrada[] {
  const salida: Entrada[] = [];
  const porNombre = new Map<string, Grupo>();
  for (const item of items) {
    if (!item.group) {
      salida.push({ kind: 'item', item });
      continue;
    }
    const existente = porNombre.get(item.group);
    if (existente) {
      existente.items.push(item);
      continue;
    }
    const grupo: Grupo = { name: item.group, items: [item] };
    porNombre.set(item.group, grupo);
    salida.push({ kind: 'group', group: grupo });
  }
  return salida;
}

interface GrupoDesplegableProps {
  group: Grupo;
  value?: string;
  size: 'sm' | 'md';
  onChange: NavMenuProps['onChange'];
  renderItem?: NavMenuProps['renderItem'];
  /** Un menubar abierto sigue al ratón: pasar por otro grupo cambia el abierto. */
  abierto: boolean;
  onAbrir: () => void;
  onCerrar: () => void;
  onMoverBarra: (delta: number) => void;
  /** Con un grupo ya desplegado, pasar el ratón por otro cambia el abierto. */
  onHover: () => void;
  registrar: (el: HTMLButtonElement | null) => void;
}

const GrupoDesplegable: React.FC<GrupoDesplegableProps> = ({
  group,
  value,
  size,
  onChange,
  renderItem,
  abierto,
  onAbrir,
  onCerrar,
  onMoverBarra,
  onHover,
  registrar,
}) => {
  const [activo, setActivo] = React.useState(-1);
  const { anchorRef, popoverRef, style, ready } = usePopover<HTMLButtonElement>({
    open: abierto,
    onClose: onCerrar,
    preferredPlacement: 'bottom',
    align: 'start',
    offset: 6,
    minWidth: 200,
    // 'reposition' y no 'close': la barra se desplaza en horizontal, y al
    // pulsar un grupo que asoma por el borde el navegador lo trae a la vista
    // — un scroll que con 'close' cerraba el panel nada más abrirlo.
    scrollStrategy: 'reposition',
  });

  React.useEffect(() => {
    if (!abierto) setActivo(-1);
  }, [abierto]);

  const habilitados = group.items.filter((i) => !i.disabled);
  const contieneActivo = group.items.some((i) => i.id === value);

  const mover = (delta: number) => {
    setActivo((i) => {
      const n = habilitados.length;
      if (n === 0) return -1;
      if (i === -1) return delta === 1 ? 0 : n - 1;
      return (i + delta + n) % n;
    });
  };

  const elegir = (item: NavMenuItem) => {
    if (item.disabled) return;
    onCerrar();
    onChange(item.id, item);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (abierto) mover(1);
        else {
          // Abrir con la flecha deja marcado el primero, que es lo que espera
          // quien navega con teclado: si no, hace falta pulsarla dos veces.
          onAbrir();
          setActivo(0);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (abierto) mover(-1);
        break;
      case 'ArrowRight':
      case 'ArrowLeft':
        // Dentro de una barra de menús las flechas horizontales cambian de
        // grupo aunque haya uno desplegado.
        e.preventDefault();
        onMoverBarra(e.key === 'ArrowRight' ? 1 : -1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (abierto && activo >= 0) elegir(habilitados[activo]);
        else if (abierto) onCerrar();
        else onAbrir();
        break;
      case 'Home':
        if (abierto) {
          e.preventDefault();
          setActivo(0);
        }
        break;
      case 'End':
        if (abierto) {
          e.preventDefault();
          setActivo(habilitados.length - 1);
        }
        break;
      default:
    }
  };

  const panelId = `navmenu-${group.name.replace(/\s+/g, '-').toLowerCase()}`;

  return (
    <>
      <button
        ref={(el) => {
          anchorRef.current = el;
          registrar(el);
        }}
        type="button"
        role="menuitem"
        aria-haspopup="true"
        aria-expanded={abierto}
        aria-controls={abierto ? panelId : undefined}
        onClick={() => (abierto ? onCerrar() : onAbrir())}
        onMouseEnter={onHover}
        onKeyDown={onKeyDown}
        data-nav-group={group.name}
        className={cn(
          'inline-flex shrink-0 items-center rounded-[var(--k-radius-xs,2px)] font-medium transition-colors',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
          SIZES[size].item,
          contieneActivo || abierto
            ? 'text-accent bg-[rgb(var(--color-accent-rgb)/0.1)]'
            : 'text-[var(--fg-muted,#52606f)] hover:text-[var(--fg-default,#0a1628)] hover:bg-[var(--bg-hover)]',
        )}
      >
        {group.name}
        <ChevronDown
          size={SIZES[size].icon}
          className={cn('transition-transform duration-150', abierto && 'rotate-180')}
        />
      </button>

      {abierto &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={popoverRef}
            id={panelId}
            role="menu"
            aria-label={group.name}
            style={{ ...style, visibility: ready ? 'visible' : 'hidden' }}
            className="z-[var(--k-z-dropdown,99998)] min-w-[200px] overflow-hidden rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-1 shadow-lg"
          >
            {group.items.map((item) => {
              const idx = habilitados.indexOf(item);
              const contenido = (
                <>
                  <span className="flex min-w-0 flex-1 items-center gap-2">
                    <ItemContent item={item} />
                  </span>
                  {item.description && (
                    <span className="mt-0.5 block text-[11px] text-[var(--fg-subtle,#657486)]">
                      {item.description}
                    </span>
                  )}
                </>
              );
              const boton = (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  disabled={item.disabled}
                  onMouseEnter={() => setActivo(idx)}
                  onClick={() => elegir(item)}
                  className={cn(
                    'flex w-full flex-col rounded-[var(--k-radius-xs,2px)] px-2.5 py-1.5 text-left text-[13px] transition-colors focus-visible:outline-none',
                    item.id === value
                      ? 'bg-[rgb(var(--color-accent-rgb)/0.1)] text-accent'
                      : 'text-[var(--fg-body,#2d3a4a)]',
                    idx >= 0 && idx === activo && item.id !== value && 'bg-[var(--bg-hover)]',
                    item.disabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {contenido}
                </button>
              );
              return renderItem ? (
                <React.Fragment key={item.id}>{renderItem(item, boton)}</React.Fragment>
              ) : (
                boton
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
};

/**
 * Barra de navegación con grupos desplegables.
 *
 * Los ítems llegan planos y con un campo `group`; los que lo comparten se
 * pliegan solos bajo un desplegable. Es el mismo catálogo que ya describe cada
 * módulo, así que añadir una sección es añadir una fila — la barra no se toca.
 *
 * ```tsx
 * <NavMenu
 *   value={activa}
 *   onChange={(id) => navegar(id)}
 *   items={[
 *     { id: 'employees', label: 'Empleados' },
 *     { id: 'payrolls', label: 'Nóminas', group: 'Nóminas' },
 *     { id: 'timeclock', label: 'Mis fichajes', group: 'Tiempo y turnos', status: 'beta' },
 *   ]}
 * />
 * ```
 */
export const NavMenu: React.FC<NavMenuProps> = ({
  items,
  value,
  onChange,
  renderItem,
  size = 'md',
  className,
  'aria-label': ariaLabel = 'Navegación',
}) => {
  const entradas = React.useMemo(() => agrupar(items), [items]);
  const [abierto, setAbierto] = React.useState<string | null>(null);
  const botones = React.useRef<(HTMLButtonElement | null)[]>([]);

  const moverBarra = (desde: number, delta: number) => {
    const n = entradas.length;
    if (n === 0) return;
    const destino = (desde + delta + n) % n;
    const el = botones.current[destino];
    el?.focus();
    // Si ya había un desplegable abierto, se abre el del grupo al que se llega:
    // es como se comporta cualquier barra de menús del sistema.
    if (abierto !== null) {
      const entrada = entradas[destino];
      setAbierto(entrada.kind === 'group' ? entrada.group.name : null);
    }
  };

  return (
    <div
      role="menubar"
      aria-label={ariaLabel}
      className={cn(
        'flex items-center gap-1 overflow-x-auto',
        // El desplegable va portaleado, así que el scroll horizontal de la
        // barra no lo recorta.
        className,
      )}
    >
      {entradas.map((entrada, i) =>
        entrada.kind === 'group' ? (
          <GrupoDesplegable
            key={`g:${entrada.group.name}`}
            group={entrada.group}
            value={value}
            size={size}
            onChange={onChange}
            renderItem={renderItem}
            abierto={abierto === entrada.group.name}
            onAbrir={() => setAbierto(entrada.group.name)}
            onCerrar={() => setAbierto(null)}
            onMoverBarra={(delta) => moverBarra(i, delta)}
            onHover={() => abierto !== null && setAbierto(entrada.group.name)}
            registrar={(el) => {
              botones.current[i] = el;
            }}
          />
        ) : (
          <ItemSuelto
            key={entrada.item.id}
            item={entrada.item}
            value={value}
            size={size}
            onChange={onChange}
            renderItem={renderItem}
            onMoverBarra={(delta) => moverBarra(i, delta)}
            onEntrar={() => abierto !== null && setAbierto(null)}
            registrar={(el) => {
              botones.current[i] = el;
            }}
          />
        ),
      )}
    </div>
  );
};

interface ItemSueltoProps {
  item: NavMenuItem;
  value?: string;
  size: 'sm' | 'md';
  onChange: NavMenuProps['onChange'];
  renderItem?: NavMenuProps['renderItem'];
  onMoverBarra: (delta: number) => void;
  onEntrar: () => void;
  registrar: (el: HTMLButtonElement | null) => void;
}

const ItemSuelto: React.FC<ItemSueltoProps> = ({
  item,
  value,
  size,
  onChange,
  renderItem,
  onMoverBarra,
  onEntrar,
  registrar,
}) => {
  const activo = item.id === value;
  const boton = (
    <button
      ref={registrar}
      type="button"
      role="menuitem"
      disabled={item.disabled}
      aria-current={activo ? 'page' : undefined}
      onMouseEnter={onEntrar}
      onClick={() => !item.disabled && onChange(item.id, item)}
      onKeyDown={(e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        onMoverBarra(e.key === 'ArrowRight' ? 1 : -1);
      }}
      className={cn(
        'inline-flex shrink-0 items-center rounded-[var(--k-radius-xs,2px)] font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent',
        SIZES[size].item,
        activo
          ? 'bg-[rgb(var(--color-accent-rgb)/0.1)] text-accent'
          : 'text-[var(--fg-muted,#52606f)] hover:bg-[var(--bg-hover)] hover:text-[var(--fg-default,#0a1628)]',
        item.disabled && 'cursor-not-allowed opacity-40',
      )}
    >
      <ItemContent item={item} />
    </button>
  );
  return <>{renderItem ? renderItem(item, boton) : boton}</>;
};
