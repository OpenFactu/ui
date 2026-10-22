import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '../utils';

export interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  label?: string;
  ariaLabel?: string;
  placeholder?: string;
  helperText?: React.ReactNode;
  disabled?: boolean;
  readOnly?: boolean;
  maxTags?: number;
  /** Devuelve el motivo de rechazo o null si es válida. */
  validateTag?: (tag: string) => string | null;
  /** Añadir el texto pendiente al salir del campo. Default true. */
  commitOnBlur?: boolean;
  className?: string;
}

/** Campo controlado: Intro, coma, punto y coma o pegado de varias líneas. */
export const TagInput: React.FC<TagInputProps> = ({
  value,
  onChange,
  label,
  ariaLabel,
  placeholder = 'Añadir etiqueta…',
  helperText,
  disabled = false,
  readOnly = false,
  maxTags,
  validateTag,
  commitOnBlur = true,
  className,
}) => {
  const id = React.useId();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [buffer, setBuffer] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [invalid, setInvalid] = React.useState(false);
  const locked = disabled || readOnly;
  const add = (text: string) => {
    if (locked || !text.trim()) return;
    const next = [...value];
    let rejection = '';
    for (const tag of text
      .split(/[,;\n\r]+/)
      .map((part) => part.trim())
      .filter(Boolean)) {
      if (next.some((existing) => existing.toLocaleLowerCase() === tag.toLocaleLowerCase())) {
        rejection = `La etiqueta «${tag}» ya existe.`;
      } else if (maxTags !== undefined && next.length >= maxTags) {
        rejection = `Se permiten como máximo ${maxTags} etiquetas.`;
      } else {
        const reason = validateTag?.(tag);
        if (reason) rejection = reason;
        else next.push(tag);
      }
    }
    if (next.length !== value.length) onChange(next);
    setBuffer('');
    setInvalid(!!rejection);
    setMessage(rejection || `${next.length - value.length} etiquetas añadidas.`);
  };
  const remove = (index: number) => {
    if (locked) return;
    onChange(value.filter((_, position) => position !== index));
    setInvalid(false);
    setMessage(`Etiqueta «${value[index]}» eliminada.`);
    inputRef.current?.focus();
  };
  return (
    <div className={className}>
      {label && (
        <label
          htmlFor={id}
          className="mb-1.5 block text-[12px] font-medium text-[var(--fg-default)]"
        >
          {label}
        </label>
      )}
      <div
        ref={containerRef}
        className={cn(
          'flex min-w-0 flex-wrap items-center gap-2 rounded-[var(--k-radius-xs)] border bg-[var(--bg-card)] p-2 focus-within:border-accent',
          invalid ? 'border-[var(--k-danger)]' : 'border-[var(--border-default)]',
          disabled && 'opacity-50',
        )}
      >
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex max-w-full items-center gap-1 rounded-[var(--k-radius-xs)] bg-[var(--bg-muted)] px-2 py-1 text-[12px] text-[var(--fg-default)]"
          >
            <span className="break-all">{tag}</span>
            {!readOnly && (
              <button
                type="button"
                data-remove-tag
                disabled={disabled}
                aria-label={`Eliminar etiqueta ${tag}`}
                onClick={() => remove(index)}
                onKeyDown={(event) => {
                  if (event.key === 'Backspace' || event.key === 'Delete') {
                    event.preventDefault();
                    remove(index);
                  }
                }}
                className="shrink-0 rounded-sm p-0.5 hover:text-[var(--k-danger-fg)] focus-visible:ring-2 focus-visible:ring-accent"
              >
                <X size={12} aria-hidden="true" />
              </button>
            )}
          </span>
        ))}
        <input
          ref={inputRef}
          id={id}
          value={buffer}
          disabled={disabled}
          readOnly={readOnly}
          aria-label={ariaLabel ?? (label ? undefined : 'Etiquetas')}
          aria-invalid={invalid || undefined}
          aria-describedby={`${id}-hint ${id}-message`}
          placeholder={readOnly ? undefined : placeholder}
          onChange={(event) => {
            setBuffer(event.target.value);
            setInvalid(false);
            setMessage('');
          }}
          onBlur={(event) => {
            if (commitOnBlur && !containerRef.current?.contains(event.relatedTarget)) add(buffer);
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData('text');
            if (/[,;\n\r]/.test(text) && !locked) {
              event.preventDefault();
              const start = event.currentTarget.selectionStart ?? buffer.length;
              const end = event.currentTarget.selectionEnd ?? start;
              add(buffer.slice(0, start) + text + buffer.slice(end));
            }
          }}
          onKeyDown={(event) => {
            if (event.nativeEvent.isComposing || locked) return;
            if (['Enter', ',', ';'].includes(event.key)) {
              event.preventDefault();
              add(buffer);
            }
            if (event.key === 'Backspace' && !buffer) {
              event.preventDefault();
              containerRef.current
                ?.querySelectorAll<HTMLButtonElement>('[data-remove-tag]')
                [value.length - 1]?.focus();
            }
          }}
          className="min-w-0 flex-1 basis-32 bg-transparent px-1 py-1 text-[13px] text-[var(--fg-default)] outline-none placeholder:text-[var(--fg-subtle)]"
        />
      </div>
      <p id={`${id}-hint`} className="mt-1.5 text-[11px] text-[var(--fg-muted)]">
        {helperText ?? 'Separa las etiquetas con Intro o comas.'}
        {maxTags !== undefined && (
          <span className="ml-2">
            {value.length}/{maxTags}
          </span>
        )}
      </p>
      <p
        id={`${id}-message`}
        role="status"
        className={invalid ? 'mt-1 text-[11px] text-[var(--k-danger-fg)]' : 'sr-only'}
      >
        {message}
      </p>
    </div>
  );
};
