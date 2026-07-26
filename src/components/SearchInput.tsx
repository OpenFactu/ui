import * as React from 'react';
import { Clock, Search, X } from 'lucide-react';
import { cn } from '../utils';
import { Input, type InputProps } from './Input';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { usePopover } from '../hooks/usePopover';
import { createPortal } from 'react-dom';

export interface SearchInputProps
  extends Omit<InputProps, 'type' | 'leftIcon' | 'value' | 'onChange' | 'prefix' | 'onSubmit'> {
  value: string;
  onChange: (value: string) => void;
  /** Se llama cuando el usuario deja de teclear (ver `debounceMs`). */
  onDebouncedChange?: (value: string) => void;
  debounceMs?: number;
  clearable?: boolean;
  onClear?: () => void;
  /** Se llama al pulsar Intro. */
  onSubmit?: (value: string) => void;
  /** Atajo global que enfoca el campo. */
  shortcut?: 'mod+k' | 'ctrl+k' | '/' | false;
  showShortcutHint?: boolean;
  loading?: boolean;
  /** Contenido extra a la derecha (por ejemplo, un botón de escáner). */
  trailing?: React.ReactNode;
  /** Sin borde ni fondo, para barras de herramientas. */
  bare?: boolean;
  /** Sugerencias en desplegable mientras se escribe. */
  suggestions?: SearchSuggestion[];
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  /**
   * Guarda y ofrece las últimas búsquedas. Se le pasa la clave de
   * almacenamiento; con `false` (default) no se guarda nada.
   */
  recentKey?: string | false;
  maxRecent?: number;
  /**
   * Filtros por token del estilo `estado:pagada`. Se pintan como chips
   * delante del campo y se pueden quitar uno a uno.
   */
  tokens?: SearchToken[];
  onTokensChange?: (tokens: SearchToken[]) => void;
}

export interface SearchSuggestion {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  /** Sección bajo la que se agrupa. */
  group?: string;
}

export interface SearchToken {
  field: string;
  value: string;
  label?: string;
}

/** `estado:pagada texto libre` → tokens + resto. */
export function parseSearchTokens(input: string): { tokens: SearchToken[]; rest: string } {
  const tokens: SearchToken[] = [];
  const rest: string[] = [];
  for (const chunk of input.split(/\s+/)) {
    const m = /^([a-zA-Z_][\w-]*):(.+)$/.exec(chunk);
    if (m) tokens.push({ field: m[1], value: m[2] });
    else if (chunk) rest.push(chunk);
  }
  return { tokens, rest: rest.join(' ') };
}

function shortcutLabel(shortcut: Exclude<SearchInputProps['shortcut'], false | undefined>): string {
  if (shortcut === '/') return '/';
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  return shortcut === 'mod+k' && isMac ? '⌘K' : 'Ctrl+K';
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onDebouncedChange,
  debounceMs = 250,
  clearable = true,
  onClear,
  onSubmit,
  shortcut = false,
  showShortcutHint,
  loading = false,
  trailing,
  bare = false,
  suggestions,
  onSuggestionSelect,
  recentKey = false,
  maxRecent = 5,
  tokens,
  onTokensChange,
  placeholder = 'Buscar…',
  className,
  containerClassName,
  onKeyDown,
  ...rest
}) => {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const debounced = useDebouncedValue(value, debounceMs);
  const lastEmitted = React.useRef(value);

  const [open, setOpen] = React.useState(false);
  const [activeIndex, setActiveIndex] = React.useState(-1);
  const [recent, setRecent] = React.useState<string[]>(() => {
    if (!recentKey || typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(recentKey);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const pushRecent = React.useCallback(
    (term: string) => {
      if (!recentKey || !term.trim()) return;
      setRecent((prev) => {
        const next = [term, ...prev.filter((r) => r !== term)].slice(0, maxRecent);
        try {
          localStorage.setItem(recentKey, JSON.stringify(next));
        } catch {
          /* almacenamiento no disponible: el historial simplemente no persiste */
        }
        return next;
      });
    },
    [recentKey, maxRecent],
  );

  /** Con texto se ofrecen sugerencias; sin él, el historial. */
  const panelItems = React.useMemo<SearchSuggestion[]>(() => {
    if (value.trim()) return suggestions ?? [];
    return recent.map((r) => ({ id: `recent:${r}`, label: r, group: 'Recientes' }));
  }, [value, suggestions, recent]);

  const showPanel = open && panelItems.length > 0;

  const {
    anchorRef,
    popoverRef,
    style: panelStyle,
    ready: panelReady,
  } = usePopover<HTMLDivElement>({
    open: showPanel,
    onClose: () => setOpen(false),
    matchAnchorWidth: true,
    estimatedMaxHeight: 280,
    scrollStrategy: 'reposition',
  });

  const chooseSuggestion = (item: SearchSuggestion) => {
    onChange(item.label);
    pushRecent(item.label);
    onSuggestionSelect?.(item);
    setOpen(false);
    inputRef.current?.focus();
  };

  const removeToken = (index: number) => {
    if (!tokens || !onTokensChange) return;
    onTokensChange(tokens.filter((_, i) => i !== index));
  };

  const panel =
    showPanel &&
    createPortal(
      <div
        ref={popoverRef}
        role="listbox"
        style={panelStyle}
        className={cn(
          'z-[var(--k-z-popover,999999)] max-h-[280px] overflow-y-auto rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-1 shadow-lg',
          !panelReady && 'invisible',
        )}
      >
        {panelItems.map((item, i) => {
          const first = i === 0 || panelItems[i - 1].group !== item.group;
          return (
            <React.Fragment key={item.id}>
              {item.group && first && (
                <div className="px-2.5 pt-2 pb-1 text-[9px] font-mono font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#94a3b8)]">
                  {item.group}
                </div>
              )}
              <div
                role="option"
                aria-selected={i === activeIndex}
                data-sugg-index={i}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseSuggestion(item)}
                onMouseEnter={() => setActiveIndex(i)}
                className={cn(
                  'flex items-center gap-2 rounded-[var(--k-radius-xs,2px)] px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors',
                  i === activeIndex
                    ? 'bg-[var(--bg-hover,#f1f5f9)] text-[var(--fg-default,#0a1628)]'
                    : 'text-[var(--fg-body,#2d3a4a)]',
                )}
              >
                {item.icon ?? <Clock className="h-3 w-3 shrink-0 text-[var(--fg-subtle,#94a3b8)]" />}
                <span className="flex-1 min-w-0 truncate">{item.label}</span>
                {item.description && (
                  <span className="shrink-0 text-[10px] text-[var(--fg-muted,#64748b)]">
                    {item.description}
                  </span>
                )}
              </div>
            </React.Fragment>
          );
        })}
      </div>,
      document.body,
    );

  React.useEffect(() => {
    if (!onDebouncedChange) return;
    if (debounced === lastEmitted.current) return;
    lastEmitted.current = debounced;
    onDebouncedChange(debounced);
  }, [debounced, onDebouncedChange]);

  React.useEffect(() => {
    if (!shortcut) return;
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (shortcut === '/') {
        if (event.key === '/' && !typing) {
          event.preventDefault();
          inputRef.current?.focus();
        }
        return;
      }
      const modifier = shortcut === 'mod+k' ? event.metaKey || event.ctrlKey : event.ctrlKey;
      if (modifier && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [shortcut]);

  const clear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  const hint = shortcut && (showShortcutHint ?? true) && !value && (
    <kbd className="pointer-events-none select-none rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--fg-subtle,#94a3b8)]">
      {shortcutLabel(shortcut)}
    </kbd>
  );

  const suffix = (
    <span className="flex items-center gap-1 pr-1.5">
      {loading ? (
        <span className="h-3.5 w-3.5 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
      ) : (
        clearable &&
        value && (
          <button
            type="button"
            onClick={clear}
            aria-label="Limpiar búsqueda"
            className="p-1 text-[var(--fg-subtle,#94a3b8)] hover:text-[var(--k-danger-fg)] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )
      )}
      {hint}
      {trailing}
    </span>
  );

  const hasSuffix = loading || (clearable && !!value) || !!hint || !!trailing;

  const tokenChips = tokens && tokens.length > 0 && (
    <span className="flex items-center gap-1 flex-wrap">
      {tokens.map((token, i) => (
        <span
          key={`${token.field}:${token.value}`}
          className="inline-flex items-center gap-1 rounded-[var(--k-radius-xs,2px)] bg-accent/10 px-1.5 py-0.5 text-[10px] font-mono text-accent"
        >
          {token.label ?? `${token.field}:${token.value}`}
          {onTokensChange && (
            <X
              role="button"
              aria-label={`Quitar filtro ${token.field}`}
              className="h-2.5 w-2.5 cursor-pointer hover:text-[var(--k-danger-fg)]"
              onClick={() => removeToken(i)}
            />
          )}
        </span>
      ))}
    </span>
  );

  return (
    <div ref={anchorRef} className="w-full">
    <Input
      {...rest}
      inputRef={inputRef}
      prefix={tokenChips || undefined}
      prefixInteractive
      onFocus={(e) => {
        setOpen(true);
        rest.onFocus?.(e);
      }}
      onBlur={(e) => {
        // Un pequeño margen para que el clic sobre una sugerencia llegue antes
        // de que el panel se cierre.
        setTimeout(() => setOpen(false), 120);
        rest.onBlur?.(e);
      }}
      type="search"
      role="searchbox"
      value={value}
      placeholder={placeholder}
      leftIcon={<Search className="h-3.5 w-3.5" />}
      suffix={hasSuffix ? suffix : undefined}
      suffixInteractive
      containerClassName={containerClassName}
      className={cn(
        // El limpiador nativo de WebKit duplicaría nuestra X.
        '[&::-webkit-search-cancel-button]:appearance-none',
        bare && 'bg-transparent',
        className,
      )}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (showPanel && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
          e.preventDefault();
          const delta = e.key === 'ArrowDown' ? 1 : -1;
          setActiveIndex((i) => {
            const n = panelItems.length;
            if (i === -1) return delta === 1 ? 0 : n - 1;
            return (i + delta + n) % n;
          });
          return;
        }
        if (e.key === 'Enter') {
          if (showPanel && activeIndex >= 0) {
            e.preventDefault();
            chooseSuggestion(panelItems[activeIndex]);
            return;
          }
          if (onSubmit) {
            e.preventDefault();
            pushRecent(value);
            setOpen(false);
            onSubmit(value);
            return;
          }
        }
        if (e.key === 'Escape') {
          if (showPanel) {
            e.preventDefault();
            setOpen(false);
            return;
          }
          if (value) {
            e.preventDefault();
            clear();
          }
        }
        onKeyDown?.(e);
      }}
    />
    {panel}
    </div>
  );
};
