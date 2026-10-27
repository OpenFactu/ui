import * as React from 'react';
import { UiIcon } from '../icons';
import { aiLabels } from './labels';
import type { AISource, AIUIProps } from './types';
import { AITrace, type AITraceStatus } from './AITrace';
import { formatDuration, hostOf } from './internal/elements';
import { safeUrl } from './internal/helpers';

export interface AIReasoningProps extends AIUIProps {
  /** Lo que el modelo «piensa»; se muestra tal cual, conservando saltos de línea. */
  text: string;
  streaming?: boolean;
  /** Se mide en el servidor (el SDK no cronometra el razonamiento). */
  durationMs?: number;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
/** Se abre mientras el modelo piensa y se cierra al terminar; lo que el usuario decide manualmente manda. */
export const AIReasoning = React.memo(function AIReasoning({ text, streaming, durationMs, open, defaultOpen, onOpenChange, labels, className }: AIReasoningProps) {
  const l = aiLabels(labels);
  const [auto, setAuto] = React.useState(!!streaming);
  const [manual, setManual] = React.useState<boolean | null>(null);
  React.useEffect(() => { if (streaming) { setAuto(true); setManual(null); } else setAuto(false); }, [streaming]);
  const isOpen = open ?? manual ?? (defaultOpen !== undefined && !streaming && manual === null && !auto ? defaultOpen : auto);
  return <AITrace className={className} status={streaming ? 'running' : 'done'} icon={streaming ? undefined : <UiIcon slot="brain" size={14} />} open={isOpen}
    onOpenChange={next => { setManual(next); onOpenChange?.(next); }}
    title={streaming ? `${l.thinking}…` : durationMs !== undefined ? `${l.thoughtFor} ${formatDuration(durationMs)}` : l.thought}>
    {text ? <p className="ai-reasoning-text">{text}</p> : null}
  </AITrace>;
});

export interface AIChainStep { id: string; title: string; description?: string; status?: 'pending' | 'running' | 'done' | 'error'; sources?: AISource[] }
export interface AIChainOfThoughtProps extends AIUIProps {
  steps: AIChainStep[];
  /** Por defecto: «Investigó en N pasos». */
  title?: string;
  defaultOpen?: boolean;
}
/** Resumen de lo que hizo el agente («Investigó en 3 pasos») que se abre en sus pasos. */
export const AIChainOfThought = React.memo(function AIChainOfThought({ steps, title, defaultOpen, labels, className }: AIChainOfThoughtProps) {
  const l = aiLabels(labels);
  const running = steps.some(step => step.status === 'running');
  const failed = steps.some(step => step.status === 'error');
  const status: AITraceStatus = running ? 'running' : failed ? 'error' : 'done';
  return <AITrace className={className} status={status} icon={<UiIcon slot="search" size={14} />} defaultOpen={defaultOpen} title={title ?? `${l.researched} ${steps.length} ${l.steps}`}>
    <ol className="ai-chain">{steps.map(step => <li key={step.id}>
      <AITrace status={step.status ?? 'done'} title={step.title} description={step.description} />
      {!!step.sources?.length && <ul className="ai-chain-sources">{step.sources.map(source => <li key={source.id}><a className="ai-chip" href={safeUrl(source.url)} target="_blank" rel="noreferrer noopener" title={source.title}>{hostOf(source.url)}</a></li>)}</ul>}
    </li>)}</ol>
  </AITrace>;
});
