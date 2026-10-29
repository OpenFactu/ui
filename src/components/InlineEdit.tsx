import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { Input } from './Input';
import { Textarea } from './Textarea';
import { StatusMark, shake } from './Feedback';
import { Spinner } from './Spinner';

export interface InlineEditProps {
  value: string;
  /** Guarda el texto nuevo. Si devuelve una promesa, se muestra «guardando» y, si falla, el error y se sigue editando. */
  onSave: (value: string) => void | Promise<void>;
  /** Devuelve un mensaje si el texto no vale (y no se guarda). */
  validate?: (value: string) => string | undefined | null;
  /** Texto cuando está vacío. Default «Sin definir». */
  placeholder?: string;
  /** Varias líneas: Intro hace salto de línea y se guarda con Ctrl/⌘ + Intro. */
  multiline?: boolean;
  /** Guarda al salir del campo (por defecto); si es false, salir cancela. */
  saveOnBlur?: boolean;
  disabled?: boolean;
  /** Nombre accesible (lo que se edita: «Nombre del cliente»). */
  label: string;
  /** Cómo se ve el valor en reposo (un título, un enlace…). Por defecto el texto tal cual. */
  renderValue?: (value: string) => React.ReactNode;
  className?: string;
  inputClassName?: string;
}

type Phase = 'view' | 'edit' | 'saving' | 'saved';

/**
 * Texto que se edita en su sitio: se pulsa (o Intro con el foco), se escribe, Intro guarda y Esc cancela. El guardado
 * puede ser asíncrono; al terminar se dibuja una marca y, si falla, el campo se sacude y muestra el error.
 */
export const InlineEdit: React.FC<InlineEditProps> = ({
  value, onSave, validate, placeholder = 'Sin definir', multiline, saveOnBlur = true, disabled, label, renderValue, className, inputClassName,
}) => {
  const [phase, setPhase] = React.useState<Phase>('view');
  const [draft, setDraft] = React.useState(value);
  const [error, setError] = React.useState<string | null>(null);
  const root = React.useRef<HTMLSpanElement>(null);
  const viewButton = React.useRef<HTMLButtonElement>(null);
  const saving = React.useRef(false);

  React.useEffect(() => { if (phase === 'view') setDraft(value); }, [value, phase]);
  React.useEffect(() => {
    if (phase !== 'saved') return;
    const timer = setTimeout(() => setPhase('view'), 1400);
    return () => clearTimeout(timer);
  }, [phase]);

  const start = () => { if (disabled) return; setDraft(value); setError(null); setPhase('edit'); };
  const cancel = () => { setPhase('view'); setError(null); requestAnimationFrame(() => viewButton.current?.focus()); };

  const commit = async () => {
    if (saving.current) return;
    const next = multiline ? draft : draft.trim();
    if (next === value) { cancel(); return; }
    const problem = validate?.(next);
    if (problem) { setError(problem); void shake(root.current); return; }
    saving.current = true;
    setPhase('saving');
    try {
      await onSave(next);
      setPhase('saved');
      requestAnimationFrame(() => viewButton.current?.focus());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar');
      setPhase('edit');
      void shake(root.current);
    } finally {
      saving.current = false;
    }
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); cancel(); }
    else if (event.key === 'Enter' && (!multiline || event.metaKey || event.ctrlKey)) { event.preventDefault(); void commit(); }
  };
  const onBlur = () => { if (phase !== 'edit') return; if (saveOnBlur) void commit(); else cancel(); };

  if (phase === 'edit' || phase === 'saving') {
    const common = {
      value: draft,
      autoFocus: true,
      disabled: phase === 'saving',
      'aria-label': label,
      onKeyDown,
      onBlur,
      onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => e.currentTarget.select(),
    };
    return (
      <span ref={root} className={cn('k-inline-edit w-full', className)} data-k-mobile="InlineEdit">
        <span className="flex-1 min-w-0">
          {multiline
            ? <Textarea {...common} rows={3} className={inputClassName} onChange={(e) => setDraft(e.target.value)} />
            : <Input {...common} inputSize="sm" error={error ?? undefined} className={inputClassName} onChange={(e) => setDraft(e.target.value)} />}
          {multiline && error && <span className="block mt-1 text-[11px] font-medium text-[var(--k-danger-fg)]">{error}</span>}
        </span>
        {phase === 'saving' && <Spinner size="xs" tone="muted" label="Guardando" />}
      </span>
    );
  }

  return (
    <span className={cn('k-inline-edit', className)} data-k-mobile="InlineEdit">
      <button
        ref={viewButton}
        type="button"
        className="k-inline-edit-view"
        disabled={disabled}
        aria-label={`${label}: ${value || placeholder}. Pulsa para editar`}
        onClick={start}
      >
        <span className={cn('truncate', !value && 'k-inline-edit-placeholder')}>{value ? (renderValue ? renderValue(value) : value) : placeholder}</span>
        {phase === 'saved'
          ? <StatusMark size={1} />
          : !disabled && <UiIcon slot="pencil" size={13} className="k-inline-edit-pencil shrink-0" />}
      </button>
    </span>
  );
};
