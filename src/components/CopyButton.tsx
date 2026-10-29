import { copyText } from '../hooks/useCopyToClipboard';
import * as React from 'react';
import { UiIcon, type IconSlot } from '../icons';
import { Button, type ButtonProps } from './Button';

export interface CopyButtonProps extends Omit<
  ButtonProps,
  'onClick' | 'children' | 'onCopy' | 'onError' | 'isLoading'
> {
  value: string;
  label?: string;
  copiedLabel?: string;
  errorLabel?: string;
  iconOnly?: boolean;
  onCopy?: (value: string) => void;
  onCopyError?: (error: unknown) => void;
}

/** Copia tras una acción explícita. Un fallo de permisos nunca se muestra como éxito. */
export const CopyButton: React.FC<CopyButtonProps> = ({
  value,
  label = 'Copiar',
  copiedLabel = 'Copiado',
  errorLabel = 'No se pudo copiar',
  iconOnly = false,
  onCopy,
  onCopyError,
  variant = 'soft',
  size = 'sm',
  disabled,
  ...rest
}) => {
  const [state, setState] = React.useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const request = React.useRef(0);
  const busy = React.useRef(false);
  React.useEffect(() => {
    request.current += 1;
    busy.current = false;
    setState('idle');
    return () => {
      request.current += 1;
    };
  }, [value]);
  React.useEffect(() => {
    if (state !== 'copied' && state !== 'error') return;
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);
  const copy = async () => {
    if (busy.current) return;
    busy.current = true;
    const id = ++request.current;
    setState('copying');
    const ok = await copyText(value);
    if (id !== request.current) return;
    busy.current = false;
    setState(ok ? 'copied' : 'error');
    if (ok) onCopy?.(value);
    else onCopyError?.(new Error('No se pudo copiar al portapapeles'));
  };
  const text = state === 'copied' ? copiedLabel : state === 'error' ? errorLabel : label;
  const iconSlot: IconSlot = state === 'copied' ? 'check' : state === 'error' ? 'alert-circle' : 'copy';
  return (
    <span className="inline-flex items-center">
      <Button
        {...rest}
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        aria-busy={state === 'copying'}
        aria-label={text}
        title={iconOnly ? text : undefined}
        onClick={copy}
      >
        <UiIcon slot={iconSlot} size={14} aria-hidden="true" />
        {!iconOnly && text}
      </Button>
      <span role="status" className="sr-only">
        {state === 'copied' || state === 'error' ? text : ''}
      </span>
    </span>
  );
};
