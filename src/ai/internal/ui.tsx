import { useCopyToClipboard } from '../../hooks/useCopyToClipboard';
import { useObjectUrl } from '../../hooks/useObjectUrl';
import * as React from 'react';
import { UiIcon } from '../../icons';
import { useAILabels } from '../labels';
import type { AIUIProps } from '../types';
import { cn } from '../../utils';

export function AIIconButton({ label, children, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return <button type="button" {...props} aria-label={label} title={label} className={cn('ai-icon-button', className)}>{children}</button>;
}
export function AICopyButton({ text, labels }: AIUIProps & { text: string }) {
  const l = useAILabels(labels);
  const { status, copy } = useCopyToClipboard();
  return <span className="ai-copy-control"><AIIconButton label={status === 'copied' ? l.copied : l.copy} onClick={() => { void copy(text); }}>{status === 'copied' ? <UiIcon slot="check" size={14} className="ai-pop" /> : <UiIcon slot="copy" size={14} />}</AIIconButton>{status === 'error' && <span role="status" className="ai-error">{l.copyError}</span>}</span>;
}
export function AIStatus({ children }: { children: React.ReactNode }) { return <span className="ai-status" role="status"><UiIcon slot="loader-2" className="ai-spinner" size={14} />{children}</span>; }
/** "Pensando": tres puntos con ritmo escalonado en lugar de un spinner. */
export function AIThinking({ children }: { children: React.ReactNode }) {
  return <span className="ai-thinking" role="status"><span className="ai-dots" aria-hidden="true"><i /><i /><i /></span><span className="ai-shimmer-text">{children}</span></span>;
}
/** URL temporal para un `Blob`. Es `useObjectUrl`, compartido con el chat. */
export const useBlobUrl = useObjectUrl;

/** Stable event boundaries keep settled messages out of streaming rerenders. */
export function useStableCallbacks<T extends object>(callbacks: T): T {
  const latest = React.useRef(callbacks); latest.current = callbacks;
  const keys = Object.keys(callbacks).filter(key => typeof (callbacks as Record<string, unknown>)[key] === 'function').sort();
  const signature = keys.join('|');
  return React.useMemo(() => Object.fromEntries(keys.map(key => [key, (...args: unknown[]) => {
    const callback = (latest.current as Record<string, (...values: unknown[]) => unknown>)[key];
    return callback?.(...args);
  }])) as T, [signature]);
}
