import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from '../components/Button';
import { cn } from '../utils';
import type { AITool, AIToolStatus, AIActivityStep, AIUIProps } from './types';
import { useAILabels, type AILabels } from './labels';
import { displayJson } from './internal/helpers';
import { useComponentDefaults } from '../context/ComponentDefaults';
import { useI18n } from '../i18n/I18nProvider';
import { ToolViewBoundary, getToolView, toolDisplayName, useRegisteredToolViews, type AIToolViewDefinition } from './toolViews';

function statusLabel(status: AIToolStatus, l: AILabels): string {
  return ({ pending: l.pending, running: l.running, 'approval-required': l.approval, completed: l.completed, error: l.error, cancelled: l.cancelled, denied: l.denied })[status];
}
function StatusIcon({ status }: { status: AIToolStatus }) {
  return status === 'running' ? <UiIcon slot="loader-2" size={14} className="ai-spinner" /> : status === 'completed' ? <UiIcon slot="check-circle-2" size={14} className="ai-pop" /> : status === 'error' || status === 'approval-required' ? <UiIcon slot="alert-circle" size={14} /> : status === 'denied' || status === 'cancelled' ? <UiIcon slot="x-circle" size={14} /> : <UiIcon slot="circle" size={14} />;
}
export interface AIToolCallProps extends AIUIProps {
  tool: AITool;
  onApprove?: (id: string) => void | Promise<void>;
  onReject?: (id: string) => void | Promise<void>;
  /** Vista de esta llamada; gana a la registrada con `registerToolView`. */
  view?: AIToolViewDefinition;
}
export const AIToolCall = React.memo(function AIToolCall(rawProps: AIToolCallProps) {
  const { tool, onApprove, onReject, view: viewProp, labels, className } = useComponentDefaults('AIToolCall', rawProps);
  const l = useAILabels(labels);
  useRegisteredToolViews();
  const view = viewProp ?? getToolView(tool.name);
  const raw = <>
    {tool.input !== undefined && <div><h5>{l.toolInput}</h5><pre>{displayJson(tool.input, l.unserializable)}</pre></div>}
    {tool.output !== undefined && <div><h5>{l.toolOutput}</h5><pre>{displayJson(tool.output, l.unserializable)}</pre></div>}
  </>;
  const summary = view?.summary?.(tool);
  const [open, setOpen] = React.useState(tool.status === 'approval-required' || tool.status === 'error');
  const [busy, setBusy] = React.useState(false);
  const [actionError, setActionError] = React.useState('');
  React.useEffect(() => { if (tool.status === 'approval-required' || tool.status === 'error') setOpen(true); }, [tool.status]);
  const act = async (callback: (id: string) => void | Promise<void>) => {
    if (busy) return; setBusy(true); setActionError('');
    try { await callback(tool.id); } catch (error) { setActionError(error instanceof Error ? error.message : l.error); } finally { setBusy(false); }
  };
  return <section className={cn('ai-surface ai-tool', className)} data-status={tool.status}>
    <button type="button" data-k-focus-inset="" className="ai-disclosure" aria-expanded={open} onClick={() => setOpen(value => !value)}>{view?.icon ?? <UiIcon slot="wrench" size={14} />}<strong>{toolDisplayName(tool, view)}</strong>{summary != null && summary !== false && <span className="ai-tool-summary">{summary}</span>}<span className="ai-tool-state"><StatusIcon status={tool.status} />{statusLabel(tool.status, l)}{tool.status === 'completed' && tool.durationMs !== undefined ? ` · ${(tool.durationMs / 1000).toLocaleString('es-ES', { maximumFractionDigits: 1 })} s` : ''}</span><UiIcon slot="chevron-right" size={14} className={open ? 'ai-rotated' : undefined} /></button>
    {open && <div className="ai-tool-body">{tool.status === 'approval-required' && <p className="ai-tool-ask"><UiIcon slot="alert-triangle" size={14} />{l.approvalPrompt}</p>}{tool.description && <p>{tool.description}</p>}
      {view?.render
        ? <ToolViewBoundary fallback={raw} resetKey={tool.output}><ToolBody view={view} tool={tool} raw={raw} /></ToolViewBoundary>
        : raw}
      {(tool.error || actionError) && <p className="ai-error" role="alert">{tool.error || actionError}</p>}
      {tool.status === 'approval-required' && <div className="ai-inline-actions">{onApprove && <Button size="sm" disabled={busy} onClick={() => void act(onApprove)}><UiIcon slot="check" size={14} />{l.approve}</Button>}{onReject && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act(onReject)}>{l.reject}</Button>}</div>}
    </div>}
  </section>;
});
/** El cuerpo de una vista: si devuelve `undefined`, lo de serie. Va aparte para que un fallo lo recoja el límite de errores. */
function ToolBody({ view, tool, raw }: { view: AIToolViewDefinition; tool: AITool; raw: React.ReactNode }) {
  const body = view.render!({ tool, input: tool.input, output: tool.output, raw });
  return <>{body === undefined ? raw : body}</>;
}

export interface AIToolGroupProps extends AIUIProps {
  tools: AITool[];
  onApprove?: (id: string) => void | Promise<void>;
  onReject?: (id: string) => void | Promise<void>;
}
const needsAttention = (tool: AITool) => tool.status === 'approval-required' || tool.status === 'error';
const isActive = (tool: AITool) => tool.status === 'running' || tool.status === 'pending';

/**
 * Varias llamadas seguidas, en una línea («3 acciones»). Se ve abierto mientras algo está en marcha o necesita a la
 * persona, y se pliega solo al terminar, salvo que ella lo haya tocado.
 */
export const AIToolGroup = React.memo(function AIToolGroup({ tools, onApprove, onReject, labels, className }: AIToolGroupProps) {
  const l = useAILabels(labels);
  const { format } = useI18n();
  useRegisteredToolViews();
  const attention = tools.some(needsAttention);
  const active = tools.some(isActive);
  const [choice, setChoice] = React.useState<boolean | null>(null);
  // Lo que necesita a la persona se abre aunque ella lo hubiera plegado.
  React.useEffect(() => { if (attention) setChoice(null); }, [attention]);
  const open = choice ?? (attention || active);
  const names = tools.map((tool) => toolDisplayName(tool, getToolView(tool.name))).join(', ');
  const status: AIToolStatus = attention ? tools.find(needsAttention)!.status : active ? 'running' : 'completed';
  return (
    <section className={cn('ai-surface ai-tool ai-tool-group', className)} data-status={status} aria-label={format(l.toolGroup, { count: tools.length })}>
      <button type="button" data-k-focus-inset="" className="ai-disclosure" aria-expanded={open} onClick={() => setChoice(!open)}>
        <UiIcon slot="chevron-right" size={14} className={open ? 'ai-rotated' : undefined} />
        <strong>{format(l.toolGroup, { count: tools.length })}</strong>
        {!open && <span className="ai-tool-summary">{names}</span>}
        <span className="ai-tool-state"><StatusIcon status={status} />{statusLabel(status, l)}</span>
      </button>
      {open && <div className="ai-tool-group-list">{tools.map((tool) => <AIToolCall key={tool.id} tool={tool} onApprove={onApprove} onReject={onReject} labels={labels} />)}</div>}
    </section>
  );
});

export interface AIAgentActivityProps extends AIUIProps { steps: AIActivityStep[] }
export const AIAgentActivity = React.memo(function AIAgentActivity({ steps, labels, className }: AIAgentActivityProps) {
  const l = useAILabels(labels);
  const [open, setOpen] = React.useState(true);
  return <section className={cn('ai-surface ai-activity', className)} aria-label={l.activity}>
    <button type="button" data-k-focus-inset="" className="ai-disclosure" aria-expanded={open} onClick={() => setOpen(value => !value)}><UiIcon slot="chevron-right" size={14} className={open ? 'ai-rotated' : undefined} /><strong>{l.activity}</strong><span className="ai-muted">{steps.filter(step => step.status === 'completed').length}/{steps.length}</span></button>
    {open && <ol>{steps.map(step => <li key={step.id} data-status={step.status}><StatusIcon status={step.status} /><div><span>{step.title}</span>{step.description && <small>{step.description}</small>}</div><small>{statusLabel(step.status, l)}{step.durationMs !== undefined ? ` · ${(step.durationMs / 1000).toFixed(1)} s` : ''}</small></li>)}</ol>}
  </section>;
});
