import * as React from 'react';
import { Avatar } from '../components/Avatar';
import { cn } from '../utils';
import { UiIcon } from '../icons';
import { ContextMenu } from '../components/ContextMenu';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useToastOptional } from '../context/ToastContext';
import { useChatActions, useChatConversation, useChatState } from './ChatProvider';
import { chatOperationKey } from './controller';
import { ChatMessageMenuButton, ChatMessageReactButton, ChatQuickReactions, chatQuickReactions, useChatMessageActionsOptions, useChatMessageMenuItems, type ChatMessageActionsOptions } from './ChatMessageActions';
import { ChatMessageReactions } from './ChatMessageReactions';
import { ChatMessageEditor } from './ChatMessageEditor';
import { ChatAttachments } from './ChatAttachments';
import { ChatMessageReceipt } from './ChatMessageReceipt';
import { ChatBlocks, useChatMessageBare, useChatMessageText } from './blocks';
import { useChatMessageGestures } from './gestures';
import './expressions';
import { chatTime } from './format';
import type { ChatMessageData } from './types';
import { useMessages } from '../i18n/I18nProvider';

export interface ChatMessageProps {
  message: ChatMessageData; className?: string; grouped?: boolean; searchQuery?: string; fresh?: boolean;
  /** Gestos táctiles: mantener pulsado abre el menú (con las reacciones) y deslizar a la derecha responde. `false` los quita; o solo uno. */
  gestures?: false | { longPress?: boolean; swipeToReply?: boolean };
  /** Reacciones rápidas y menú del mensaje (encima de los de `ChatProvider messageActions`). `false` los quita. */
  actions?: ChatMessageActionsOptions | false;
}
export function ChatMessage({ message, className, grouped = false, searchQuery = '', fresh = false, gestures = {}, actions }: ChatMessageProps) {
  const ct = useMessages('chat');
  const { currentUser, users, messages, conversation, draft } = useChatConversation(message.conversationId);
  const { retryMessage, focusMessage, setDraft, deleteMessage } = useChatActions();
  const state = useChatState();
  const messageText = useChatMessageText();
  const bare = useChatMessageBare(message);
  const [editing, setEditing] = React.useState(false);
  // Menú contextual (el ContextMenu de la librería) donde se pida: cursor, dedo o bajo ⌄; con las reacciones arriba.
  const [menuAt, setMenuAt] = React.useState<{ x: number; y: number } | null>(null);
  const [react, setReact] = React.useState<{ open: boolean; all: boolean }>({ open: false, all: false });
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  // Aviso de «copiado»: el toast de la app si hay ToastProvider; si no, una etiqueta junto al mensaje un momento.
  const toast = useToastOptional();
  const [copied, setCopied] = React.useState<string | null>(null);
  React.useEffect(() => { if (!copied) return; const timer = setTimeout(() => setCopied(null), 1600); return () => clearTimeout(timer); }, [copied]);
  const onCopied = (ok: boolean) => { const text = ok ? ct.messageCopied : ct.copyError; if (toast) { if (ok) toast.success(text); else toast.error(text); } else setCopied(text); };
  const actionOptions = useChatMessageActionsOptions(actions);
  const menuItems = useChatMessageMenuItems(message, actionOptions || {}, { onEdit: () => setEditing(true), onDelete: () => setConfirmDelete(true), onCopied });
  const deleting = state.operations[chatOperationKey('message', message.conversationId, message.id)];
  const own = message.senderId === currentUser.id;
  const sender = users.find(user => user.id === message.senderId);
  const original = messages.find(item => item.id === message.replyToId || item.clientId === message.replyToId);
  const status = message.status ?? 'sent';
  const showActions = !message.deletedAt && !editing && !conversation?.readOnly && actionOptions !== false;
  const quick = actionOptions ? chatQuickReactions(message, actionOptions) : null;
  const hasMenu = showActions && actionOptions.menu !== false && (menuItems.length > 0 || Boolean(quick?.length));
  const interactive = !message.deletedAt && !editing && !conversation?.readOnly && gestures !== false;
  const gesture = useChatMessageGestures({
    disabled: !interactive,
    onLongPress: gestures && gestures.longPress !== false && hasMenu ? point => setMenuAt(point) : undefined,
    onSwipe: gestures && gestures.swipeToReply !== false ? () => setDraft({ ...draft, replyToId: message.id }, message.conversationId) : undefined,
  });
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
  const inlineMeta = !message.deletedAt && !editing && Boolean(message.text || !message.blocks?.length);
  const meta = <span className="k-chat-message-meta"><time dateTime={message.createdAt} title={message.createdAt}>{chatTime(message.createdAt)}</time>
    {message.editedAt && !message.deletedAt && <span>{ct.edited}</span>}
    {own && !message.deletedAt && <ChatMessageReceipt message={message} />}
  </span>;
  // Hueco invisible del ancho de la hora al final del texto: reserva su sitio en la última línea (y cuenta para el ancho de la burbuja).
  const spacer = <span className="k-chat-message-meta k-chat-meta-spacer" aria-hidden="true"><time>{chatTime(message.createdAt)}</time>
    {message.editedAt && <span>{ct.edited}</span>}
    {own && <span className="k-chat-receipt-checks"><UiIcon slot="check" size={14} /><UiIcon slot="check" size={14} /></span>}
  </span>;
  return <article data-menu-open={menuAt ? true : undefined} data-pressing={gesture.pressing || undefined} className={cn('k-chat-message', own && 'k-chat-message-own', grouped && 'k-chat-message-grouped', className)} data-fresh={fresh || undefined} data-message-id={message.clientId ?? message.id}>
    {!own && <span className="k-chat-avatar-space">{!grouped && <Avatar name={sender?.name ?? ct.participant} src={sender?.avatar} size="sm" />}</span>}
    <div className="k-chat-message-content">
      {!own && !grouped && <span className="k-chat-sender">{sender?.name ?? ct.participant}</span>}
      {gesture.offset > 0 && <span className="k-chat-swipe-reply" aria-hidden="true" style={{ opacity: gesture.progress, transform: `scale(${0.6 + gesture.progress * 0.4})` }}><UiIcon slot="corner-down-left" size={16} /></span>}
      <div className="k-chat-bubble-row">
      <div className="k-chat-bubble" data-bare={bare || undefined} data-dragging={gesture.dragging || undefined} {...gesture.bind}
        // Clic derecho: el menú del mensaje en vez del del navegador (dentro de enlaces y campos se deja el del navegador).
        onContextMenu={event => {
          gesture.bind.onContextMenu?.(event);
          if (!hasMenu || event.defaultPrevented || (event.target as Element).closest('a, input, textarea, [contenteditable="true"]')) return;
          event.preventDefault(); setMenuAt({ x: event.clientX, y: event.clientY });
        }}
        style={gesture.offset ? { transform: `translateX(${gesture.offset}px)` } : undefined}>
        {message.replyToId && !message.deletedAt && <blockquote className="k-chat-quoted"><button type="button" disabled={!original} onClick={() => original && focusMessage(original.id, message.conversationId)}><span>{original ? users.find(user => user.id === original.senderId)?.name ?? ct.participant : ct.earlierMessage}</span><p>{original?.deletedAt ? ct.deletedMessage : original ? messageText(original) : ct.notInHistory}</p></button></blockquote>}
        {message.deletedAt ? <p className="k-chat-deleted">{ct.deletedMessage}</p> : <>
          <ChatBlocks message={message} own={own} />
          {editing ? <ChatMessageEditor message={message} onClose={() => setEditing(false)} /> : <>
            {Boolean(message.attachments?.length) && <ChatAttachments attachments={message.attachments!} conversationId={message.conversationId} />}
            {/* La hora va al final de la última línea del texto si cabe (si no, baja sola a la siguiente). */}
            {inlineMeta && <p className="k-chat-message-text" dir="auto"><span className="k-chat-message-body">{renderText()}</span>{spacer}{meta}</p>}
          </>}
        </>}
        {!inlineMeta && meta}
      </div>
      {showActions && actionOptions && <span className="k-chat-message-side">
        {actionOptions.reactButton !== false && <ChatMessageReactButton message={message} options={actionOptions} open={react.open} allEmojis={react.all} onOpenChange={open => setReact({ open, all: open && react.all })} />}
        {hasMenu && <ChatMessageMenuButton expanded={Boolean(menuAt)} onOpen={setMenuAt} />}
      </span>}
      </div>
      {menuAt && <ContextMenu x={menuAt.x} y={menuAt.y} width={252} items={menuItems} onClose={() => setMenuAt(null)}
        header={quick && <ChatQuickReactions message={message} emojis={quick} onDone={() => setMenuAt(null)}
          onMore={actionOptions && actionOptions.reactButton !== false ? () => { setMenuAt(null); setReact({ open: true, all: true }); } : undefined} />} />}
      {confirmDelete && <ConfirmDialog open tone="danger" title={ct.deleteTitle} message={ct.deleteHint} confirmLabel={ct.confirmDelete} loading={deleting?.pending}
        onCancel={() => setConfirmDelete(false)} onConfirm={async () => { if (await deleteMessage(message.id, message.conversationId)) setConfirmDelete(false); }} />}
      {copied && <span className="k-chat-copied" role="status">{copied}</span>}
      {status === 'error' && own && <div className="k-chat-message-actions"><span className="k-chat-message-error" role="alert">{message.error ?? ct.sendFailed}</span>{!conversation?.readOnly && <button type="button" onClick={() => void retryMessage(message.id, message.conversationId)}>{ct.retrySend}</button>}</div>}
      {!message.deletedAt && <ChatMessageReactions message={message} />}
    </div>
  </article>;
}
