import * as React from 'react';
import { UiIcon } from '../icons';
import { useAILabels } from './labels';
import { formatMessage } from '../i18n/format';
import type { AIUIProps } from './types';
import { AITrace, type AITraceStatus } from './AITrace';
import { planProgress, type AIStepStatus } from './internal/elements';

export type { AIStepStatus } from './internal/elements';
export interface AIPlanStep { id: string; title: string; description?: string; status: AIStepStatus }
const traceStatus = (status: AIStepStatus): AITraceStatus => status;

export interface AIPlanProps extends AIUIProps {
  steps: AIPlanStep[];
  title?: string;
  defaultOpen?: boolean;
}
/** Lo que el agente piensa hacer, con cuánto lleva («2 de 5 hechos»). Se actualiza en sitio al llegar nuevos estados. */
export const AIPlan = React.memo(function AIPlan({ steps, title, defaultOpen = true, labels, className }: AIPlanProps) {
  const l = useAILabels(labels);
  const { done, total } = planProgress(steps);
  const status: AITraceStatus = steps.some(step => step.status === 'error') ? 'error' : steps.some(step => step.status === 'running') ? 'running' : done === total && total > 0 ? 'done' : 'none';
  return <AITrace className={className} status={status} icon={<UiIcon slot="list-checks" size={14} />} defaultOpen={defaultOpen} title={title ?? l.plan}
    description={formatMessage(l.planProgressCount, { done, total })}>
    <div className="ai-plan-bar" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} aria-label={l.plan}><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
    <ol className="ai-steps">{steps.map(step => <li key={step.id} data-status={step.status}>
      <AITrace status={traceStatus(step.status)} title={step.title} description={step.description} />
    </li>)}</ol>
  </AITrace>;
});

export interface AIQueueItem { id: string; title: string; description?: string; status: 'todo' | 'running' | 'done' }
export interface AIQueueProps extends AIUIProps { items: AIQueueItem[]; defaultOpen?: boolean }
/** La lista de tareas del agente en dos grupos plegables: por hacer y completadas. */
export const AIQueue = React.memo(function AIQueue({ items, defaultOpen = true, labels, className }: AIQueueProps) {
  const l = useAILabels(labels);
  const pending = items.filter(item => item.status !== 'done'); const finished = items.filter(item => item.status === 'done');
  const group = (list: AIQueueItem[], title: string, icon: React.ReactNode, status: AITraceStatus, open: boolean) => list.length ? <AITrace status={status} icon={icon} defaultOpen={open} title={title} description={String(list.length)}>
    <ul className="ai-steps">{list.map(item => <li key={item.id} data-status={item.status}>
      <AITrace status={item.status === 'running' ? 'running' : item.status === 'done' ? 'done' : 'pending'} title={item.title} description={item.description} />
    </li>)}</ul>
  </AITrace> : null;
  return <div className={className}>
    {group(pending, l.todo, <UiIcon slot="list-todo" size={14} />, pending.some(item => item.status === 'running') ? 'running' : 'none', defaultOpen)}
    {group(finished, l.completed2, <UiIcon slot="list-checks" size={14} />, 'done', false)}
  </div>;
});
