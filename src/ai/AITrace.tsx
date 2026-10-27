import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import type { AIUIProps } from './types';

/**
 * Trace: una sola línea (icono, título, descripción, estado) que se abre en su
 * contenido. Es la base de Reasoning, Plan, Queue, Chain of Thought, Terminal,
 * Stack Trace y Test Results: todas se leen igual y se animan igual.
 */
export type AITraceStatus = 'none' | 'pending' | 'running' | 'done' | 'error';

export function AITraceIcon({ status = 'none', icon }: { status?: AITraceStatus; icon?: React.ReactNode }) {
  if (status === 'running') return <UiIcon slot="loader-2" size={14} className="ai-spinner" aria-hidden="true" />;
  if (icon) return <span className="ai-trace-glyph" aria-hidden="true">{icon}</span>;
  if (status === 'done') return <UiIcon slot="check-circle-2" size={14} className="ai-pop" aria-hidden="true" />;
  if (status === 'error') return <UiIcon slot="circle-x" size={14} aria-hidden="true" />;
  if (status === 'pending') return <UiIcon slot="circle" size={14} aria-hidden="true" />;
  return null;
}

export interface AITraceProps extends AIUIProps {
  status?: AITraceStatus;
  /** Sustituye al icono del estado (salvo mientras corre, que siempre gira). */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** A la derecha de la línea y fuera del botón (un botón no puede ir dentro de otro), por ejemplo «Copiar». */
  trailing?: React.ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Mantiene el contenido montado al cerrar, para conservar el estado de lo de dentro. */
  keepMounted?: boolean;
  children?: React.ReactNode;
}

export function AITrace({ status = 'none', icon, title, description, trailing, open, defaultOpen = false, onOpenChange, keepMounted, children, className }: AITraceProps) {
  const [internal, setInternal] = React.useState(defaultOpen);
  const controlled = open !== undefined;
  const isOpen = controlled ? open : internal;
  const id = React.useId();
  const hasContent = children !== undefined && children !== null && children !== false;
  const toggle = () => { const next = !isOpen; if (!controlled) setInternal(next); onOpenChange?.(next); };
  const line = <>
    <AITraceIcon status={status} icon={icon} />
    <span className="ai-trace-title">{title}</span>
    {description && <span className="ai-trace-description">{description}</span>}
    {hasContent && <UiIcon slot="chevron-right" size={14} className="ai-trace-chevron" aria-hidden="true" />}
  </>;
  return <section className={cn('ai-surface ai-trace', className)} data-status={status} data-open={isOpen || undefined}>
    <div className="ai-trace-row">
      {hasContent
        ? <button type="button" className="ai-trace-line" aria-expanded={isOpen} aria-controls={id} onClick={toggle}>{line}</button>
        : <div className="ai-trace-line" data-static="">{line}</div>}
      {trailing && <div className="ai-trace-trailing">{trailing}</div>}
    </div>
    {hasContent && (isOpen || keepMounted) && <div id={id} className="ai-trace-content" hidden={!isOpen}>{children}</div>}
  </section>;
}
