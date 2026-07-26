import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Search, ChevronDown, Check, Plus, X } from 'lucide-react';
import { cn } from '../utils';
import { usePopover } from '../hooks/usePopover';

export interface SearchableSelectOption {
  value: string;
  label: string;
  secondaryLabel?: string;
  disabled?: boolean;
  /** Encabezado bajo el que se agrupa la opción. */
  group?: string;
  /** Nivel de anidamiento, para listas jerárquicas (categorías, plan contable). */
  depth?: number;
  /** Icono a la izquierda. */
  icon?: React.ReactNode;
  [key: string]: any;
}

interface SearchableSelectBaseProps {
  options: SearchableSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** Botón X para deseleccionar (en multiple cada chip ya tiene su X). */
  clearable?: boolean;
  /** Spinner en el listado (carga de opciones desde servidor). */
  loading?: boolean;
  /**
   * Modo servidor: se llama con el término de búsqueda y NO se filtra en
   * cliente — pasa las opciones ya filtradas.
   */
  onSearchChange?: (term: string) => void;
  emptyMessage?: string;
  /**
   * Permite crear una opción que no existe. Se llama con el texto tecleado y
   * debe devolver el valor a seleccionar (o nada para no seleccionar).
   */
  creatable?: boolean;
  onCreate?: (term: string) => string | void | Promise<string | void>;
  /** Texto del botón de crear. `{term}` se sustituye por lo tecleado. */
  createLabel?: string;
  /** Quedan más resultados por traer (paginación en servidor). */
  hasMore?: boolean;
  /** Se llama al llegar al final de la lista. */
  onLoadMore?: () => void;
  /** Resalta en negrita el texto que coincide con la búsqueda. Default true. */
  highlightMatch?: boolean;
  /** Ordena y agrupa por `group`. Default true si alguna opción trae grupo. */
  grouped?: boolean;
}

export interface SearchableSelectSingleProps extends SearchableSelectBaseProps {
  multiple?: false;
  value: string;
  onChange: (value: string) => void;
}

export interface SearchableSelectMultipleProps extends SearchableSelectBaseProps {
  multiple: true;
  value: string[];
  onChange: (value: string[]) => void;
}

export type SearchableSelectProps = SearchableSelectSingleProps | SearchableSelectMultipleProps;

/** Parte en tres el texto para poder marcar en negrita lo que coincide. */
function splitMatch(text: string, term: string): [string, string, string] | null {
  if (!term) return null;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i === -1) return null;
  return [text.slice(0, i), text.slice(i, i + term.length), text.slice(i + term.length)];
}

export function SearchableSelect(props: SearchableSelectProps) {
  const {
    options,
    placeholder = 'Seleccionar...',
    disabled = false,
    className,
    clearable = false,
    loading = false,
    onSearchChange,
    emptyMessage = 'Sin resultados',
    creatable = false,
    onCreate,
    createLabel = 'Crear «{term}»',
    hasMore = false,
    onLoadMore,
    highlightMatch = true,
    grouped,
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = React.useId();

  const {
    anchorRef: wrapperRef,
    popoverRef: dropdownRef,
    style: popoverStyle,
    ready: coordsReady,
  } = usePopover<HTMLDivElement>({
    open: isOpen,
    onClose: () => setIsOpen(false),
    matchAnchorWidth: true,
    minWidth: 280,
    estimatedMaxHeight: 320,
    scrollStrategy: 'reposition',
  });

  const selectedValues = useMemo(
    () => (props.multiple ? props.value : props.value ? [props.value] : []),
    [props.multiple, props.value],
  );
  const isSelected = (optValue: string) => selectedValues.includes(optValue);

  const selectedOptions = useMemo(
    () => options.filter((opt) => selectedValues.includes(opt.value)),
    [options, selectedValues],
  );

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    } else {
      setSearchTerm('');
      setHighlightedIndex(-1);
    }
  }, [isOpen]);

  // Con onSearchChange el filtrado/ordenación es responsabilidad del servidor.
  const filteredOptions = useMemo(() => {
    if (onSearchChange) return options;
    const s = searchTerm.toLowerCase();
    return options
      .filter(
        (opt) =>
          opt.label.toLowerCase().includes(s) || opt.secondaryLabel?.toLowerCase().includes(s),
      )
      .sort((a, b) => {
        const aStarts =
          a.label.toLowerCase().startsWith(s) || a.secondaryLabel?.toLowerCase().startsWith(s);
        const bStarts =
          b.label.toLowerCase().startsWith(s) || b.secondaryLabel?.toLowerCase().startsWith(s);
        if (aStarts && !bStarts) return -1;
        if (!aStarts && bStarts) return 1;
        return 0;
      });
  }, [options, searchTerm, onSearchChange]);

  // Al cambiar la lista visible, resaltar la primera opción habilitada; si no
  // hay ninguna pero se puede crear, el resaltado va a la fila de crear, para
  // que Intro sirva sin tener que bajar con la flecha.
  useEffect(() => {
    if (!isOpen) return;
    const first = filteredOptions.findIndex((opt) => !opt.disabled);
    if (first !== -1) setHighlightedIndex(first);
    else if (creatable && searchTerm.trim()) setHighlightedIndex(filteredOptions.length);
    else setHighlightedIndex(-1);
  }, [isOpen, filteredOptions, creatable, searchTerm]);

  // Mantener visible la opción resaltada al navegar con teclado.
  useEffect(() => {
    if (highlightedIndex < 0) return;
    const el = listRef.current?.querySelector(`[data-opt-index="${highlightedIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [highlightedIndex]);

  const selectOption = (opt: SearchableSelectOption) => {
    if (opt.disabled) return;
    if (props.multiple) {
      const next = isSelected(opt.value)
        ? props.value.filter((v) => v !== opt.value)
        : [...props.value, opt.value];
      props.onChange(next);
      inputRef.current?.focus();
    } else {
      props.onChange(opt.value);
      setIsOpen(false);
    }
  };

  const clearAll = () => {
    if (props.multiple) props.onChange([]);
    else props.onChange('');
  };

  const moveHighlight = (delta: 1 | -1) => {
    const enabled = filteredOptions
      .map((opt, i) => (opt.disabled ? -1 : i))
      .filter((i) => i !== -1);
    if (createIndex !== -1) enabled.push(createIndex);
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(highlightedIndex);
    const next =
      pos === -1
        ? delta === 1
          ? enabled[0]
          : enabled[enabled.length - 1]
        : enabled[(pos + delta + enabled.length) % enabled.length];
    setHighlightedIndex(next);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        moveHighlight(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        moveHighlight(-1);
        break;
      case 'Home':
        event.preventDefault();
        setHighlightedIndex(filteredOptions.findIndex((o) => !o.disabled));
        break;
      case 'End': {
        event.preventDefault();
        for (let i = filteredOptions.length - 1; i >= 0; i--) {
          if (!filteredOptions[i].disabled) {
            setHighlightedIndex(i);
            break;
          }
        }
        break;
      }
      case 'Enter': {
        event.preventDefault();
        if (highlightedIndex === createIndex && createIndex !== -1) {
          handleCreate();
          break;
        }
        const opt = filteredOptions[highlightedIndex];
        if (opt) selectOption(opt);
        break;
      }
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleTriggerKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
      event.preventDefault();
      setIsOpen(true);
    }
  };

  // Se agrupa DESPUÉS de filtrar, conservando el orden de cada grupo, y se
  // aplana en filas para que el índice del teclado siga siendo lineal.
  const useGroups = grouped ?? options.some((o) => o.group);

  type Row =
    | { kind: 'header'; label: string }
    | { kind: 'option'; option: SearchableSelectOption; optionIndex: number }
    | { kind: 'create'; term: string };

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = [];
    let optionIndex = 0;
    if (useGroups) {
      const groups = new Map<string, SearchableSelectOption[]>();
      for (const opt of filteredOptions) {
        const key = opt.group ?? '';
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(opt);
      }
      for (const [label, opts] of groups) {
        if (label) out.push({ kind: 'header', label });
        for (const option of opts) out.push({ kind: 'option', option, optionIndex: optionIndex++ });
      }
    } else {
      for (const option of filteredOptions) {
        out.push({ kind: 'option', option, optionIndex: optionIndex++ });
      }
    }
    const exact = filteredOptions.some(
      (o) => o.label.toLowerCase() === searchTerm.trim().toLowerCase(),
    );
    if (creatable && searchTerm.trim() && !exact) {
      out.push({ kind: 'create', term: searchTerm.trim() });
    }
    return out;
  }, [filteredOptions, useGroups, creatable, searchTerm]);

  /** Índice de la fila «crear», o -1: se navega como una opción más. */
  const createIndex = creatable && rows.some((r) => r.kind === 'create') ? filteredOptions.length : -1;

  const handleCreate = async () => {
    const term = searchTerm.trim();
    if (!term) return;
    const created = await onCreate?.(term);
    if (typeof created === 'string') {
      if (props.multiple) props.onChange([...props.value, created]);
      else {
        props.onChange(created);
        setIsOpen(false);
      }
    }
    setSearchTerm('');
  };

  // Aviso al llegar al final, para traer la página siguiente.
  const handleListScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (!hasMore || !onLoadMore || loading) return;
    const el = event.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) onLoadMore();
  };

  const hasValue = selectedValues.length > 0;
  const activeDescendant =
    highlightedIndex >= 0 && filteredOptions[highlightedIndex]
      ? `${listboxId}-opt-${highlightedIndex}`
      : undefined;

  const dropdownContent =
    isOpen &&
    coordsReady &&
    createPortal(
      <div
        ref={dropdownRef}
        className={cn(
          'z-[var(--k-z-popover,999999)] rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-1 shadow-lg animate-in fade-in-50 duration-200 flex flex-col',
        )}
        style={popoverStyle}
      >
        <div className="flex items-center gap-2 border-b border-slate-100/50 dark:border-slate-800/50 px-3 py-2 shrink-0">
          <Search className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
          <input
            ref={inputRef}
            role="combobox"
            aria-expanded={isOpen}
            aria-controls={listboxId}
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            className="w-full min-w-0 bg-transparent text-xs outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 h-7"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearchChange?.(e.target.value);
            }}
            onKeyDown={handleInputKeyDown}
          />
          {loading && (
            <span className="h-3.5 w-3.5 shrink-0 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
          )}
        </div>
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-multiselectable={props.multiple || undefined}
          onScroll={handleListScroll}
          className="max-h-[220px] overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-slate-200"
        >
          {rows.length > 0 ? (
            rows.map((row) => {
              if (row.kind === 'header') {
                return (
                  <div
                    key={`h-${row.label}`}
                    role="presentation"
                    className="px-2.5 pt-2 pb-1 text-[9px] font-mono font-semibold uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)]"
                  >
                    {row.label}
                  </div>
                );
              }
              if (row.kind === 'create') {
                const highlighted = highlightedIndex === createIndex;
                return (
                  <div
                    key="__create__"
                    id={`${listboxId}-opt-${createIndex}`}
                    data-opt-index={createIndex}
                    role="option"
                    aria-selected={false}
                    onClick={handleCreate}
                    onMouseEnter={() => setHighlightedIndex(createIndex)}
                    className={cn(
                      'flex items-center gap-2 rounded-[var(--k-radius-xs,2px)] px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors text-accent',
                      highlighted && 'bg-[var(--bg-hover,#f1f5f9)]',
                    )}
                  >
                    <Plus className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{createLabel.replace('{term}', row.term)}</span>
                  </div>
                );
              }
              const opt = row.option;
              const idx = row.optionIndex;
              const selected = isSelected(opt.value);
              const highlighted = idx === highlightedIndex;
              return (
                <div
                  key={opt.value}
                  id={`${listboxId}-opt-${idx}`}
                  data-opt-index={idx}
                  role="option"
                  aria-selected={selected}
                  aria-disabled={opt.disabled || undefined}
                  onClick={() => selectOption(opt)}
                  onMouseEnter={() => !opt.disabled && setHighlightedIndex(idx)}
                  style={opt.depth ? { paddingLeft: 10 + opt.depth * 14 } : undefined}
                  className={cn(
                    'group flex items-center justify-between rounded-[var(--k-radius-xs,2px)] px-2.5 py-1.5 text-[12px] cursor-pointer transition-colors',
                    selected
                      ? 'bg-accent text-[color:var(--color-accent-fg)]'
                      : highlighted
                        ? 'bg-[var(--bg-hover,#f1f5f9)] text-[var(--fg-body,#2d3a4a)]'
                        : 'text-[var(--fg-body,#2d3a4a)]',
                    opt.disabled && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {opt.icon && <span className="shrink-0">{opt.icon}</span>}
                    <div className="flex flex-col min-w-0">
                    <span className="font-semibold truncate">
                      {(() => {
                        const parts = highlightMatch ? splitMatch(opt.label, searchTerm) : null;
                        if (!parts) return opt.label;
                        const [before, hit, after] = parts;
                        return (
                          <>
                            {before}
                            <mark className="bg-transparent text-inherit underline decoration-2 underline-offset-2">
                              {hit}
                            </mark>
                            {after}
                          </>
                        );
                      })()}
                    </span>
                    {opt.secondaryLabel && (
                      <span
                        className={cn(
                          'text-[9px] font-mono mt-0.5',
                          selected ? 'opacity-80' : 'text-slate-400 dark:text-slate-500',
                        )}
                      >
                        {opt.secondaryLabel}
                      </span>
                    )}
                    </div>
                  </div>
                  {selected && <Check className="h-3.5 w-3.5 shrink-0" />}
                </div>
              );
            })
          ) : (
            <div className="py-6 text-center">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
                {loading ? 'Cargando…' : emptyMessage}
              </p>
            </div>
          )}
          {hasMore && rows.length > 0 && (
            <div className="py-2 text-center text-[10px] font-mono uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
              {loading ? 'Cargando más…' : 'Baja para ver más'}
            </div>
          )}
        </div>
      </div>,
      document.body,
    );

  return (
    <div ref={wrapperRef} className={cn('relative w-full', className)}>
      <div
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-controls={isOpen ? listboxId : undefined}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className={cn(
          'flex w-full items-center justify-between gap-2 rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] text-[var(--fg-default,#0a1628)] px-3 py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:border-accent',
          disabled
            ? 'cursor-not-allowed opacity-50 bg-[var(--k-surface)] dark:bg-slate-800'
            : 'cursor-pointer hover:border-[var(--k-ink-400)] dark:hover:border-slate-600',
          isOpen && 'border-accent',
        )}
      >
        {props.multiple && hasValue ? (
          <span className="flex flex-wrap items-center gap-1 min-w-0">
            {selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 rounded-[var(--k-radius-xs,2px)] bg-accent/10 dark:bg-accent/20 text-accent px-1.5 py-0.5 text-[11px] font-semibold max-w-[160px]"
              >
                <span className="truncate">{opt.label}</span>
                {!disabled && (
                  <X
                    role="button"
                    aria-label={`Quitar ${opt.label}`}
                    className="h-3 w-3 shrink-0 hover:text-[var(--k-danger-fg)] transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      (props.onChange as (v: string[]) => void)(
                        selectedValues.filter((v) => v !== opt.value),
                      );
                    }}
                  />
                )}
              </span>
            ))}
          </span>
        ) : (
          <span
            className={cn(
              'truncate font-semibold',
              !hasValue && 'text-slate-400 dark:text-slate-500 font-normal',
            )}
          >
            {hasValue ? selectedOptions[0]?.label : placeholder}
          </span>
        )}
        <span className="flex items-center gap-1 shrink-0">
          {clearable && hasValue && !disabled && (
            <X
              role="button"
              aria-label={props.multiple ? 'Limpiar todo' : 'Limpiar selección'}
              className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 hover:text-[var(--k-danger-fg)] transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                clearAll();
              }}
            />
          )}
          <ChevronDown
            className={cn(
              'h-3 w-3 text-slate-400 dark:text-slate-500 transition-transform duration-200',
              isOpen && 'rotate-180',
            )}
          />
        </span>
      </div>
      {dropdownContent}
    </div>
  );
}
