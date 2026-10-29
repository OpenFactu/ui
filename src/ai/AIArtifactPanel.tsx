import * as React from 'react';
import { UiIcon } from '../icons';
import { CodeEditor } from '../components/CodeEditor';
import { Table } from '../components/Table';
import { cn } from '../utils';
import { useAILabels } from './labels';
import type { AIArtifact, AIArtifactRenderer, AIUIProps } from './types';
import { AIIconButton, AICopyButton } from './internal/ui';
import { artifactContent, displayJson, downloadText, htmlPreviewDocument, safeUrl } from './internal/helpers';
import { AIMarkdown } from './AIMarkdown';
import { AICodeActionBar } from './AICodeBlock';
import { useAICode, useCodeActions, type AICodeSelection } from './codeActions';

/** Editor de un artefacto de código con acciones de IA sobre la selección. */
function CodeArtifact({ artifact, onChange, labels }: AIUIProps & { artifact: Extract<AIArtifact, { content: string }>; onChange?: (id: string, content: string) => void }) {
  const l = useAILabels(labels); const handlers = useAICode();
  const [selection, setSelection] = React.useState<AICodeSelection | null>(null);
  const editable = !!onChange && artifact.editable !== false;
  const context = { code: artifact.content, language: artifact.language, title: artifact.title, source: 'artifact' as const, artifactId: artifact.id, selection: selection ?? undefined, ask: handlers.onAsk,
    apply: editable && selection ? (next: string) => { onChange!(artifact.id, artifact.content.slice(0, selection.start) + next + artifact.content.slice(selection.end)); setSelection(null); } : undefined };
  const actions = useCodeActions('selection', context);
  return <div className="ai-code-artifact" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSelection(null); }}>
    <CodeEditor aria-label={artifact.title} value={artifact.content} onChange={content => onChange?.(artifact.id, content)} language={artifact.kind === 'html' ? 'html' : artifact.kind === 'markdown' ? 'markdown' : artifact.language} readOnly={!editable} minimal height="100%"
      onSelect={event => { const { selectionStart: start, selectionEnd: end, value } = event.currentTarget; setSelection(end > start ? { start, end, text: value.slice(start, end) } : null); }} />
    {selection && actions.length > 0 && <div className="ai-selection-bar" role="toolbar" aria-label={l.selectionActions}><AICodeActionBar actions={actions} context={context} max={3} labels={labels} /></div>}
  </div>;
}

export interface AIArtifactPanelProps extends AIUIProps {
  artifacts: AIArtifact[]; value?: string; onSelect: (id: string) => void; onClose?: (id: string) => void;
  onChange?: (id: string, content: string) => void; onDownload?: (artifact: AIArtifact) => void;
  renderers?: Partial<Record<AIArtifact['kind'], AIArtifactRenderer>>;
}
function ArtifactView({ artifact, mode, onChange, renderers, labels }: Omit<AIArtifactPanelProps, 'artifacts' | 'onSelect'> & { artifact: AIArtifact; mode: 'preview' | 'code' }) {
  const l = useAILabels(labels);
  const document = React.useMemo(() => artifact.kind === 'html' ? htmlPreviewDocument(artifact.content) : '', [artifact]);
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => setImageFailed(false), [artifact.id]);
  if (renderers?.[artifact.kind]) return <>{renderers[artifact.kind]!(artifact)}</>;
  if (artifact.kind === 'code') return <CodeArtifact artifact={artifact} onChange={onChange} labels={labels} />;
  if ((artifact.kind === 'html' || artifact.kind === 'markdown') && mode === 'code') return <CodeArtifact artifact={artifact} onChange={onChange} labels={labels} />;
  if (artifact.kind === 'markdown') return <AIMarkdown labels={labels}>{artifact.content}</AIMarkdown>;
  if (artifact.kind === 'html') return <iframe className="ai-html-preview" title={artifact.title} sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={document} />;
  if (artifact.kind === 'table') return <Table<Record<string, unknown>> data={artifact.rows} rowKey={(_, index) => index} columns={artifact.columns.map(column => ({ id: column.key, header: column.label, cell: row => displayJson(row[column.key], l.unserializable) }))} emptyMessage={l.noResults} />;
  if (artifact.kind === 'image') return imageFailed || !safeUrl(artifact.url, 'media') ? <p className="ai-muted">{l.imageUnavailable}</p> : <img className="ai-artifact-image" src={safeUrl(artifact.url, 'media')} alt={artifact.alt ?? artifact.title} onError={() => setImageFailed(true)} />;
  if (artifact.kind === 'file') return <div className="ai-file-result"><UiIcon slot="file" size={32} /><strong>{artifact.title}</strong><p>{l.unsupportedFile}</p>{safeUrl(artifact.url, 'media') && <a className="ai-text-button" href={safeUrl(artifact.url, 'media')} download={artifact.filename ?? artifact.title}>{l.download}</a>}</div>;
  return null;
}
export function AIArtifactPanel({ artifacts, value, onSelect, onClose, onChange, onDownload, renderers, labels, className }: AIArtifactPanelProps) {
  const l = useAILabels(labels);
  const artifact = artifacts.find(item => item.id === value) ?? artifacts[0];
  const [mode, setMode] = React.useState<'preview' | 'code'>('preview');
  const id = React.useId();
  React.useEffect(() => setMode('preview'), [artifact?.id]);
  const tabsRef = React.useRef<HTMLDivElement>(null);
  if (!artifact) return <aside className={cn('ai-surface ai-artifact-panel ai-artifact-empty', className)}><UiIcon slot="file" size={26} /><p>{l.noResults}</p></aside>;
  const canSource = artifact.kind === 'html' || artifact.kind === 'markdown';
  return <aside className={cn('ai-surface ai-artifact-panel', className)} aria-label={l.results}>
    <div className="ai-artifact-tabs" role="tablist" aria-label={l.results} ref={tabsRef} onKeyDown={event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key) || (event.target as HTMLElement).getAttribute('role') !== 'tab') return;
      event.preventDefault(); const current = artifacts.findIndex(item => item.id === artifact.id);
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? artifacts.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + artifacts.length) % artifacts.length;
      onSelect(artifacts[next].id); (tabsRef.current?.querySelectorAll('[role="tab"]')[next] as HTMLElement)?.focus();
    }}>{artifacts.map(item => <div className="ai-artifact-tab" key={item.id}><button type="button" role="tab" id={`${id}-${item.id}`} aria-controls={`${id}-panel`} aria-selected={item.id === artifact.id} tabIndex={item.id === artifact.id ? 0 : -1} onClick={() => onSelect(item.id)}>{item.title}</button>{onClose && <AIIconButton label={`${l.close}: ${item.title}`} onClick={() => onClose(item.id)}><UiIcon slot="x" size={12} /></AIIconButton>}</div>)}</div>
    <div className="ai-artifact-toolbar"><strong>{artifact.title}</strong><div className="ai-inline-actions">
      {canSource && <AIIconButton label={mode === 'preview' ? l.code : l.preview} onClick={() => setMode(current => current === 'preview' ? 'code' : 'preview')}>{mode === 'preview' ? <UiIcon slot="code-2" size={14} /> : <UiIcon slot="eye" size={14} />}</AIIconButton>}
      <AICopyButton text={artifactContent(artifact)} labels={labels} />
      <AIIconButton label={l.download} onClick={() => {
        if (onDownload) { onDownload(artifact); return; }
        if ('content' in artifact || artifact.kind === 'table') downloadText(artifactContent(artifact), artifact.filename ?? `${artifact.title}.${artifact.kind === 'table' ? 'json' : artifact.kind === 'markdown' ? 'md' : artifact.kind === 'html' ? 'html' : 'txt'}`);
        else { const url = safeUrl(artifact.url, 'media'); if (url) { const link = window.document.createElement('a'); link.href = url; link.download = artifact.filename ?? artifact.title; link.click(); } }
      }}><UiIcon slot="download" size={14} /></AIIconButton>
    </div></div>
    <div id={`${id}-panel`} aria-labelledby={`${id}-${artifact.id}`} className={cn('ai-artifact-body', (artifact.kind === 'html' || artifact.kind === 'code' || artifact.kind === 'markdown' && mode === 'code') && 'ai-artifact-fill')} role="tabpanel"><ArtifactView key={artifact.id} artifact={artifact} mode={mode} onChange={onChange} renderers={renderers} labels={labels} /></div>
  </aside>;
}
