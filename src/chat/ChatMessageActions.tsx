import { copyText } from '../hooks/useCopyToClipboard';
import * as React from 'react';
import { UiIcon } from '../icons';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { ChatPopover } from './ChatPopover';
import { ChatEmojiPicker } from './ChatEmojiPicker';
import { chatOperationKey } from './controller';
import type { ChatMessageData } from './types';
export function ChatMessageActions({ message, onEdit }: { message: ChatMessageData; onEdit: () => void }) {
  const { conversation, draft, users } = useChatConversation(message.conversationId);
  const { canEdit, canDelete, canManageConversations } = useChatPeople();
  const { setDraft, toggleReaction, deleteMessage, pinMessage } = useChatActions();
  const state = useChatState();
  const operation = state.operations[chatOperationKey('message', message.conversationId, message.id)];
  const [copied, setCopied] = React.useState('');
  const [confirm, setConfirm] = React.useState(false);
  const confirmed = !['sending', 'error'].includes(message.status ?? '');
  const pinned = conversation?.pinnedMessageIds?.includes(message.id);
  const sender = users.find(user => user.id === message.senderId)?.name ?? 'participante';
  if (message.deletedAt || conversation?.readOnly) return null;
  return <div className="k-chat-message-toolbar">
    <button type="button" className="k-chat-icon-button" aria-label={`Responder a ${sender}: ${message.text.slice(0, 48)}`} title="Responder"
      onClick={() => setDraft({ ...draft, replyToId: message.id }, message.conversationId)}><UiIcon slot="corner-down-left" size={15} /></button>
    {confirmed && <ChatEmojiPicker label="Reaccionar al mensaje" onSelect={emoji => void toggleReaction(message.id, emoji, message.conversationId)} />}
    <ChatPopover label="Más acciones del mensaje" trigger={<UiIcon slot="more-horizontal" size={16} />} onOpen={() => { setConfirm(false); setCopied(''); }}>
      {close => confirm ? <div className="k-chat-menu"><strong>¿Eliminar este mensaje?</strong><p>Se conservará su lugar en la conversación.</p>
        <button type="button" disabled={operation?.pending} onClick={async () => { if (await deleteMessage(message.id, message.conversationId)) close(); }}>Confirmar eliminación</button>
        <button type="button" disabled={operation?.pending} onClick={() => setConfirm(false)}>Cancelar</button>{operation?.error && <p role="alert">{operation.error}</p>}</div>
        : <div className="k-chat-menu">
          <div className="k-chat-quick-reactions">{['👍', '❤️', '😂', '😮', '😢', '🙌'].map(emoji => <button key={emoji} type="button" aria-label={`Reaccionar ${emoji}`} disabled={!confirmed} onClick={() => { void toggleReaction(message.id, emoji, message.conversationId); close(); }}>{emoji}</button>)}</div>
          <button type="button" onClick={async () => setCopied(await copyText(message.text) ? 'Copiado' : 'No se ha podido copiar.')}>Copiar mensaje</button>
          {confirmed && canEdit(message) && <button type="button" onClick={() => { close(false); onEdit(); }}>Editar mensaje</button>}
          {confirmed && canManageConversations && <button type="button" onClick={async () => { if (await pinMessage(message.id, !pinned, message.conversationId)) close(); }}>{pinned ? 'Desfijar mensaje' : 'Fijar mensaje'}</button>}
          {confirmed && canDelete(message) && <button type="button" onClick={() => setConfirm(true)}>Eliminar mensaje</button>}
          {copied && <p role="status">{copied}</p>}
        </div>}
    </ChatPopover>
  </div>;
}
