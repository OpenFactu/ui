import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { aiLabels } from './labels';
import type { AIUIProps } from './types';
import { AITrace, type AITraceStatus } from './AITrace';
import { AICopyButton, AIIconButton } from './internal/ui';
import { formatDuration, parseStackTrace, stripAnsi, summarizeTests, suiteStatus, type AIParsedStack, type AIStackFrame, type AITestCase, type AITestSuite } from './internal/elements';

export type { AIParsedStack, AIStackFrame, AITestCase, AITestSuite, AITestStatus } from './internal/elements';

// ── Terminal ───────────────────────────────────────────────────────────

export interface AITerminalProps extends AIUIProps {
  command: string;
  output?: string;
  streaming?: boolean;
  /** Distinto de 0 marca el comando como fallido. */
  exitCode?: number;
  onClear?: () => void;
  /** Sigue el final de la salida mientras llega. Por defecto sí. */
  autoScroll?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
/** Un comando que ejecutó el agente, con su salida en vivo. Los códigos ANSI se quitan, no se interpretan. */
export const AITerminal = React.memo(function AITerminal({ command, output = '', streaming, exitCode, onClear, autoScroll = true, open, defaultOpen, onOpenChange, labels, className }: AITerminalProps) {
  const l = aiLabels(labels);
  const text = React.useMemo(() => stripAnsi(output), [output]);
  const failed = exitCode !== undefined && exitCode !== 0;
  const ref = React.useRef<HTMLPreElement>(null);
  React.useEffect(() => { const el = ref.current; if (el && autoScroll && streaming) el.scrollTop = el.scrollHeight; }, [text, autoScroll, streaming]);
  const status: AITraceStatus = streaming ? 'running' : failed ? 'error' : 'none';
  return <AITrace className={cn('ai-terminal', className)} status={status} icon={<UiIcon slot="square-terminal" size={14} />} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}
    title={<>{streaming ? l.running2 : failed ? l.failed : l.ran} <code className="ai-inline-code">{command}</code></>}
    description={failed ? `${l.exitCode} ${exitCode}` : undefined}
    trailing={<>{text && <AICopyButton text={text} labels={labels} />}{onClear && !streaming && <AIIconButton label={l.clearOutput2} onClick={onClear}><UiIcon slot="trash-2" size={14} /></AIIconButton>}</>}>
    <pre ref={ref} className="ai-terminal-output" tabIndex={0} aria-label={l.output}>{text || <span className="ai-muted">{l.noOutput}</span>}</pre>
  </AITrace>;
});

// ── Stack trace ────────────────────────────────────────────────────────

export interface AIStackTraceProps extends AIUIProps {
  /** El `error.stack` tal cual, o ya leído con `parseStackTrace`. */
  trace: string | AIParsedStack;
  /** Convierte las trazas propias en enlaces. Recibe el archivo y la línea. */
  onFilePathClick?: (file: string, line?: number, column?: number) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}
function Frame({ frame, onClick }: { frame: AIStackFrame; onClick?: AIStackTraceProps['onFilePathClick'] }) {
  const where = `${frame.file}${frame.line !== undefined ? `:${frame.line}` : ''}`;
  const label = <>{frame.fn && <><span className="ai-frame-fn">{frame.fn}</span> <span className="ai-frame-in">in</span> </>}<span className="ai-frame-file">{where}</span></>;
  return <li className="ai-frame" data-internal={frame.internal || undefined}>
    <UiIcon slot="file-code-2" size={14} aria-hidden="true" />
    {onClick && !frame.internal
      ? <button type="button" className="ai-frame-link" onClick={() => onClick(frame.file, frame.line, frame.column)}>{label}</button>
      : <span>{label}</span>}
  </li>;
}
/** Una herramienta que falló, en una línea: tipo y mensaje arriba, trazas al abrir, las internas plegadas aparte. */
export const AIStackTrace = React.memo(function AIStackTrace({ trace, onFilePathClick, open, defaultOpen, onOpenChange, labels, className }: AIStackTraceProps) {
  const l = aiLabels(labels);
  const parsed = React.useMemo(() => typeof trace === 'string' ? parseStackTrace(trace) : trace, [trace]);
  const own = parsed.frames.filter(frame => !frame.internal); const internal = parsed.frames.filter(frame => frame.internal);
  const full = `${parsed.type ? `${parsed.type}: ` : ''}${parsed.message}`;
  const raw = typeof trace === 'string' ? trace : [full, ...parsed.frames.map(frame => `    ${frame.raw}`)].join('\n');
  return <AITrace className={cn('ai-stack', className)} status="error" icon={<UiIcon slot="triangle-alert" size={14} />} open={open} defaultOpen={defaultOpen} onOpenChange={onOpenChange}
    title={`${l.failed}: ${full}`} trailing={<AICopyButton text={raw} labels={labels} />}>
    <div className="ai-stack-error" role="alert"><strong>{parsed.type}</strong>{parsed.type ? ' ' : ''}<span>{parsed.message}</span></div>
    {!!own.length && <ul className="ai-frames" aria-label={l.stackFrames}>{own.map((frame, index) => <Frame key={index} frame={frame} onClick={onFilePathClick} />)}</ul>}
    {!!internal.length && <AITrace className="ai-stack-internal" icon={<UiIcon slot="layers" size={14} />} title={`${internal.length} ${l.frameworkFrames}`}>
      <ul className="ai-frames">{internal.map((frame, index) => <Frame key={index} frame={frame} />)}</ul>
    </AITrace>}
  </AITrace>;
});

// ── Resultados de pruebas ──────────────────────────────────────────────

export interface AITestResultsProps extends AIUIProps {
  suites: AITestSuite[];
  /** Duración total; si falta, se suman las de cada prueba. */
  durationMs?: number;
  defaultOpen?: boolean;
}
const testTrace = (status: AITestCase['status']): AITraceStatus => status === 'failed' ? 'error' : status === 'running' ? 'running' : status === 'skipped' ? 'pending' : 'done';
/** Una ejecución de pruebas: totales arriba, suites plegables (las que fallan se abren) y el error de cada prueba. */
export const AITestResults = React.memo(function AITestResults({ suites, durationMs, defaultOpen, labels, className }: AITestResultsProps) {
  const l = aiLabels(labels);
  const total = React.useMemo(() => summarizeTests(suites), [suites]);
  const status: AITraceStatus = total.running ? 'running' : total.failed ? 'error' : 'done';
  const duration = durationMs ?? total.durationMs;
  return <AITrace className={cn('ai-tests', className)} status={status} icon={<UiIcon slot="flask-conical" size={14} />} defaultOpen={defaultOpen ?? total.failed > 0} title={l.testResults}
    description={<>{total.tests} {l.tests}{total.failed ? ` · ${total.failed} ${l.testsFailed}` : ` · ${total.passed} ${l.testsPassed}`}{total.skipped ? ` · ${total.skipped} ${l.testsSkipped}` : ''}{duration ? ` · ${formatDuration(duration)}` : ''}</>}>
    {suites.map(suite => {
      const state = suiteStatus(suite);
      return <AITrace key={suite.name} status={testTrace(state)} defaultOpen={state === 'failed'} title={suite.name} description={`${suite.tests.length} ${l.tests}`}>
        <ul className="ai-steps">{suite.tests.map((test, index) => <li key={`${test.name}-${index}`} data-status={test.status}>
          <AITrace status={testTrace(test.status)} defaultOpen={test.status === 'failed'} title={test.name} description={test.durationMs !== undefined ? `${Math.round(test.durationMs)} ms` : undefined}>
            {test.error ? <div className="ai-test-error" role="alert"><p>{test.error.message}</p>{test.error.stack && <pre>{test.error.stack}</pre>}</div> : null}
          </AITrace>
        </li>)}</ul>
      </AITrace>;
    })}
  </AITrace>;
});
