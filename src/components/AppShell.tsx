import * as React from 'react';
import { Menu, PanelLeftClose, PanelLeftOpen, X } from 'lucide-react';
import { cn } from '../utils';
import { useIsNarrow } from '../hooks/useMediaQuery';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { useScrollLock } from '../hooks/useScrollLock';
import { useEscapeStack } from '../internal/escapeStack';

export interface AppShellSidebarState {
  collapsed: boolean;
  mobile: boolean;
  close: () => void;
}
type SidebarSlot = React.ReactNode | ((state: AppShellSidebarState) => React.ReactNode);

export interface AppShellProps {
  brand: React.ReactNode;
  compactBrand?: React.ReactNode;
  sidebar: SidebarSlot;
  sidebarFooter?: SidebarSlot;
  header?: React.ReactNode;
  children: React.ReactNode;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  sidebarWidth?: number;
  collapsedWidth?: number;
  /** Altura del espacio de trabajo. El contenido tiene scroll independiente. */
  height?: React.CSSProperties['height'];
  navigationLabel?: string;
  className?: string;
  contentClassName?: string;
}

/** Marco de aplicación con navegación plegable y menú modal en móvil. Sin router propio. */
export function AppShell({
  brand,
  compactBrand,
  sidebar,
  sidebarFooter,
  header,
  children,
  collapsed: controlledCollapsed,
  defaultCollapsed = false,
  onCollapsedChange,
  sidebarWidth = 240,
  collapsedWidth = 72,
  height = '100dvh',
  navigationLabel = 'Navegación principal',
  className,
  contentClassName,
}: AppShellProps) {
  const mobile = useIsNarrow(768);
  const [internalCollapsed, setInternalCollapsed] = React.useState(defaultCollapsed);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const collapsed = !mobile && (controlledCollapsed ?? internalCollapsed);
  const dialogRef = React.useRef<HTMLElement>(null);
  const mainId = React.useId();
  const sidebarId = React.useId();
  const dialogOpen = mobile && menuOpen;
  const close = React.useCallback(() => setMenuOpen(false), []);
  useFocusTrap(dialogRef, { enabled: dialogOpen });
  useScrollLock(dialogOpen);
  useEscapeStack(sidebarId, dialogOpen, close);
  React.useEffect(() => {
    if (!mobile) setMenuOpen(false);
  }, [mobile]);
  const toggle = () => {
    if (mobile) {
      setMenuOpen(true);
      return;
    }
    if (controlledCollapsed === undefined) setInternalCollapsed(!collapsed);
    onCollapsedChange?.(!collapsed);
  };
  const renderSlot = (slot: SidebarSlot) =>
    typeof slot === 'function' ? slot({ collapsed, mobile, close }) : slot;
  return (
    <div
      className={cn(
        'relative isolate flex w-full min-w-0 overflow-hidden bg-[var(--bg-app,#fafbfc)] font-sans text-[var(--fg-default,#0a1628)]',
        className,
      )}
      style={{ height }}
    >
      <a
        href={`#${mainId}`}
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-sm focus:bg-[var(--bg-card,#ffffff)] focus:p-3"
      >
        Saltar al contenido
      </a>
      {dialogOpen && (
        <div aria-hidden="true" onClick={close} className="fixed inset-0 z-40 bg-black/40" />
      )}
      {(!mobile || dialogOpen) && (
        <aside
          ref={dialogRef}
          id={sidebarId}
          role={mobile ? 'dialog' : undefined}
          aria-modal={mobile ? true : undefined}
          aria-label={navigationLabel}
          tabIndex={mobile ? -1 : undefined}
          className={cn(
            'flex shrink-0 flex-col border-r border-[var(--border-default,#e2e8f0)] bg-[var(--bg-sidebar,#0a1628)] text-[var(--sidebar-fg,#ffffff)]',
            mobile && 'fixed inset-y-0 left-0 z-50 shadow-k-overlay',
          )}
          style={{
            width: mobile
              ? `min(${sidebarWidth}px, 85vw)`
              : collapsed
                ? collapsedWidth
                : sidebarWidth,
          }}
        >
          <div className="flex min-h-16 shrink-0 items-center justify-between gap-2 border-b border-[var(--sidebar-hover,#202a3b)] px-4">
            <div className="min-w-0 overflow-hidden">
              {collapsed ? (compactBrand ?? brand) : brand}
            </div>
            {mobile && (
              <button
                type="button"
                onClick={close}
                aria-label="Cerrar navegación"
                className="shrink-0 rounded-sm p-2 focus-visible:ring-2 focus-visible:ring-current"
              >
                <X size={18} />
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3">{renderSlot(sidebar)}</div>
          {sidebarFooter && (
            <div className="shrink-0 border-t border-[var(--sidebar-hover,#202a3b)] p-3">
              {renderSlot(sidebarFooter)}
            </div>
          )}
        </aside>
      )}
      <div className="flex min-w-0 flex-1 flex-col" inert={dialogOpen || undefined}>
        <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-4">
          <button
            type="button"
            onClick={toggle}
            aria-label={
              mobile ? 'Abrir navegación' : collapsed ? 'Expandir navegación' : 'Plegar navegación'
            }
            aria-expanded={mobile ? menuOpen : !collapsed}
            aria-controls={!mobile || menuOpen ? sidebarId : undefined}
            className="shrink-0 rounded-[var(--k-radius-xs,2px)] p-2 text-[var(--fg-muted,#52606f)] hover:bg-[var(--bg-hover,#f1f5f9)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {mobile ? (
              <Menu size={18} />
            ) : collapsed ? (
              <PanelLeftOpen size={18} />
            ) : (
              <PanelLeftClose size={18} />
            )}
          </button>
          <div className="flex min-w-0 flex-1 items-center justify-between gap-3">{header}</div>
        </header>
        <main
          id={mainId}
          tabIndex={-1}
          className={cn(
            'min-h-0 min-w-0 flex-1 overflow-auto p-4 outline-none md:p-6',
            contentClassName,
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
