import * as React from 'react';
import { UiIcon } from '../icons';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Textarea } from '../components/Textarea';
import { Select } from '../components/Select';
import { cn } from '../utils';
import type { AIMessageData, AIMessagePart, AIUIProps, AIWorkspaceActions } from './types';
import { aiLabels } from './labels';
import { AICopyButton, AIIconButton, AIStatus } from './internal/ui';
import { currentMessageParts, messageText, safeUrl } from './internal/helpers';
import { AIMarkdown } from './AIMarkdown';
import { AICodeBlock } from './AICodeBlock';
import { AICodeDiff } from './AICodeDiff';
import { AIReasoning, AIChainOfThought } from './AIReasoning';
import { AIPlan, AIQueue } from './AIPlan';
import { AITerminal, AIStackTrace, AITestResults } from './AIConsole';
import { AIFileTree } from './AIFiles';
import { AICheckpoint } from './AIContext';
import { CustomPart } from './partRegistry';
import { AIAttachments } from './AIAttachments';
import { AIAudioPlayer } from './AIVoice';
import { AISources } from './AISources';
import { AIToolCall, AIAgentActivity } from './AIToolCall';

export type AIMessageCallbacks = Pick<AIWorkspaceActions, 'onRetry' | 'onEditMessage' | 'onFeedback' | 'onReadAloud' | 'onVersionChange' | 'onOpenArtifact' | 'onApproveTool' | 'onRejectTool' | 'onOpenFile' | 'onRestoreCheckpoint'>;
export interface AIMessageActionsProps extends AIUIProps { message: AIMessageData; actions?: AIMessageCallbacks; onEdit?: () => void }
export function AIMessageActions({ message, actions, onEdit, labels, className }: AIMessageActionsProps) {
  const l = aiLabels(labels); const text = messageText(message);
  return <div className={cn('ai-message-actions', className)} aria-label={`${l.message}: ${message.name ?? (message.role === 'user' ? l.user : l.assistant)}`}>
    {text && <AICopyButton text={text} labels={labels} />}
    {onEdit && <AIIconButton label={l.edit} onClick={onEdit}><UiIcon slot="pencil" size={13} /></AIIconButton>}
    {message.role === 'assistant' && actions?.onRetry && <AIIconButton label={l.regenerate} onClick={() => actions.onRetry!(message.id)}><UiIcon slot="refresh-cw" size={13} /></AIIconButton>}
    {message.role === 'assistant' && actions?.onFeedback && <>
      <AIIconButton label={l.positive} aria-pressed={message.feedback === 'positive'} onClick={() => actions.onFeedback!(message.id, 'positive')}><UiIcon slot="thumbs-up" size={13} /></AIIconButton>
      <AIIconButton label={l.negative} aria-pressed={message.feedback === 'negative'} onClick={() => actions.onFeedback!(message.id, 'negative')}><UiIcon slot="thumbs-down" size={13} /></AIIconButton>
    </>}
    {text && actions?.onReadAloud && <AIIconButton label={l.readAloud} onClick={() => actions.onReadAloud!(message.id, text)}><UiIcon slot="volume-2" size={13} /></AIIconButton>}
  </div>;
}
function MessageImage({ url, alt, labels }: AIUIProps & { url: string; alt: string }) {
  const [failed, setFailed] = React.useState(false); const l = aiLabels(labels);
  return failed || !safeUrl(url, 'media') ? <p className="ai-muted">{alt || l.imageUnavailable}</p> : <img className="ai-message-image" src={safeUrl(url, 'media')} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
export interface AIMessageContentProps extends AIUIProps { parts: AIMessagePart[]; role?: AIMessageData['role']; actions?: AIMessageCallbacks; onOpenCode?: (code: string, language?: string) => void }
export const AIMessageContent = React.memo(function AIMessageContent({ parts, role = 'assistant', actions, onOpenCode, labels, className }: AIMessageContentProps) {
  const l = aiLabels(labels);
  return <div className={cn('ai-message-content', className)}>{parts.map((part, index) => {
    switch (part.type) {
      case 'text': return part.format === 'plain' || (!part.format && role !== 'assistant') ? <p key={index} className="ai-plain-text">{part.text}</p> : <AIMarkdown key={index} onOpenCode={onOpenCode} labels={labels}>{part.text}</AIMarkdown>;
      case 'code': return <AICodeBlock key={index} code={part.code} language={part.language} title={part.title} onOpen={onOpenCode} labels={labels} />;
      case 'diff': return <AICodeDiff key={part.id} id={part.id} original={part.original} modified={part.modified} language={part.language} title={part.title} status={part.status} labels={labels} />;
      case 'reasoning': return <AIReasoning key={index} text={part.text} streaming={part.streaming} durationMs={part.durationMs} labels={labels} />;
      case 'plan': return <AIPlan key={index} title={part.title} steps={part.steps} labels={labels} />;
      case 'queue': return <AIQueue key={index} items={part.items} labels={labels} />;
      case 'steps': return <AIChainOfThought key={index} title={part.title} steps={part.steps} labels={labels} />;
      case 'terminal': return <AITerminal key={part.id ?? index} command={part.command} output={part.output} streaming={part.streaming} exitCode={part.exitCode} labels={labels} />;
      case 'stack': return <AIStackTrace key={part.id ?? index} trace={part.trace} onFilePathClick={actions?.onOpenFile} labels={labels} />;
      case 'tests': return <AITestResults key={index} suites={part.suites} durationMs={part.durationMs} labels={labels} />;
      case 'files': return <AIFileTree key={index} files={part.files} onSelect={actions?.onOpenFile ? path => actions.onOpenFile!(path) : undefined} labels={labels} />;
      case 'checkpoint': return <AICheckpoint key={part.id} label={part.label} restored={part.restored} onRestore={actions?.onRestoreCheckpoint ? () => actions.onRestoreCheckpoint!(part.id) : undefined} labels={labels} />;
      case 'custom': return <CustomPart key={index} kind={part.kind} data={part.data} />;
      case 'file': return <AIAttachments key={index} attachments={[part.attachment]} labels={labels} />;
      case 'image': return <MessageImage key={index} url={part.url} alt={part.alt} labels={labels} />;
      case 'audio': return <div key={index}><AIAudioPlayer src={part.src} blob={part.blob} title={part.title} labels={labels} />{part.transcript && <p>{part.transcript}</p>}</div>;
      case 'sources': return <AISources key={index} sources={part.sources} labels={labels} />;
      case 'tool': return <AIToolCall key={part.tool.id} tool={part.tool} onApprove={actions?.onApproveTool} onReject={actions?.onRejectTool} labels={labels} />;
      case 'activity': return <AIAgentActivity key={index} steps={part.steps} labels={labels} />;
      case 'artifact': return actions?.onOpenArtifact ? <button type="button" key={part.artifactId} className="ai-artifact-link" onClick={() => actions.onOpenArtifact!(part.artifactId)}><UiIcon slot="panel-right-open" size={16} /><span><strong>{part.title}</strong><small>{l.openResult}</small></span></button> : <span key={part.artifactId}>{part.title}</span>;
    }
  })}</div>;
});
export interface AIMessageProps extends AIUIProps { message: AIMessageData; actions?: AIMessageCallbacks; onOpenCode?: (code: string, language?: string) => void; /** Anima la entrada del mensaje (lo decide la conversación). */ fresh?: boolean }
export const AIMessage = React.memo(function AIMessage({ message, actions, onOpenCode, fresh, labels, className }: AIMessageProps) {
  const l = aiLabels(labels);
  const [editing, setEditing] = React.useState(false); const [text, setText] = React.useState('');
  const name = message.name ?? ({ user: l.user, assistant: l.assistant, system: l.system })[message.role];
  const parts = currentMessageParts(message);
  const created = message.createdAt ? new Date(message.createdAt) : undefined;
  return <article className={cn('ai-surface ai-message', className)} data-role={message.role} data-message-id={message.id} data-fresh={fresh || undefined} data-streaming={message.status === 'streaming' || undefined} aria-label={name}>
    <div className="ai-message-avatar"><Avatar name={name} src={safeUrl(message.avatar, 'media')} size="sm" /></div>
    <div className="ai-message-main"><header className="ai-message-header"><strong>{name}</strong>{created && !Number.isNaN(created.getTime()) && <time dateTime={message.createdAt}>{created.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</time>}
      {message.status === 'streaming' && <AIStatus>{l.streaming}</AIStatus>}</header>
      {editing ? <form className="ai-message-edit" onSubmit={event => { event.preventDefault(); actions?.onEditMessage?.(message.id, text); setEditing(false); }}><Textarea aria-label={l.edit} autoFocus value={text} onChange={event => setText(event.target.value)} /><div className="ai-inline-actions"><Button type="submit" size="sm" disabled={!text.trim()}>{l.save}</Button><Button size="sm" variant="secondary" onClick={() => setEditing(false)}>{l.cancel}</Button></div></form>
        : <AIMessageContent parts={parts} role={message.role} actions={actions} onOpenCode={onOpenCode} labels={labels} />}
      <div className="ai-message-footer"><AIMessageActions message={message} actions={actions} labels={labels} onEdit={actions?.onEditMessage && !editing ? () => { setText(messageText(message)); setEditing(true); } : undefined} />
        {!!message.versions?.length && actions?.onVersionChange && <div className="ai-version-selector"><Select ariaLabel={l.version} value={message.versionId ?? message.versions[0].id} options={message.versions.map((version, index) => ({ value: version.id, label: version.label ?? `${l.version} ${index + 1}` }))} onChange={id => actions.onVersionChange!(message.id, id)} /></div>}
      </div>
    </div>
  </article>;
});
