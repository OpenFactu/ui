import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from '../components/Button';
import { cn } from '../utils';
import type { AITool, AIToolStatus, AIActivityStep, AIUIProps } from './types';
import { aiLabels, type AILabels } from './labels';
import { displayJson } from './internal/helpers';

function statusLabel(status: AIToolStatus, l: AILabels): string {
  return ({ pending: l.pending, running: l.running, 'approval-required': l.approval, completed: l.completed, error: l.error, cancelled: l.cancelled, denied: l.denied })[status];
}
function StatusIcon({ status }: { status: AIToolStatus }) {
  return status === 'running' ? <UiIcon slot="loader-2" size={14} className="ai-spinner" /> : status === 'completed' ? <UiIcon slot="check-circle-2" size={14} className="ai-pop" /> : status === 'error' || status === 'approval-required' ? <UiIcon slot="alert-circle" size={14} /> : status === 'denied' || status === 'cancelled' ? <UiIcon slot="x-circle" size={14} /> : <UiIcon slot="circle" size={14} />;
}
export interface AIToolCallProps extends AIUIProps { tool: AITool; onApprove?: (id: string) => void | Promise<void>; onReject?: (id: string) => void | Promise<void> }
export const AIToolCall = React.memo(function AIToolCall({ tool, onApprove, onReject, labels, className }: AIToolCallProps) {
  const l = aiLabels(labels);
  const [open, setOpen] = React.useState(tool.status === 'approval-required' || tool.status === 'error');
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  React.useEffect(() => { if (tool.status === 'approval-required' || tool.status === 'error') setOpen(true); }, [tool.status]);
  const act = async (callback: (id: string) => void | Promise<void>) => {
    if (busy) return; setBusy(true); setActionError('');
    try { await callback(tool.id); } catch (error) { setActionError(error instanceof Error ? error.message : l.error); } finally { setBusy(false); }
  };
  return <section className={cn('ai-surface ai-tool', className)} data-status={tool.status}>
    <button type="button" className="ai-disclosure" aria-expanded={open} onClick={() => setOpen(value => !value)}><UiIcon slot="wrench" size={14} /><strong>{tool.name}</strong><span className="ai-tool-state"><StatusIcon status={tool.status} />{statusLabel(tool.status, l)}</span><UiIcon slot="chevron-right" size={14} className={open ? 'ai-rotated' : undefined} /></button>
    {open && <div className="ai-tool-body">{tool.description && <p>{tool.description}</p>}
      {tool.input !== undefined && <div><h5>{l.toolInput}</h5><pre>{displayJson(tool.input)}</pre></div>}
      {tool.output !== undefined && <div><h5>{l.toolOutput}</h5><pre>{displayJson(tool.output)}</pre></div>}
      {(tool.error || actionError) && <p className="ai-error" role="alert">{tool.error || actionError}</p>}
      {tool.durationMs !== undefined && <small className="ai-muted">{(tool.durationMs / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s</small>}
      {tool.status === 'approval-required' && <div className="ai-inline-actions">{onApprove && <Button size="sm" disabled={busy} onClick={() => void act(onApprove)}>{l.approve}</Button>}{onReject && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act(onReject)}>{l.reject}</Button>}</div>}
    </div>}
  </section>;
});
export interface AIAgentActivityProps extends AIUIProps { steps: AIActivityStep[] }
export const AIAgentActivity = React.memo(function AIAgentActivity({ steps, labels, className }: AIAgentActivityProps) {
  const l = aiLabels(labels);
  const [open, setOpen] = React.useState(true);
  return <section className={cn('ai-surface ai-activity', className)} aria-label={l.activity}>
    <button type="button" className="ai-disclosure" aria-expanded={open} onClick={() => setOpen(value => !value)}><UiIcon slot="chevron-right" size={14} className={open ? 'ai-rotated' : undefined} /><strong>{l.activity}</strong><span className="ai-muted">{steps.filter(step => step.status === 'completed').length}/{steps.length}</span></button>
    {open && <ol>{steps.map(step => <li key={step.id} data-status={step.status}><StatusIcon status={step.status} /><div><span>{step.title}</span>{step.description && <small>{step.description}</small>}</div><small>{statusLabel(step.status, l)}{step.durationMs !== undefined ? ` · ${(step.durationMs / 1000).toFixed(1)} s` : ''}</small></li>)}</ol>}
  </section>;
});
