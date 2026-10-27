import * as React from 'react';
import { Avatar } from '../components/Avatar';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useChatActions, useChatConversation } from './ChatProvider';
import { ChatMessageActions } from './ChatMessageActions';
import { ChatMessageReactions } from './ChatMessageReactions';
import { ChatMessageEditor } from './ChatMessageEditor';
import { ChatAttachments } from './ChatAttachments';
import { chatTime } from './format';
import type { ChatMessageData, ChatMessageStatus } from './types';

const statusLabels: Record<ChatMessageStatus, string> = { sending: 'Enviando', sent: 'Enviado', delivered: 'Entregado', read: 'Leído', error: 'No enviado' };
export interface ChatMessageProps { message: ChatMessageData; className?: string; grouped?: boolean; searchQuery?: string; fresh?: boolean }
export function ChatMessage({ message, className, grouped = false, searchQuery = '', fresh = false }: ChatMessageProps) {
  const { currentUser, users, messages, conversation } = useChatConversation(message.conversationId);
  const { retryMessage, focusMessage } = useChatActions();
  const [editing, setEditing] = React.useState(false);
  const own = message.senderId === currentUser.id;
  const sender = users.find(user => user.id === message.senderId);
  const original = messages.find(item => item.id === message.replyToId || item.clientId === message.replyToId);
  const status = message.status ?? 'sent';
  const renderText = () => {
    const mentions = (message.mentions ?? []).filter(item => item.start >= 0 && item.end <= message.text.length && item.end > item.start).sort((a, b) => a.start - b.start);
    const parts: React.ReactNode[] = []; let cursor = 0;
    const highlight = (text: string, key: number) => {
      const query = searchQuery.trim(); if (!query) return text;
      const result: React.ReactNode[] = []; let start = 0; let index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
      while (index >= 0) { result.push(text.slice(start,index)); result.push(<mark key={`${key}-${index}`}>{text.slice(index,index + query.length)}</mark>); start = index + query.length; index = text.toLocaleLowerCase().indexOf(query.toLocaleLowerCase(),start); }
      result.push(text.slice(start)); return <React.Fragment key={key}>{result}</React.Fragment>;
    };
    for (const mention of mentions) { if (mention.start < cursor) continue; parts.push(highlight(message.text.slice(cursor, mention.start), cursor)); parts.push(<span className={cn('k-chat-mention', mention.userId === currentUser.id && 'k-chat-mention-me')} key={`m${mention.start}`}>{message.text.slice(mention.start, mention.end)}</span>); cursor = mention.end; }
    parts.push(highlight(message.text.slice(cursor), cursor)); return parts;
  };
  return <article className={cn('k-chat-message', own && 'k-chat-message-own', grouped && 'k-chat-message-grouped', className)} data-fresh={fresh || undefined} data-message-id={message.clientId ?? message.id}>
    {!own && <span className="k-chat-avatar-space">{!grouped && <Avatar name={sender?.name ?? 'Participante'} src={sender?.avatar} size="sm" />}</span>}
    <div className="k-chat-message-content">
      {!own && !grouped && <span className="k-chat-sender">{sender?.name ?? 'Participante'}</span>}
      <div className="k-chat-bubble">
        {message.replyToId && !message.deletedAt && <blockquote className="k-chat-quoted"><button type="button" disabled={!original} onClick={() => original && focusMessage(original.id, message.conversationId)}><span>{original ? users.find(user => user.id === original.senderId)?.name ?? 'Participante' : 'Mensaje anterior'}</span><p>{original?.deletedAt ? 'Mensaje eliminado' : original?.text ?? 'Este mensaje no está en el historial cargado.'}</p></button></blockquote>}
        {message.deletedAt ? <p className="k-chat-deleted">Mensaje eliminado</p> : editing ? <ChatMessageEditor message={message} onClose={() => setEditing(false)} /> : <>
          {Boolean(message.attachments?.length) && <ChatAttachments attachments={message.attachments!} conversationId={message.conversationId} />}
          <p className="k-chat-message-text" dir="auto">{renderText()}</p>
        </>}
        <div className="k-chat-message-meta"><time dateTime={message.createdAt} title={message.createdAt}>{chatTime(message.createdAt)}</time>
          {message.editedAt && !message.deletedAt && <span>Editado</span>}
          {own && <span className="k-chat-delivery" aria-label={statusLabels[status]} title={statusLabels[status]}>
            <UiIcon slot={status === 'sending' ? 'clock' : status === 'error' ? 'alert-circle' : 'check'} size={12} />
            <span className="k-chat-visually-hidden">{statusLabels[status]}</span>
          </span>}
        </div>
      </div>
      {!message.deletedAt && !editing && <ChatMessageActions message={message} onEdit={() => setEditing(true)} />}
      {status === 'error' && own && <div className="k-chat-message-actions"><span className="k-chat-message-error" role="alert">{message.error ?? 'No se ha podido enviar.'}</span>{!conversation?.readOnly && <button type="button" onClick={() => void retryMessage(message.id, message.conversationId)}>Reintentar envío</button>}</div>}
      {!message.deletedAt && <ChatMessageReactions message={message} />}
    </div>
  </article>;
}
