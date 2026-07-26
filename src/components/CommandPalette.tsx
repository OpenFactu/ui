import * as React from 'react';
import { createPortal } from 'react-dom';
import { CornerDownLeft, Search } from 'lucide-react';
import { cn } from '../utils';
import { useScrollLock } from '../hooks/useScrollLock';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export interface CommandItem {
  id: string;
  label: string;
  /** Segunda línea: ruta, descripción o contexto. */
  description?: string;
  icon?: React.ReactNode;
  /** Atajo que se muestra a la derecha (`['Ctrl', 'S']`). */
  shortcut?: string[];
  /** Texto extra por el que también debe encontrarse (sinónimos, código). */
  keywords?: string;
  onSelect: () => void;
  disabled?: boolean;
}

export interface CommandSection {
  key: string;
  label?: string;
  icon?: React.ReactNode;
  items: CommandItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  /** Resultados ya agrupados. Con `onSearch` los calcula el consumidor. */
  sections: CommandSection[];
  /** Modo servidor: se llama con el término y NO se filtra en cliente. */
  onSearch?: (term: string) => void;
  debounceMs?: number;
  loading?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  /** Texto de ayuda del pie. `false` lo oculta. */
  footerHint?: React.ReactNode | false;
  className?: string;
}

/** Aplana las secciones para que el teclado recorra una sola lista. */
function flatten(sections: CommandSection[]): CommandItem[] {
  return sections.flatMap((s) => s.items.filter((i) => !i.disabled));
}

function matches(item: CommandItem, term: string): boolean {
  if (!term) return true;
  const haystack = `${item.label} ${item.description ?? ''} ${item.keywords ?? ''}`.toLowerCase();
  // Todas las palabras deben aparecer, en cualquier orden: «fac acme» encuentra
  // «Factura de Acme» sin obligar a teclearlo seguido.
  return term
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => haystack.includes(word));
}

/**
 * Paleta de comandos: buscar y ejecutar sin soltar el teclado.
 *
 * Se abre desde fuera (`open`), de modo que el atajo lo decide la aplicación;
 * {@link useCommandPalette} trae uno ya montado si no quieres pensarlo.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  sections,
  onSearch,
  debounceMs = 200,
  loading = false,
  placeholder = 'Buscar o ejecutar…',
  emptyMessage = 'Sin resultados',
  footerHint,
  className,
}) => {
  const [term, setTerm] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const debounced = useDebouncedValue(term, debounceMs);

  useScrollLock(open);

  React.useEffect(() => {
    if (!onSearch) return;
    onSearch(debounced);
  }, [debounced, onSearch]);

  React.useEffect(() => {
    if (open) {
      setTerm('');
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Con `onSearch` el filtrado es del consumidor.
  const visible = React.useMemo<CommandSection[]>(() => {
    if (onSearch) return sections;
    return sections
      .map((s) => ({ ...s, items: s.items.filter((i) => matches(i, term)) }))
      .filter((s) => s.items.length > 0);
  }, [sections, term, onSearch]);

  const flat = React.useMemo(() => flatten(visible), [visible]);

  React.useEffect(() => setActiveIndex(0), [visible]);

  React.useEffect(() => {
    listRef.current
      ?.querySelector(`[data-cmd-index="${activeIndex}"]`)
      ?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const run = (item: CommandItem) => {
    onClose();
    item.onSelect();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => (flat.length ? (i + 1) % flat.length : 0));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => (flat.length ? (i - 1 + flat.length) % flat.length : 0));
        break;
      case 'Home':
        event.preventDefault();
        setActiveIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setActiveIndex(Math.max(0, flat.length - 1));
        break;
      case 'Enter': {
        event.preventDefault();
        const item = flat[activeIndex];
        if (item) run(item);
        break;
      }
      case 'Escape':
        event.preventDefault();
        onClose();
        break;
    }
  };

  if (!open || typeof document === 'undefined') return null;

  let index = -1;

  return createPortal(
    <div
      className="fixed inset-0 z-[var(--k-z-modal,99999)] flex items-start justify-center p-4 pt-[12vh] bg-[var(--k-ink-900)]/40 dark:bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paleta de comandos"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-xl flex flex-col overflow-hidden rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] shadow-xl',
          className,
        )}
      >
        <div className="flex items-center gap-2.5 px-4 border-b border-[var(--border-default,#e2e8f0)]">
          <Search className="h-4 w-4 shrink-0 text-[var(--fg-subtle,#657486)]" />
          <input
            ref={inputRef}
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            role="combobox"
            aria-expanded
            aria-controls="command-palette-list"
            aria-activedescendant={`command-item-${activeIndex}`}
            className="flex-1 min-w-0 h-12 bg-transparent text-[14px] outline-none text-[var(--fg-default,#0a1628)] placeholder:text-[var(--fg-subtle,#657486)]"
          />
          {loading && (
            <span className="h-3.5 w-3.5 shrink-0 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          )}
        </div>

        <div
          ref={listRef}
          id="command-palette-list"
          role="listbox"
          className="max-h-[min(60vh,420px)] overflow-y-auto p-2"
        >
          {flat.length === 0 ? (
            <p className="py-10 text-center text-[11px] font-mono uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
              {loading ? 'Buscando…' : emptyMessage}
            </p>
          ) : (
            visible.map((section) => (
              <div key={section.key} className="mb-1 last:mb-0">
                {section.label && (
                  <div className="flex items-center gap-1.5 px-2 pt-2 pb-1 text-[9px] font-mono font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]">
                    {section.icon}
                    {section.label}
                  </div>
                )}
                {section.items.map((item) => {
                  if (item.disabled) {
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-2.5 rounded-[var(--k-radius-xs,2px)] px-2.5 py-2 text-[13px] opacity-40"
                      >
                        {item.icon}
                        {item.label}
                      </div>
                    );
                  }
                  index += 1;
                  const i = index;
                  const active = i === activeIndex;
                  return (
                    <div
                      key={item.id}
                      id={`command-item-${i}`}
                      data-cmd-index={i}
                      role="option"
                      aria-selected={active}
                      onClick={() => run(item)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={cn(
                        'flex items-center gap-2.5 rounded-[var(--k-radius-xs,2px)] px-2.5 py-2 cursor-pointer transition-colors',
                        active ? 'bg-accent/10 text-accent' : 'text-[var(--fg-body,#2d3a4a)]',
                      )}
                    >
                      {item.icon && <span className="shrink-0">{item.icon}</span>}
                      <span className="flex-1 min-w-0 flex flex-col">
                        <span className="truncate text-[13px]">{item.label}</span>
                        {item.description && (
                          <span className="truncate text-[11px] text-[var(--fg-muted,#52606f)]">
                            {item.description}
                          </span>
                        )}
                      </span>
                      {item.shortcut && (
                        <span className="shrink-0 flex items-center gap-1">
                          {item.shortcut.map((k) => (
                            <kbd
                              key={k}
                              className="rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-subtle,#657486)]"
                            >
                              {k}
                            </kbd>
                          ))}
                        </span>
                      )}
                      {active && !item.shortcut && (
                        <CornerDownLeft className="h-3.5 w-3.5 shrink-0 opacity-60" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {footerHint !== false && (
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border-default,#e2e8f0)] bg-[var(--bg-muted,#fafbfc)] text-[10px] text-[var(--fg-subtle,#657486)]">
            {footerHint ?? (
              <>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono">↑↓</kbd> moverse
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono">↵</kbd> abrir
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="font-mono">esc</kbd> cerrar
                </span>
              </>
            )}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
};

export interface UseCommandPaletteOptions {
  /** Atajo que la abre. Default 'mod+k' (Ctrl en Windows, ⌘ en Mac). */
  shortcut?: 'mod+k' | 'ctrl+k' | '/' | false;
}

/** Estado y atajo de teclado ya montados. */
export function useCommandPalette({ shortcut = 'mod+k' }: UseCommandPaletteOptions = {}) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
      if (shortcut === '/') {
        if (event.key === '/' && !typing) {
          event.preventDefault();
          setOpen(true);
        }
        return;
      }
      const mod = shortcut === 'mod+k' ? event.metaKey || event.ctrlKey : event.ctrlKey;
      if (mod && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut]);

  return { open, setOpen, openPalette: () => setOpen(true), close: () => setOpen(false) };
}
