import * as React from 'react';
import { Check, Eye, EyeOff, RefreshCw, X } from 'lucide-react';
import { cn } from '../utils';
import { Input, type InputProps } from './Input';

export interface PasswordRequirement {
  label: string;
  test: (value: string) => boolean;
}

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'suffix'> {
  /** Botón de mostrar/ocultar. Default true. */
  toggleVisibility?: boolean;
  /** Visibilidad controlada. */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
  /** Barra de fortaleza bajo el campo. */
  showStrength?: boolean;
  strengthLabels?: [string, string, string, string];
  /** Botón para generar una contraseña. */
  generator?: boolean | { length?: number; onGenerate?: (value: string) => void };
  /** Lista de requisitos con su comprobación. */
  requirements?: PasswordRequirement[];
}

const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&*';

function generatePassword(length: number): string {
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (n) => ALPHABET[n % ALPHABET.length]).join('');
}

/** 0–4: longitud, mayúsculas+minúsculas, dígitos, símbolos. */
function strengthOf(value: string): number {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
  if (/\d/.test(value) && /[^\w\s]/.test(value)) score += 1;
  return Math.min(4, score);
}

const STRENGTH_COLORS = [
  'bg-[var(--k-danger)]',
  'bg-[var(--k-danger)]',
  'bg-[var(--k-warning)]',
  'bg-[var(--k-info)]',
  'bg-[var(--k-success)]',
];

export const PasswordInput: React.FC<PasswordInputProps> = ({
  toggleVisibility = true,
  visible: visibleProp,
  onVisibleChange,
  showStrength = false,
  strengthLabels = ['Débil', 'Aceptable', 'Buena', 'Excelente'],
  generator,
  requirements,
  value,
  onChange,
  helperText,
  ...rest
}) => {
  const [internalVisible, setInternalVisible] = React.useState(false);
  const isVisible = visibleProp ?? internalVisible;
  const setVisible = (next: boolean) => {
    if (visibleProp === undefined) setInternalVisible(next);
    onVisibleChange?.(next);
  };

  const text = String(value ?? '');
  const score = strengthOf(text);
  const generatorOptions = typeof generator === 'object' ? generator : {};

  const handleGenerate = () => {
    const generated = generatePassword(generatorOptions.length ?? 16);
    setVisible(true);
    generatorOptions.onGenerate?.(generated);
    // Evento sintético mínimo para que funcione con onChange estándar.
    onChange?.({ target: { value: generated } } as React.ChangeEvent<HTMLInputElement>);
  };

  const suffix = (
    <span className="flex items-center">
      {generator && (
        <button
          type="button"
          onClick={handleGenerate}
          aria-label="Generar contraseña"
          title="Generar contraseña"
          className="px-2 py-1.5 text-[var(--fg-subtle,#657486)] hover:text-accent transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      )}
      {toggleVisibility && (
        <button
          type="button"
          onClick={() => setVisible(!isVisible)}
          aria-label={isVisible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          title={isVisible ? 'Ocultar' : 'Mostrar'}
          className="px-2.5 py-1.5 text-[var(--fg-subtle,#657486)] hover:text-accent transition-colors"
        >
          {isVisible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      )}
    </span>
  );

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <Input
        {...rest}
        type={isVisible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        helperText={requirements || showStrength ? undefined : helperText}
        suffix={toggleVisibility || generator ? suffix : undefined}
        suffixInteractive
      />

      {showStrength && (
        <div className="flex items-center gap-2">
          <div className="flex-1 flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span
                key={i}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  text && i < score
                    ? STRENGTH_COLORS[score]
                    : 'bg-[var(--bg-hover)]',
                )}
              />
            ))}
          </div>
          {text && (
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--fg-subtle,#657486)]">
              {strengthLabels[Math.max(0, score - 1)]}
            </span>
          )}
        </div>
      )}

      {requirements && requirements.length > 0 && (
        <ul className="flex flex-col gap-0.5 mt-0.5">
          {requirements.map((req) => {
            const met = req.test(text);
            return (
              <li
                key={req.label}
                className={cn(
                  'flex items-center gap-1.5 text-[11px]',
                  met ? 'text-[var(--k-success-fg)]' : 'text-[var(--fg-subtle,#657486)]',
                )}
              >
                {met ? <Check className="h-3 w-3 shrink-0" /> : <X className="h-3 w-3 shrink-0" />}
                {req.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};
