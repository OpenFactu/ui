import * as React from 'react';
import { shake } from './Feedback';
import { ControlField, describedBy } from './internal/ControlField';
import { applyBackspace, applyInput, applyPaste, toCells, type OtpMode } from './internal/otp';
import { useI18n } from '../i18n/I18nProvider';

export interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Al completar todas las casillas (para enviar sin pulsar nada). */
  onComplete?: (value: string) => void;
  /** Número de casillas. Default 6. */
  length?: number;
  /** `numeric` (por defecto, abre el teclado numérico) o `alphanumeric` (letras en mayúsculas). */
  mode?: OtpMode;
  /** Oculta lo escrito, como un PIN. */
  mask?: boolean;
  /** Separa las casillas en grupos de este tamaño (3 → «123 456»). */
  groupSize?: number;
  autoFocus?: boolean;
  label?: React.ReactNode;
  helperText?: React.ReactNode;
  /** Con error, las casillas se marcan en rojo y el grupo se sacude una vez. */
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  id?: string;
  name?: string;
  className?: string;
}

/**
 * Código de verificación o PIN en casillas. Se puede **pegar** el código entero (también con espacios o guiones), el
 * autocompletado de SMS del móvil lo reparte solo (`one-time-code`), el retroceso vuelve a la casilla anterior y las
 * flechas se mueven entre casillas.
 */
export const OtpInput: React.FC<OtpInputProps> = ({
  value, onChange, onComplete, length = 6, mode = 'numeric', mask, groupSize, autoFocus, label, helperText, error, disabled, size = 'md', id, name, className,
}) => {
  const { messages: { otpInput: otp }, format } = useI18n();
  const generated = React.useId();
  const otpId = id ?? generated;
  const inputs = React.useRef<Array<HTMLInputElement | null>>([]);
  const group = React.useRef<HTMLDivElement>(null);
  const cells = toCells(value, length);
  const focusAt = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (focusAt.current === null) return;
    const el = inputs.current[focusAt.current];
    focusAt.current = null;
    el?.focus(); el?.select();
  });

  React.useEffect(() => { if (error) void shake(group.current); }, [error]);

  const commit = (next: { value: string; focus: number }) => {
    focusAt.current = next.focus;
    if (next.value !== value) {
      onChange(next.value);
      if (next.value.length === length) onComplete?.(next.value);
    } else {
      inputs.current[next.focus]?.focus();
    }
  };

  const onInput = (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const raw = event.target.value;
    // Lo que ya había en la casilla viene incluido: se queda solo con lo nuevo.
    const typed = cells[index] && raw.length > 1 ? raw.replace(cells[index], '') : raw;
    commit(applyInput(value, length, index, typed, mode));
  };

  const onKeyDown = (index: number) => (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace') { event.preventDefault(); commit(applyBackspace(value, length, index)); }
    else if (event.key === 'ArrowLeft' && index > 0) { event.preventDefault(); inputs.current[index - 1]?.focus(); }
    else if (event.key === 'ArrowRight' && index < Math.min(value.length, length - 1)) { event.preventDefault(); inputs.current[index + 1]?.focus(); }
    else if (event.key === 'Home') { event.preventDefault(); inputs.current[0]?.focus(); }
    else if (event.key === 'End') { event.preventDefault(); inputs.current[Math.min(value.length, length - 1)]?.focus(); }
  };

  const onPaste = (event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    commit(applyPaste(event.clipboardData.getData('text'), length, mode));
  };

  return (
    <ControlField id={otpId} label={label} helperText={helperText} error={error} labelMode="group" className={className}>
      <div
        ref={group}
        role="group"
        aria-labelledby={label ? `${otpId}-label` : undefined}
        aria-label={label ? undefined : otp.label}
        aria-describedby={describedBy(otpId, error, helperText)}
        data-k-mobile="OtpInput"
        data-size={size}
        className="k-otp"
      >
        {cells.map((cell, index) => (
          <React.Fragment key={index}>
            {groupSize && index > 0 && index % groupSize === 0 && <span className="k-otp-sep" aria-hidden="true" />}
            <input
              ref={(el) => { inputs.current[index] = el; }}
              id={index === 0 ? otpId : undefined}
              data-k-control="otp"
              className="k-otp-cell"
              type={mask ? 'password' : 'text'}
              inputMode={mode === 'numeric' ? 'numeric' : 'text'}
              pattern={mode === 'numeric' ? '[0-9]*' : undefined}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              autoCapitalize={mode === 'alphanumeric' ? 'characters' : 'off'}
              autoCorrect="off"
              spellCheck={false}
              autoFocus={autoFocus && index === 0}
              disabled={disabled}
              aria-label={format(otp.character, { index: index + 1, total: length })}
              aria-invalid={error ? true : undefined}
              data-filled={cell ? '' : undefined}
              // Solo se puede escribir en la primera casilla libre o en una ya escrita: no quedan huecos.
              tabIndex={index === Math.min(value.length, length - 1) ? 0 : -1}
              value={cell}
              onChange={onInput(index)}
              onKeyDown={onKeyDown(index)}
              onPaste={onPaste}
              onFocus={(e) => { if (index > value.length) inputs.current[Math.min(value.length, length - 1)]?.focus(); else e.target.select(); }}
            />
          </React.Fragment>
        ))}
        {name && <input type="hidden" name={name} value={value} />}
      </div>
    </ControlField>
  );
};
