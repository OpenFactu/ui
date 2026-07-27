import * as React from 'react';
import { Search } from 'lucide-react';
import { cn } from '../utils';

export interface SearchTriggerProps {
  onOpen: () => void;
  placeholder?: string;
  /** Atajo que se enseña a la derecha. `false` lo oculta. Default 'mod+k'. */
  shortcut?: string | false;
  size?: 'sm' | 'md';
  /** Ocupa todo el ancho disponible. Default true. */
  fullWidth?: boolean;
  className?: string;
  'aria-label'?: string;
}

/** `mod` se traduce según el sistema: ⌘ en Mac, Ctrl en el resto. */
function etiquetaAtajo(atajo: string): string {
  const mac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform || '');
  return atajo
    .split('+')
    .map((parte) => {
      const p = parte.trim().toLowerCase();
      if (p === 'mod') return mac ? '⌘' : 'Ctrl';
      if (p === 'shift') return mac ? '⇧' : 'Shift';
      if (p === 'alt') return mac ? '⌥' : 'Alt';
      return p.toUpperCase();
    })
    .join(mac ? '' : '+');
}

const TAMANOS = {
  sm: 'h-8 text-[12px] gap-2 px-2.5',
  md: 'h-9 text-[13px] gap-2.5 px-3',
};

/**
 * Caja de búsqueda de la cabecera que **no es un campo de texto**: al pulsarla
 * o al empezar a escribir abre la paleta de comandos.
 *
 * Existe porque un `<input>` de verdad ahí obliga a mantener un segundo
 * desplegable de resultados en paralelo al de la paleta, y acaban divergiendo:
 * distinto aspecto, distinto teclado y los atajos solo en uno de los dos. Aquí
 * solo hay una lista de resultados en toda la aplicación.
 *
 * ```tsx
 * const paleta = useCommandPalette();
 * <SearchTrigger onOpen={paleta.open} placeholder="Buscar…" />
 * <CommandPalette {...paleta.props} sections={secciones} onSearch={buscar} />
 * ```
 */
export const SearchTrigger: React.FC<SearchTriggerProps> = ({
  onOpen,
  placeholder = 'Buscar…',
  shortcut = 'mod+k',
  size = 'md',
  fullWidth = true,
  className,
  'aria-label': ariaLabel,
}) => (
  <button
    type="button"
    onClick={onOpen}
    // Teclear con el foco puesto aquí abre la paleta y no se pierde la letra:
    // quien escribe espera que su primera pulsación cuente.
    onKeyDown={(e) => {
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return;
      onOpen();
    }}
    aria-label={ariaLabel ?? placeholder}
    aria-keyshortcuts={shortcut ? shortcut.replace('mod', 'Control') : undefined}
    className={cn(
      'inline-flex items-center rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)]',
      'bg-[var(--bg-card,#ffffff)] text-[var(--fg-subtle,#657486)] transition-colors',
      'hover:border-[var(--border-strong)] hover:text-[var(--fg-muted,#52606f)]',
      'focus-visible:outline-none focus-visible:border-accent',
      TAMANOS[size],
      fullWidth ? 'w-full' : 'w-auto',
      className,
    )}
  >
    <Search className="h-3.5 w-3.5 shrink-0" />
    <span className="flex-1 truncate text-left">{placeholder}</span>
    {shortcut && (
      <kbd className="pointer-events-none shrink-0 select-none rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] px-1.5 py-0.5 font-mono text-[10px]">
        {etiquetaAtajo(shortcut)}
      </kbd>
    )}
  </button>
);
