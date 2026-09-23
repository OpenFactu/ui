import * as React from 'react';
import { Check, Copy, AlertCircle } from 'lucide-react';
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
    let failure: unknown;
    let failed = false;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Portapapeles no disponible');
      await navigator.clipboard.writeText(value);
    } catch (error) {
      failed = true;
      failure = error;
    }
    if (id !== request.current) return;
    busy.current = false;
    setState(failed ? 'error' : 'copied');
    if (failed) onCopyError?.(failure);
    else onCopy?.(value);
  };
  const text = state === 'copied' ? copiedLabel : state === 'error' ? errorLabel : label;
  const Icon = state === 'copied' ? Check : state === 'error' ? AlertCircle : Copy;
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
        <Icon size={14} aria-hidden="true" />
        {!iconOnly && text}
      </Button>
      <span role="status" className="sr-only">
        {state === 'copied' || state === 'error' ? text : ''}
      </span>
    </span>
  );
};
