import { formatTimeOfDay } from '../internal/format';
import * as React from 'react';
import { UiIcon } from '../icons';
import { Avatar } from '../components/Avatar';
import { Button } from '../components/Button';
import { Textarea } from '../components/Textarea';
import { ContextMenu, type ContextMenuItem } from '../components/ContextMenu';
import { useSwipeAction } from '../gestures/useSwipeAction';
import { copyText } from '../hooks/useCopyToClipboard';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils';
import type { AIMessageData, AIMessagePart, AIUIProps, AIWorkspaceActions } from './types';
import { useAILabels } from './labels';
import { AICopyButton, AIIconButton, AIThinking } from './internal/ui';
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
import { AIToolCall, AIToolGroup, AIAgentActivity } from './AIToolCall';
import { AIQuestion, type AIQuestionProps } from './AIQuestion';
import { useComponentDefaults } from '../context/ComponentDefaults';
import type { AIToolViewDefinition } from './toolViews';

declare module '../context/ComponentDefaults' {
  interface ComponentDefaultsMap {
    AIMessage?: AIMessageCustomization;
    AIToolCall?: { view?: AIToolViewDefinition };
    AIQuestion?: Pick<AIQuestionProps, 'renderOption' | 'optionClassName'>;
  }
}

/** Lo que se puede cambiar de un mensaje. Cada función recibe lo de serie, para envolverlo, añadirle algo o quitarlo (`null`). */
export interface AIMessageCustomization {
  /** La fila de acciones: copiar, regenerar, valorar… */
  renderActions?: (message: AIMessageData, defaults: React.ReactNode) => React.ReactNode;
  /** Bajo el mensaje: tokens, velocidad, un aviso de que se cortó. */
  renderFooter?: (message: AIMessageData) => React.ReactNode;
  /** Nombre, hora y estado. */
  renderHeader?: (message: AIMessageData, defaults: React.ReactNode) => React.ReactNode;
  renderAvatar?: (message: AIMessageData, defaults: React.ReactNode) => React.ReactNode;
  /** Cada parte del mensaje. */
  renderPart?: (part: AIMessagePart, context: { message: AIMessageData; index: number; defaults: React.ReactNode }) => React.ReactNode;
  /** Junta las llamadas a herramientas seguidas en una línea. Default true. */
  groupTools?: boolean;
  /**
   * Gestos táctiles. Deslizar a la derecha cita el mensaje (si hay `onQuote`). Mantener pulsado abre sus acciones, pero está
   * apagado por defecto: sin él, mantener pulsado sigue siendo seleccionar texto, y seleccionar es lo que permite citar un trozo.
   */
  gestures?: false | { swipeToQuote?: boolean; longPress?: boolean };
}

export type AIMessageCallbacks = Pick<AIWorkspaceActions, 'onRetry' | 'onEditMessage' | 'onFeedback' | 'onReadAloud' | 'onVersionChange' | 'onOpenArtifact' | 'onApproveTool' | 'onRejectTool' | 'onAnswerQuestion' | 'onQuote' | 'onOpenFile' | 'onRestoreCheckpoint'>;
export interface AIMessageActionsProps extends AIUIProps { message: AIMessageData; actions?: AIMessageCallbacks; onEdit?: () => void }
export function AIMessageActions({ message, actions, onEdit, labels, className }: AIMessageActionsProps) {
  const l = useAILabels(labels); const text = messageText(message);
  return <div className={cn('ai-message-actions', className)} role="group" aria-label={`${l.message}: ${message.name ?? (message.role === 'user' ? l.user : l.assistant)}`}>
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
  const [failed, setFailed] = React.useState(false); const l = useAILabels(labels);
  return failed || !safeUrl(url, 'media') ? <p className="ai-muted">{alt || l.imageUnavailable}</p> : <img className="ai-message-image" src={safeUrl(url, 'media')} alt={alt} loading="lazy" onError={() => setFailed(true)} />;
}
export interface AIMessageContentProps extends AIUIProps {
  parts: AIMessagePart[]; role?: AIMessageData['role']; actions?: AIMessageCallbacks; onOpenCode?: (code: string, language?: string) => void;
  /** Aún está llegando: el Markdown de la última parte cierra lo que tenga a medias. */
  streaming?: boolean;
  /** Junta las llamadas a herramientas seguidas en una línea. Default true. */
  groupTools?: boolean;
  /** Cada parte: recibe lo que se pintaría de serie. */
  renderPart?: (part: AIMessagePart, index: number, defaults: React.ReactNode) => React.ReactNode;
}
export const AIMessageContent = React.memo(function AIMessageContent({ parts, role = 'assistant', actions, onOpenCode, streaming, groupTools = true, renderPart, labels, className }: AIMessageContentProps) {
  const l = useAILabels(labels);
  const sources = React.useMemo(() => {
    const found = parts.flatMap((part) => (part.type === 'sources' ? part.sources : []));
    return found.length ? found : undefined;
  }, [parts]);
  const single = (part: AIMessagePart, index: number): React.ReactNode => {
    switch (part.type) {
      case 'text': return part.format === 'plain' || (!part.format && role !== 'assistant') ? <p key={index} className="ai-plain-text">{part.text}</p> : <AIMarkdown key={index} onOpenCode={onOpenCode} streaming={streaming && index === parts.length - 1} sources={sources} labels={labels}>{part.text}</AIMarkdown>;
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
      case 'question': return <AIQuestion key={part.id} question={part.question} options={part.options} multiple={part.multiple} allowText={part.allowText} placeholder={part.placeholder} step={part.step} answer={part.answer} onAnswer={actions?.onAnswerQuestion ? answer => actions.onAnswerQuestion!(part.id, answer) : undefined} disabled={!actions?.onAnswerQuestion} labels={labels} />;
      case 'file': return <AIAttachments key={index} attachments={[part.attachment]} labels={labels} />;
      case 'image': return <MessageImage key={index} url={part.url} alt={part.alt} labels={labels} />;
      case 'audio': return <div key={index}><AIAudioPlayer src={part.src} blob={part.blob} title={part.title} labels={labels} />{part.transcript && <p>{part.transcript}</p>}</div>;
      case 'sources': return <AISources key={index} sources={part.sources} labels={labels} />;
      case 'tool': return <AIToolCall key={part.tool.id} tool={part.tool} onApprove={actions?.onApproveTool} onReject={actions?.onRejectTool} labels={labels} />;
      case 'activity': return <AIAgentActivity key={index} steps={part.steps} labels={labels} />;
      case 'artifact': return actions?.onOpenArtifact ? <button type="button" key={part.artifactId} className="ai-artifact-link" onClick={() => actions.onOpenArtifact!(part.artifactId)}><UiIcon slot="panel-right-open" size={16} /><span><strong>{part.title}</strong><small>{l.openResult}</small></span></button> : <div key={part.artifactId} className="ai-artifact-link" data-static=""><UiIcon slot="panel-right" size={16} /><span><strong>{part.title}</strong></span></div>;
    }
  };
  const one = (part: AIMessagePart, index: number) => {
    const defaults = single(part, index);
    return renderPart ? <React.Fragment key={index}>{renderPart(part, index, defaults)}</React.Fragment> : defaults;
  };
  const rows: React.ReactNode[] = [];
  for (let index = 0; index < parts.length; index += 1) {
    let end = index;
    if (groupTools && !renderPart) while (parts[index].type === 'tool' && parts[end + 1]?.type === 'tool') end += 1;
    if (end === index) { rows.push(one(parts[index], index)); continue; }
    const tools = parts.slice(index, end + 1).flatMap((part) => (part.type === 'tool' ? [part.tool] : []));
    rows.push(<AIToolGroup key={`tools-${tools[0].id}`} tools={tools} onApprove={actions?.onApproveTool} onReject={actions?.onRejectTool} labels={labels} />);
    index = end;
  }
  return <div className={cn('ai-message-content', className)}>{rows}</div>;
});
/** Las versiones de una respuesta: flechas y «2 de 3». */
export interface AIVersionNavProps extends AIUIProps {
  versions: { id: string; label?: string }[];
  value?: string;
  onChange: (id: string) => void;
}
export function AIVersionNav({ versions, value, onChange, labels, className }: AIVersionNavProps) {
  const l = useAILabels(labels);
  const { format } = useI18n();
  const index = Math.max(0, versions.findIndex((version) => version.id === value));
  const current = versions[index];
  return (
    <div className={cn('ai-version-nav', className)} role="group" aria-label={l.version}>
      <AIIconButton label={l.previousVersion} disabled={index === 0} onClick={() => onChange(versions[index - 1].id)}><UiIcon slot="chevron-left" size={13} /></AIIconButton>
      <span aria-live="polite" title={current?.label}>{format(l.versionOf, { current: index + 1, total: versions.length })}</span>
      <AIIconButton label={l.nextVersion} disabled={index >= versions.length - 1} onClick={() => onChange(versions[index + 1].id)}><UiIcon slot="chevron-right" size={13} /></AIIconButton>
    </div>
  );
}
export interface AIMessageProps extends AIUIProps, AIMessageCustomization {
  message: AIMessageData; actions?: AIMessageCallbacks; onOpenCode?: (code: string, language?: string) => void;
  /** Anima la entrada del mensaje (lo decide la conversación). */ fresh?: boolean;
  /** Aviso de respuesta fallida con «Reintentar». La conversación lo apaga cuando ya muestra el error de la ejecución. Default true. */
  showError?: boolean;
}
export const AIMessage = React.memo(function AIMessage(rawProps: AIMessageProps) {
  const { message, actions, onOpenCode, fresh, showError = true, renderActions, renderFooter, renderHeader, renderAvatar, renderPart, groupTools, gestures, labels, className } = useComponentDefaults('AIMessage', rawProps);
  const l = useAILabels(labels);
  const [editing, setEditing] = React.useState(false); const [text, setText] = React.useState('');
  const name = message.name ?? ({ user: l.user, assistant: l.assistant, system: l.system })[message.role];
  const parts = currentMessageParts(message);
  const created = message.createdAt ? new Date(message.createdAt) : undefined;
  // El nombre ya está al lado: el avatar no lo repite. El asistente lleva el destello sobre el acento, y su imagen si la tiene.
  const defaultAvatar = <Avatar name={name} src={safeUrl(message.avatar, 'media')} size="sm" decorative color={message.role === 'assistant' ? 'accent' : undefined} fallback={message.role === 'assistant' ? <UiIcon slot="sparkles" size={15} /> : undefined} />;
  const avatar = renderAvatar ? renderAvatar(message, defaultAvatar) : defaultAvatar;
  const defaultHeader = <header className="ai-message-header"><strong>{name}</strong>{created && !Number.isNaN(created.getTime()) && <time dateTime={message.createdAt}>{formatTimeOfDay(created)}</time>}
    {message.status === 'streaming' && <AIThinking>{l.streaming}</AIThinking>}</header>;
  const header = renderHeader ? renderHeader(message, defaultHeader) : defaultHeader;
  const root = React.useRef<HTMLElement>(null);
  const [menuAt, setMenuAt] = React.useState<{ x: number; y: number } | null>(null);
  const plain = messageText(message);
  const canQuote = gestures !== false && gestures?.swipeToQuote !== false && Boolean(actions?.onQuote) && !editing && Boolean(plain);
  const canHold = Boolean(gestures && gestures.longPress) && !editing;
  const swipe = useSwipeAction({
    direction: 'right',
    distance: 64,
    disabled: !canQuote && !canHold,
    progressRef: root,
    onTrigger: canQuote ? () => actions!.onQuote!(plain, { messageId: message.id }) : undefined,
    onLongPress: canHold ? (gesture) => setMenuAt(gesture.point) : undefined,
  });
  const menu: ContextMenuItem[] = [
    ...(plain ? [{ label: l.copy, onClick: () => { void copyText(plain); } }] : []),
    ...(plain && actions?.onQuote ? [{ label: l.quote, onClick: () => actions.onQuote!(plain, { messageId: message.id }) }] : []),
    ...(actions?.onEditMessage ? [{ label: l.edit, onClick: () => { setText(plain); setEditing(true); } }] : []),
    ...(message.role === 'assistant' && actions?.onRetry ? [{ label: l.regenerate, onClick: () => actions.onRetry!(message.id) }] : []),
    ...(message.role === 'assistant' && actions?.onFeedback ? [{ label: l.positive, onClick: () => actions.onFeedback!(message.id, 'positive') }, { label: l.negative, onClick: () => actions.onFeedback!(message.id, 'negative') }] : []),
    ...(plain && actions?.onReadAloud ? [{ label: l.readAloud, onClick: () => actions.onReadAloud!(message.id, plain) }] : []),
  ];
  const defaultActions = <AIMessageActions message={message} actions={actions} labels={labels} onEdit={actions?.onEditMessage && !editing ? () => { setText(messageText(message)); setEditing(true); } : undefined} />;
  return <article className={cn('ai-surface ai-message', className)} data-role={message.role} data-message-id={message.id} data-fresh={fresh || undefined} data-streaming={message.status === 'streaming' || undefined} data-hold={canHold || undefined} aria-label={name} ref={root}>
    {avatar != null && avatar !== false && <div className="ai-message-avatar">{avatar}</div>}
    {canQuote && <span className="ai-message-swipe" aria-hidden="true"><UiIcon slot="corner-down-left" size={14} /></span>}
    <div className="ai-message-main" ref={swipe.ref as React.RefObject<HTMLDivElement>} {...swipe.bind} style={swipe.style}>{header}
      {editing ? <form className="ai-message-edit" onSubmit={event => { event.preventDefault(); actions?.onEditMessage?.(message.id, text); setEditing(false); }}><Textarea aria-label={l.edit} autoFocus value={text} onChange={event => setText(event.target.value)} /><div className="ai-inline-actions"><Button type="submit" size="sm" disabled={!text.trim()}>{l.save}</Button><Button size="sm" variant="secondary" onClick={() => setEditing(false)}>{l.cancel}</Button></div></form>
        : <AIMessageContent parts={parts} role={message.role} actions={actions} onOpenCode={onOpenCode} streaming={message.status === 'streaming'} groupTools={groupTools} renderPart={renderPart ? (part, index, defaults) => renderPart(part, { message, index, defaults }) : undefined} labels={labels} />}
      {message.status === 'error' && showError && <div className="ai-message-error" role="alert"><UiIcon slot="alert-circle" size={15} /><span>{l.messageFailed}</span>{actions?.onRetry && <button type="button" className="ai-text-button" onClick={() => actions.onRetry!(message.id)}><UiIcon slot="refresh-cw" size={13} />{l.retry}</button>}</div>}
      <div className="ai-message-footer">{renderActions ? renderActions(message, defaultActions) : defaultActions}
        {!!message.versions && message.versions.length > 1 && actions?.onVersionChange && <AIVersionNav versions={message.versions} value={message.versionId ?? message.versions[0].id} onChange={id => actions.onVersionChange!(message.id, id)} labels={labels} />}
      </div>
      {renderFooter?.(message)}
      {menuAt && <ContextMenu x={menuAt.x} y={menuAt.y} items={menu} onClose={() => setMenuAt(null)} />}
    </div>
  </article>;
});
