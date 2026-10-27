import * as React from 'react';
import { UiIcon } from '../icons';
import { CodeEditor } from '../components/CodeEditor';
import { DropdownMenu } from '../components/DropdownMenu';
import { tokenizeCode } from '../components/code-editor/languages';
import { CodeHighlight } from '../components/code-editor/CodeHighlight';
import { editorThemeStyle } from '../components/code-editor/themes';
import { cn } from '../utils';
import { aiLabels, type AILabels } from './labels';
import type { AIUIProps } from './types';
import { AICopyButton, AIIconButton } from './internal/ui';
import { downloadText } from './internal/helpers';
import { codeExtension, codeLanguageDefinition, resolveCodeLanguage } from './internal/code';
import { useAICode, useCodeActions, type AICodeAction, type AICodeActionContext } from './codeActions';

export interface AICodeBlockProps extends AIUIProps {
  code: string; language?: string; title?: string;
  onOpen?: (code: string, language?: string) => void;
  /** Sustituyen a los de `AICodeProvider` para este bloque. */
  onApply?: (code: string, language?: string) => void | Promise<void>;
  onRun?: (code: string, language?: string) => string | void | Promise<string | void>;
  /** Acciones extra solo para este bloque. */
  actions?: AICodeAction[];
  /** Cuántas acciones de IA se muestran con texto antes de pasar al menú. Por defecto 2. */
  maxInlineActions?: number;
}
const NO_MATCHES: readonly { start: number; end: number }[] = [];

/** Acciones de IA en línea + menú «más», compartido por bloques y selección. */
export function AICodeActionBar({ actions, context, max = 2, labels, className }: AIUIProps & { actions: AICodeAction[]; context: AICodeActionContext; max?: number }) {
  const l = aiLabels(labels);
  if (!actions.length) return null;
  const inline = actions.slice(0, max); const rest = actions.slice(max);
  return <div className={cn('ai-code-actions', className)} role="group" aria-label={l.codeActions}>
    {inline.map(action => <button type="button" key={action.id} className="ai-code-action" title={action.description ?? action.label} onMouseDown={event => event.preventDefault()} onClick={() => void action.run(context)}>{action.icon}<span>{action.label}</span></button>)}
    {!!rest.length && <DropdownMenu align="end" items={rest.map(action => ({ label: action.label, icon: action.icon, onClick: () => void action.run(context) }))}>
      <span className="ai-code-action ai-code-action-more"><UiIcon slot="more-horizontal" size={14} /><span className="ai-sr-only">{l.moreCodeActions}</span></span>
    </DropdownMenu>}
  </div>;
}

type RunState = { status: 'idle' } | { status: 'running' } | { status: 'done'; output?: string } | { status: 'error'; output: string };
function RunOutput({ state, onClear, l }: { state: RunState; onClear: () => void; l: AILabels }) {
  if (state.status === 'idle' || (state.status === 'done' && !state.output)) return null;
  return <div className="ai-code-output" data-status={state.status}>
    <div className="ai-code-output-header"><span>{l.output}</span>{state.status !== 'running' && <AIIconButton label={l.clearOutput} onClick={onClear}><UiIcon slot="x" size={12} /></AIIconButton>}</div>
    {state.status === 'running' ? <p role="status" className="ai-status"><UiIcon slot="loader-2" size={13} className="ai-spinner" />{l.runningCode}</p>
      : <pre role={state.status === 'error' ? 'alert' : 'status'}>{state.output}</pre>}
  </div>;
}

export const AICodeBlock = React.memo(function AICodeBlock({ code, language = 'plaintext', title, onOpen, onApply, onRun, actions: extra, maxInlineActions = 2, labels, className }: AICodeBlockProps) {
  const l = aiLabels(labels); const handlers = useAICode();
  const apply = onApply ?? handlers.onApplyCode; const run = onRun ?? handlers.onRunCode;
  const [expanded, setExpanded] = React.useState(false);
  const [applied, setApplied] = React.useState(false);
  const [runState, setRunState] = React.useState<RunState>({ status: 'idle' });
  const mounted = React.useRef(true); const timer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  React.useEffect(() => () => { mounted.current = false; clearTimeout(timer.current); }, []);
  const resolved = resolveCodeLanguage(language);
  const definition = codeLanguageDefinition(language);
  const { preview, long } = React.useMemo(() => { const lines = code.split('\n'); return { preview: lines.slice(0, 24).join('\n'), long: lines.length > 24 }; }, [code]);
  const tokens = React.useMemo(() => tokenizeCode(preview, definition), [preview, definition]);
  const context: AICodeActionContext = { code, language: resolved, title, source: 'block', ask: handlers.onAsk, apply: apply ? next => void apply(next, resolved) : undefined };
  const codeActions = useCodeActions('block', context, extra);
  const execute = async () => {
    if (!run || runState.status === 'running') return;
    setRunState({ status: 'running' });
    try { const output = await run(code, resolved); if (mounted.current) setRunState({ status: 'done', output: output ?? undefined }); }
    catch (cause) { if (mounted.current) setRunState({ status: 'error', output: cause instanceof Error ? cause.message : l.runError }); }
  };
  return <div className={cn('ai-surface ai-code', className)} style={editorThemeStyle('auto')}>
    <div className="ai-code-header"><span className="ai-code-title">{title ?? definition.label}</span>
      <AICodeActionBar actions={codeActions} context={context} max={maxInlineActions} labels={labels} />
      <div className="ai-inline-actions">
        {onOpen && <AIIconButton label={l.openResult} onClick={() => onOpen(code, language)}><UiIcon slot="panel-right-open" size={14} /></AIIconButton>}
        <AIIconButton label={l.download} onClick={() => downloadText(code, `code.${codeExtension(language)}`)}><UiIcon slot="download" size={14} /></AIIconButton>
        <AICopyButton text={code} labels={labels} />
        {run && <button type="button" className="ai-code-primary" data-variant="run" disabled={runState.status === 'running'} onClick={() => void execute()}>{runState.status === 'running' ? <UiIcon slot="loader-2" size={13} className="ai-spinner" /> : <UiIcon slot="play" size={13} />}<span>{runState.status === 'idle' ? l.run : l.runAgain}</span></button>}
        {apply && <button type="button" className="ai-code-primary" data-applied={applied || undefined} onClick={async () => {
          await apply(code, resolved); if (!mounted.current) return;
          setApplied(true); clearTimeout(timer.current); timer.current = setTimeout(() => mounted.current && setApplied(false), 2000);
        }}>{applied ? <UiIcon slot="check" size={13} className="ai-pop" /> : <UiIcon slot="corner-down-left" size={13} />}<span>{applied ? l.applied : l.apply}</span></button>}
      </div></div>
    {expanded && long ? <CodeEditor aria-label={title ?? l.code} value={code} onChange={() => {}} language={resolved} minimal readOnly height={360} />
      : <pre className="ai-code-preview"><code><CodeHighlight value={preview} tokens={tokens} matches={NO_MATCHES} active={-1} start={0} stop={preview.length} /></code></pre>}
    {long && <button type="button" className="ai-code-expand" onClick={() => setExpanded(value => !value)}>{expanded ? <UiIcon slot="chevron-up" size={13} /> : <UiIcon slot="chevron-down" size={13} />}{expanded ? l.collapseCode : `${l.expandCode} (${code.split('\n').length})`}</button>}
    <RunOutput state={runState} onClear={() => setRunState({ status: 'idle' })} l={l} />
  </div>;
});
