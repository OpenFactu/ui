import * as React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';
import { cn } from '../utils';
import { SkeletonList } from './Skeleton';
import { EmptyState, type EmptyStateProps } from './EmptyState';
import { densityClasses, type Density } from './internal/density';

export type ListDensity = Density;
export type ListVariant = 'plain' | 'divided' | 'bordered' | 'cards';
export type ListTone = 'default' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export interface ListAction {
  key?: string;
  icon: React.ReactNode;
  /** Obligatorio: los botones son solo icono, así que es su nombre accesible. */
  label: string;
  onClick: (event: React.MouseEvent) => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

export interface ListItemStatus {
  tone: ListTone;
  /** Con texto se pinta un chip; sin él, un punto de color. */
  label?: string;
}

export interface ListItemData {
  id: string | number;
  /** Bloque izquierdo. Prioridad: avatar > icon > status. */
  icon?: React.ReactNode;
  avatar?: React.ReactNode;
  status?: ListItemStatus;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  /** Texto largo; se recorta a dos líneas. */
  description?: React.ReactNode;
  /** Bloque derecho: importe, fecha, contador. */
  meta?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: ListAction[];
  /** Zona libre bajo el texto: barra de progreso, mensaje de error, chips. */
  content?: React.ReactNode;
  onClick?: (event: React.MouseEvent) => void;
  /** Ruta interna (`<Link>` de react-router) o URL absoluta (`<a>`). */
  href?: string;
  disabled?: boolean;
  /** Resalta la fila como no leída. */
  unread?: boolean;
  className?: string;
}

export interface ListSectionData {
  key: string;
  label?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: ListTone;
  /** Contenido a la derecha del encabezado: contador, total… */
  meta?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  emptyState?: React.ReactNode;
  items: ListItemData[];
}

const TONE_TEXT: Record<ListTone, string> = {
  default: 'text-[var(--fg-muted,#52606f)]',
  accent: 'text-accent',
  success: 'text-[var(--k-success-fg)]',
  warning: 'text-[var(--k-warning-fg)]',
  danger: 'text-[var(--k-danger-fg)]',
  info: 'text-[var(--k-info-fg)]',
};

const TONE_DOT: Record<ListTone, string> = {
  default: 'bg-[var(--k-ink-400)]',
  accent: 'bg-accent',
  success: 'bg-[var(--k-success)]',
  warning: 'bg-[var(--k-warning)]',
  danger: 'bg-[var(--k-danger)]',
  info: 'bg-[var(--k-info)]',
};

interface ListContextValue {
  density: ListDensity;
  variant: ListVariant;
  actionsVisibility: 'hover' | 'always';
  activeId?: string | number | null;
  selectable: boolean;
  selectedIds: Array<string | number>;
  toggleSelected?: (id: string | number) => void;
}

const ListCtx = React.createContext<ListContextValue>({
  density: 'normal',
  variant: 'divided',
  actionsVisibility: 'hover',
  selectable: false,
  selectedIds: [],
});

// ─────────────────────────────────────────────────────────────────────────

export interface ListItemProps extends Omit<ListItemData, 'id'> {
  id?: string | number;
  /** Sustituye el bloque izquierdo completo. */
  leading?: React.ReactNode;
  /** Sustituye el bloque derecho completo (meta + badge + acciones). */
  trailing?: React.ReactNode;
  active?: boolean;
  selected?: boolean;
  density?: ListDensity;
  variant?: ListVariant;
  /** Equivalente a `content`. */
  children?: React.ReactNode;
  /** Retardo de la animación de entrada. */
  delayMs?: number;
}

export const ListItem: React.FC<ListItemProps> = ({
  id,
  icon,
  avatar,
  status,
  title,
  subtitle,
  description,
  meta,
  badge,
  actions,
  content,
  onClick,
  href,
  disabled,
  unread,
  leading,
  trailing,
  active,
  selected,
  density: densityProp,
  variant: variantProp,
  children,
  delayMs,
  className,
}) => {
  const ctx = React.useContext(ListCtx);
  const density = densityProp ?? ctx.density;
  const variant = variantProp ?? ctx.variant;
  const spec = densityClasses[density];
  const isActive = active ?? (id !== undefined && ctx.activeId === id);
  const isSelected = selected ?? (id !== undefined && ctx.selectedIds.includes(id));
  const interactive = !!onClick || !!href;

  const leadingNode =
    leading ??
    (avatar ? (
      <span className="shrink-0">{avatar}</span>
    ) : icon ? (
      <span
        className={cn(
          'shrink-0 flex items-center justify-center',
          isActive ? 'text-accent' : 'text-[var(--fg-subtle,#657486)]',
        )}
      >
        {icon}
      </span>
    ) : status ? (
      status.label ? (
        <span
          className={cn(
            'shrink-0 rounded-[var(--k-radius-xs,2px)] px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider',
            TONE_TEXT[status.tone],
          )}
        >
          {status.label}
        </span>
      ) : (
        <span
          className={cn('shrink-0 h-1.5 w-1.5 rounded-full', TONE_DOT[status.tone])}
          aria-hidden
        />
      )
    ) : null);

  const body = (
    <>
      {leadingNode}
      <span className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="flex items-center gap-2 min-w-0">
          <span
            className={cn(
              'truncate',
              spec.text,
              isActive
                ? 'text-accent font-medium'
                : 'text-[var(--fg-default,#0a1628)]',
              unread && 'font-semibold',
            )}
          >
            {title}
          </span>
          {badge}
        </span>
        {subtitle && (
          <span className="truncate text-[11px] text-[var(--fg-muted,#52606f)]">
            {subtitle}
          </span>
        )}
        {description && (
          <span className="text-[11px] text-[var(--fg-muted,#52606f)] line-clamp-2">
            {description}
          </span>
        )}
        {(content ?? children) && <span className="block mt-1.5">{content ?? children}</span>}
      </span>
      {trailing ??
        (meta ? (
          <span className="shrink-0 text-[11px] font-mono text-[var(--fg-muted,#52606f)] tabular-nums">
            {meta}
          </span>
        ) : null)}
    </>
  );

  const rowClass = cn(
    'group relative flex items-center gap-3 w-full text-left transition-colors',
    spec.cell,
    variant === 'cards' &&
      'rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]',
    isActive && 'bg-accent/10 dark:bg-accent/15',
    !isActive && unread && 'bg-accent/5',
    !isActive && interactive && !disabled && 'hover:bg-[var(--k-surface)] dark:hover:bg-slate-800/50',
    isSelected && !isActive && 'bg-accent/5',
    disabled && 'opacity-50 pointer-events-none',
    className,
  );

  const style = delayMs !== undefined ? { animation: `k-row-in 0.35s ease-out ${delayMs}ms both` } : undefined;

  // Las acciones van FUERA del elemento interactivo: un <button> dentro de otro
  // <button> es HTML inválido y rompe la navegación por teclado.
  const actionsNode = actions?.length ? (
    <span
      className={cn(
        'shrink-0 flex items-center gap-0.5 transition-opacity',
        ctx.actionsVisibility === 'hover' &&
          'opacity-0 group-hover:opacity-100 focus-within:opacity-100',
      )}
    >
      {actions.map((action, i) => (
        <button
          key={action.key ?? i}
          type="button"
          aria-label={action.label}
          title={action.label}
          disabled={action.disabled}
          onClick={(e) => {
            e.stopPropagation();
            action.onClick(e);
          }}
          className={cn(
            'p-1 rounded-[var(--k-radius-xs,2px)] transition-colors disabled:opacity-40 disabled:pointer-events-none',
            action.tone === 'danger'
              ? 'text-[var(--fg-subtle,#657486)] hover:text-[var(--k-danger-fg)] hover:bg-rose-50 dark:hover:bg-rose-500/10'
              : 'text-[var(--fg-subtle,#657486)] hover:text-accent hover:bg-[var(--k-line-2)] dark:hover:bg-slate-800',
          )}
        >
          {action.icon}
        </button>
      ))}
    </span>
  ) : null;

  const selectionBox =
    ctx.selectable && id !== undefined ? (
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => ctx.toggleSelected?.(id)}
        onClick={(e) => e.stopPropagation()}
        aria-label="Seleccionar elemento"
        className="shrink-0 h-3.5 w-3.5 accent-[color:var(--color-accent)] cursor-pointer"
      />
    ) : null;

  const inner = href ? (
    href.startsWith('/') ? (
      <Link to={href} className={cn(rowClass, 'flex-1')} onClick={onClick}>
        {body}
      </Link>
    ) : (
      <a href={href} className={cn(rowClass, 'flex-1')} onClick={onClick}>
        {body}
      </a>
    )
  ) : onClick ? (
    <button type="button" onClick={onClick} disabled={disabled} className={cn(rowClass, 'flex-1')}>
      {body}
    </button>
  ) : (
    <div className={cn(rowClass, 'flex-1')}>{body}</div>
  );

  return (
    <li
      style={style}
      className={cn(
        'group relative flex items-center',
        isActive && 'border-l-2 border-accent',
        variant === 'cards' && 'mb-2 last:mb-0',
      )}
    >
      {selectionBox && <span className={cn('pl-4 flex items-center')}>{selectionBox}</span>}
      {inner}
      {actionsNode && <span className="pr-3 flex items-center">{actionsNode}</span>}
    </li>
  );
};

// ─────────────────────────────────────────────────────────────────────────

export interface ListSectionProps extends Omit<ListSectionData, 'items' | 'key'> {
  children: React.ReactNode;
}

export const ListSection: React.FC<ListSectionProps> = ({
  label,
  icon,
  tone = 'default',
  meta,
  collapsible = false,
  defaultOpen = true,
  children,
}) => {
  const [open, setOpen] = React.useState(defaultOpen);
  const header = (label || icon || meta) && (
    <div className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-muted,#fafbfc)] border-b border-[var(--border-subtle,#f1f5f9)]">
      {icon && <span className={cn('shrink-0', TONE_TEXT[tone])}>{icon}</span>}
      <span
        className={cn(
          'flex-1 text-[10px] font-mono font-semibold uppercase tracking-[1.5px]',
          TONE_TEXT[tone],
        )}
      >
        {label}
      </span>
      {meta && (
        <span className="text-[11px] font-mono text-[var(--fg-subtle,#657486)]">
          {meta}
        </span>
      )}
      {collapsible && (
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-[var(--fg-subtle,#657486)] transition-transform',
            !open && '-rotate-90',
          )}
        />
      )}
    </div>
  );

  return (
    <div>
      {collapsible && header ? (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="w-full text-left"
        >
          {header}
        </button>
      ) : (
        header
      )}
      {open && children}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────

export interface ListProps {
  /** Modo plano. Excluyente con `sections`. */
  items?: ListItemData[];
  /** Modo agrupado por secciones. */
  sections?: ListSectionData[];
  density?: ListDensity;
  variant?: ListVariant;
  /** Elemento resaltado (selección simple, tipo navegación). */
  activeId?: string | number | null;
  /** Activa las casillas de selección múltiple. */
  selectable?: boolean;
  selectedIds?: Array<string | number>;
  onSelectionChange?: (ids: Array<string | number>) => void;
  actionsVisibility?: 'hover' | 'always';
  isLoading?: boolean;
  skeletonCount?: number;
  /** Nodo propio, o las props del `EmptyState` de la librería. */
  emptyState?: React.ReactNode | EmptyStateProps;
  maxHeight?: number | string;
  /** Entrada escalonada de las filas, como en Table. Default true. */
  staggerAnimation?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  /** Sustituye el renderizado de cada fila. */
  renderItem?: (item: ListItemData, index: number) => React.ReactNode;
  className?: string;
  itemClassName?: string;
  'aria-label'?: string;
  /** API de composición: `<List><List.Item …/></List>`. */
  children?: React.ReactNode;
}

function isEmptyStateProps(value: unknown): value is EmptyStateProps {
  return !!value && typeof value === 'object' && 'title' in (value as object);
}

const ListRoot: React.FC<ListProps> = ({
  items,
  sections,
  density = 'normal',
  variant = 'divided',
  activeId,
  selectable = false,
  selectedIds,
  onSelectionChange,
  actionsVisibility = 'hover',
  isLoading = false,
  skeletonCount = 5,
  emptyState,
  maxHeight,
  staggerAnimation = true,
  header,
  footer,
  renderItem,
  className,
  itemClassName,
  children,
  ...rest
}) => {
  const [internalSelected, setInternalSelected] = React.useState<Array<string | number>>([]);
  const selected = selectedIds ?? internalSelected;

  const toggleSelected = React.useCallback(
    (id: string | number) => {
      const next = selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id];
      if (selectedIds === undefined) setInternalSelected(next);
      onSelectionChange?.(next);
    },
    [selected, selectedIds, onSelectionChange],
  );

  const ctx = React.useMemo<ListContextValue>(
    () => ({ density, variant, actionsVisibility, activeId, selectable, selectedIds: selected, toggleSelected }),
    [density, variant, actionsVisibility, activeId, selectable, selected, toggleSelected],
  );

  const allItems = sections ? sections.flatMap((s) => s.items) : items ?? [];
  const hasContent = !!children || allItems.length > 0;

  const listClass = cn(
    'w-full',
    variant === 'divided' && 'divide-y divide-[var(--border-subtle,#f1f5f9)]',
    variant === 'bordered' &&
      'border border-[var(--border-default,#e2e8f0)] rounded-[var(--k-radius-sm,4px)] divide-y divide-[var(--border-subtle,#f1f5f9)] overflow-hidden',
  );

  const renderRows = (rows: ListItemData[], offset = 0) =>
    rows.map((item, i) =>
      renderItem ? (
        <React.Fragment key={item.id}>{renderItem(item, offset + i)}</React.Fragment>
      ) : (
        <ListItem
          key={item.id}
          {...item}
          className={cn(itemClassName, item.className)}
          delayMs={staggerAnimation ? Math.min((offset + i) * 20, 300) : undefined}
        />
      ),
    );

  const emptyNode = isEmptyStateProps(emptyState) ? (
    <EmptyState {...emptyState} />
  ) : (
    emptyState ?? <EmptyState title="Sin resultados" />
  );

  return (
    <ListCtx.Provider value={ctx}>
      <div
        className={cn(
          variant === 'bordered' &&
            'border border-[var(--border-default,#e2e8f0)] rounded-[var(--k-radius-sm,4px)] overflow-hidden',
          className,
        )}
      >
        {header && (
          <div className="px-4 py-2 border-b border-[var(--border-default,#e2e8f0)]">
            {header}
          </div>
        )}
        <div
          style={maxHeight ? { maxHeight, overflowY: 'auto' } : undefined}
          className={maxHeight ? 'overflow-y-auto' : undefined}
        >
          {isLoading ? (
            <SkeletonList
              rows={skeletonCount}
              density={density}
              variant={variant === 'cards' ? 'plain' : variant === 'bordered' ? 'divided' : variant}
              showActions={actionsVisibility === 'always'}
            />
          ) : !hasContent ? (
            emptyNode
          ) : sections ? (
            sections.map(({ key, items: sectionItems, ...sectionProps }) => (
              <ListSection key={key} {...sectionProps}>
                {sectionItems.length === 0 ? (
                  sectionProps.emptyState ?? null
                ) : (
                  <ul
                    role="list"
                    className={cn(listClass, variant === 'bordered' && 'border-0 rounded-none')}
                    {...rest}
                  >
                    {renderRows(sectionItems)}
                  </ul>
                )}
              </ListSection>
            ))
          ) : (
            <ul
              role="list"
              className={cn(listClass, variant === 'bordered' && 'border-0 rounded-none')}
              {...rest}
            >
              {children ?? renderRows(items ?? [])}
            </ul>
          )}
        </div>
        {footer && (
          <div className="px-4 py-2 border-t border-[var(--border-default,#e2e8f0)]">
            {footer}
          </div>
        )}
      </div>
    </ListCtx.Provider>
  );
};

type ListComponent = React.FC<ListProps> & {
  Item: typeof ListItem;
  Section: typeof ListSection;
};

export const List = ListRoot as ListComponent;
List.Item = ListItem;
List.Section = ListSection;
