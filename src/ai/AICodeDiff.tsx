import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from '../components/Button';
import { tokenizeCode } from '../components/code-editor/languages';
import { CodeHighlight } from '../components/code-editor/CodeHighlight';
import { editorThemeStyle } from '../components/code-editor/themes';
import { cn } from '../utils';
import { aiLabels } from './labels';
import type { AIUIProps } from './types';
import { AICopyButton } from './internal/ui';
import { codeLanguageDefinition } from './internal/code';
import { diffRows, diffStats, lineDiff } from './internal/diff';
import { useAICode } from './codeActions';

export { lineDiff, diffRows, diffStats, type AIDiffLine, type AIDiffRow } from './internal/diff';
export type AICodeDiffStatus = 'pending' | 'accepted' | 'rejected';
export interface AICodeDiffProps extends AIUIProps {
  /** Identifica la propuesta ante `onAcceptDiff` / `onRejectDiff` del `AICodeProvider`. */
  id?: string;
  original: string;
  modified: string;
  language?: string;
  title?: string;
  status?: AICodeDiffStatus;
  /** Sustituyen a los del proveedor. Sin ninguno de los dos, el diff es solo de lectura. */
  onAccept?: () => void | Promise<void>;
  onReject?: () => void | Promise<void>;
  /** Líneas sin cambios que se muestran alrededor de cada cambio. Por defecto 3. */
  context?: number;
}
const NO_MATCHES: readonly { start: number; end: number }[] = [];

const DiffCode = React.memo(function DiffCode({ text, language }: { text: string; language?: string }) {
  const tokens = React.useMemo(() => tokenizeCode(text, codeLanguageDefinition(language)), [text, language]);
  return <CodeHighlight value={text} tokens={tokens} matches={NO_MATCHES} active={-1} start={0} stop={text.length} />;
});

/** Cambios propuestos sobre un código, en vista unificada, con aceptar y descartar. */
export const AICodeDiff = React.memo(function AICodeDiff({ id, original, modified, language, title, status = 'pending', onAccept, onReject, context = 3, labels, className }: AICodeDiffProps) {
  const l = aiLabels(labels); const handlers = useAICode();
  const accept = onAccept ?? (id && handlers.onAcceptDiff ? () => handlers.onAcceptDiff!(id) : undefined);
  const reject = onReject ?? (id && handlers.onRejectDiff ? () => handlers.onRejectDiff!(id) : undefined);
  const lines = React.useMemo(() => lineDiff(original, modified), [original, modified]);
  const stats = React.useMemo(() => diffStats(lines), [lines]);
  const [expanded, setExpanded] = React.useState<ReadonlySet<number>>(() => new Set());
  const rows = React.useMemo(() => diffRows(lines, context, expanded), [lines, context, expanded]);
  const [busy, setBusy] = React.useState(false); const [error, setError] = React.useState('');
  const act = async (callback: () => void | Promise<void>) => {
    if (busy) return; setBusy(true); setError('');
    try { await callback(); } catch (cause) { setError(cause instanceof Error ? cause.message : l.error); } finally { setBusy(false); }
  };
  const width = `${Math.max(2, String(Math.max(lines.length, 1)).length)}ch`;
  return <section className={cn('ai-surface ai-diff', className)} data-status={status} aria-label={title ?? l.proposedChanges} style={{ ...editorThemeStyle('auto'), '--ai-diff-gutter': width } as React.CSSProperties}>
    <header className="ai-diff-header">
      <UiIcon slot="file-diff" size={14} aria-hidden="true" /><strong>{title ?? l.proposedChanges}</strong>
      <span className="ai-diff-stats"><span data-kind="add">+{stats.added}<span className="ai-sr-only"> {l.addedLines}</span></span><span data-kind="remove">−{stats.removed}<span className="ai-sr-only"> {l.removedLines}</span></span></span>
      <span className="ai-tools-spacer" />
      <AICopyButton text={modified} labels={labels} />
    </header>
    <div className="ai-diff-body"><div className="ai-diff-lines">
      {rows.map(row => row.type === 'skip'
        ? <button type="button" key={`skip-${row.from}`} className="ai-diff-skip" onClick={() => setExpanded(current => new Set(current).add(row.from))}><UiIcon slot="chevrons-up-down" size={13} aria-hidden="true" />{l.showUnchanged} {row.count} {l.unchangedLines}</button>
        : <div key={`${row.type}-${row.oldLine ?? ''}-${row.newLine ?? ''}`} className="ai-diff-line" data-type={row.type}>
          <span className="ai-diff-num" aria-hidden="true">{row.oldLine ?? ''}</span><span className="ai-diff-num" aria-hidden="true">{row.newLine ?? ''}</span>
          <span className="ai-diff-sign" aria-hidden="true">{row.type === 'add' ? '+' : row.type === 'remove' ? '−' : ''}</span>
          {row.type === 'add' ? <ins><DiffCode text={row.text} language={language} /></ins> : row.type === 'remove' ? <del><DiffCode text={row.text} language={language} /></del> : <span><DiffCode text={row.text} language={language} /></span>}
        </div>)}
    </div></div>
    {status === 'pending' ? (accept || reject) && <footer className="ai-diff-footer">
      {error && <p className="ai-error" role="alert">{error}</p>}
      <span className="ai-tools-spacer" />
      {reject && <Button size="sm" variant="secondary" disabled={busy} onClick={() => void act(reject)}><UiIcon slot="x" size={14} />{l.discardChanges}</Button>}
      {accept && <Button size="sm" disabled={busy} onClick={() => void act(accept)}><UiIcon slot="check" size={14} />{l.acceptChanges}</Button>}
    </footer> : <footer className="ai-diff-footer"><p className="ai-diff-result" role="status">{status === 'accepted' ? <UiIcon slot="check" size={14} className="ai-pop" /> : <UiIcon slot="x" size={14} />}{status === 'accepted' ? l.changesAccepted : l.changesDiscarded}</p></footer>}
  </section>;
});
