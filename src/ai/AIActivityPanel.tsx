import * as React from 'react';
import { cn } from '../utils';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from '../components/internal/optionStyle';
import { useI18n } from '../i18n/I18nProvider';
import { useAILabels } from './labels';
import { AIToolStatusIcon, toolStatusLabel } from './AIToolCall';
import { getToolView, toolDisplayName, useRegisteredToolViews } from './toolViews';
import { formatDuration } from './internal/elements';
import type { AIMessageData, AIToolStatus, AIUIProps } from './types';

export interface AIActivityEntry {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  status: AIToolStatus;
  durationMs?: number;
  /** El mensaje del que sale, para ir a él. */
  messageId?: string;
  kind: 'tool' | 'step';
}

const STEP_STATUS: Record<string, AIToolStatus> = { pending: 'pending', todo: 'pending', running: 'running', done: 'completed', error: 'error' };

/** Todo lo que ha hecho el agente en una conversación, en orden: llamadas a herramientas, actividad y pasos. Puro. */
export function collectAIActivity(messages: readonly AIMessageData[]): AIActivityEntry[] {
  const entries: AIActivityEntry[] = [];
  for (const message of messages) {
    for (const part of message.parts) {
      if (part.type === 'tool') entries.push({ id: part.tool.id, title: part.tool.name, description: part.tool.description, status: part.tool.status, durationMs: part.tool.durationMs, messageId: message.id, kind: 'tool' });
      else if (part.type === 'activity') for (const step of part.steps) entries.push({ id: step.id, title: step.title, description: step.description, status: step.status, durationMs: step.durationMs, messageId: message.id, kind: 'step' });
      else if (part.type === 'steps') for (const step of part.steps) entries.push({ id: step.id, title: step.title, description: step.description, status: STEP_STATUS[step.status ?? 'done'] ?? 'completed', messageId: message.id, kind: 'step' });
    }
  }
  return entries;
}

/** Cuántas han terminado y el tiempo sumado. Lo cancelado o rechazado también ha terminado. */
export function summarizeAIActivity(entries: readonly AIActivityEntry[]): { done: number; total: number; durationMs: number; failed: number; active: number } {
  let done = 0; let durationMs = 0; let failed = 0; let active = 0;
  for (const entry of entries) {
    if (entry.status === 'running' || entry.status === 'pending' || entry.status === 'approval-required') active += 1; else done += 1;
    if (entry.status === 'error') failed += 1;
    durationMs += entry.durationMs ?? 0;
  }
  return { done, total: entries.length, durationMs, failed, active };
}

export interface AIActivityPanelProps extends AIUIProps {
  /** De aquí sale lo que hizo el agente… */
  messages?: readonly AIMessageData[];
  /** …o se lo das ya hecho. */
  entries?: readonly AIActivityEntry[];
  /** Pulsar una entrada: ir a su mensaje, abrir su detalle. */
  onSelect?: (entry: AIActivityEntry) => void;
  /** Pinta cada entrada. Recibe la de serie. */
  renderItem?: (entry: AIActivityEntry, state: ItemRenderState) => React.ReactNode;
  itemClassName?: ItemClassName<AIActivityEntry>;
  /** Qué mensaje poner si aún no ha hecho nada. */
  emptyMessage?: React.ReactNode;
}

/** Lo que ha hecho el agente, de un vistazo: qué pasos, en qué estado y cuánto han tardado. Para un panel lateral. */
export function AIActivityPanel({ messages, entries: entriesProp, onSelect, renderItem, itemClassName, emptyMessage, labels, className }: AIActivityPanelProps) {
  const l = useAILabels(labels);
  const { format } = useI18n();
  useRegisteredToolViews();
  const entries = React.useMemo(() => entriesProp ?? collectAIActivity(messages ?? []), [entriesProp, messages]);
  const summary = summarizeAIActivity(entries);
  return (
    <section className={cn('ai-surface ai-activity-panel', className)} aria-label={l.activity}>
      <header className="ai-activity-panel-head">
        <strong>{l.activity}</strong>
        {entries.length > 0 && (
          <span role="status">
            {format(l.activitySummary, { done: summary.done, total: summary.total })}
            {summary.durationMs > 0 && ` · ${formatDuration(summary.durationMs)}`}
          </span>
        )}
      </header>
      {entries.length > 0 && <div className="ai-activity-panel-bar" aria-hidden="true"><span style={{ width: `${(summary.done / summary.total) * 100}%` }} data-failed={summary.failed > 0 || undefined} /></div>}
      {entries.length === 0 ? <p className="ai-muted">{emptyMessage ?? l.activityEmpty}</p> : (
        <ol>
          {entries.map((entry) => {
            const name = entry.kind === 'tool' && typeof entry.title === 'string'
              ? toolDisplayName({ id: entry.id, name: entry.title, status: entry.status }, getToolView(entry.title))
              : entry.title;
            const body = (
              <>
                <AIToolStatusIcon status={entry.status} />
                <span className="ai-activity-panel-text">
                  <span>{name}</span>
                  {entry.description && <small>{entry.description}</small>}
                </span>
                <small className="ai-activity-panel-meta">{entry.durationMs !== undefined ? formatDuration(entry.durationMs) : toolStatusLabel(entry.status, l)}</small>
              </>
            );
            const state: ItemRenderState = { selected: false, highlighted: entry.status === 'running', disabled: false, query: '', label: name, content: body };
            const row = renderItem ? renderItem(entry, state) : body;
            return (
              <li key={`${entry.messageId ?? ''}-${entry.id}`} data-status={entry.status} className={cn('ai-activity-panel-item', resolveItemClass(itemClassName, entry, state))}>
                {onSelect ? <button type="button" onClick={() => onSelect(entry)}>{row}</button> : <div>{row}</div>}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
