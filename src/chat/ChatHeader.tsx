import type * as React from 'react';
import { Avatar } from '../components/Avatar';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { ChatPopover } from './ChatPopover';
import { ChatPinnedMessages } from './ChatPinnedMessages';
import { chatOperationKey } from './controller';
import type { ChatConversationPatch } from './types';

export interface ChatHeaderProps { className?: string; actions?: React.ReactNode; onSearch?: () => void }
export function ChatHeader({ className, actions, onSearch }: ChatHeaderProps) {
  const { conversation, currentUser, users } = useChatConversation();
  const { selectConversation, changeConversation } = useChatActions();
  const { canManageConversations } = useChatPeople();
  const state = useChatState();
  if (!conversation) return null;
  const other = users.find(user => conversation.participantIds.includes(user.id) && user.id !== currentUser.id);
  const typing = conversation.typingUserIds?.filter(id => id !== currentUser.id) ?? [];
  const description = typing.length ? `${typing.map(id => users.find(user => user.id === id)?.name ?? 'Alguien').join(', ')} ${typing.length === 1 ? 'está escribiendo…' : 'están escribiendo…'}`
    : conversation.description ?? (conversation.participantIds.length > 2 ? `${conversation.participantIds.length} participantes` : other?.status === 'online' ? 'En línea' : 'Conversación privada');
  return <header className={cn('k-chat-header', className)}>
    <button type="button" className="k-chat-back k-chat-icon-button" aria-label="Volver a conversaciones" onClick={() => selectConversation(null)}><UiIcon slot="chevron-left" size={20} /></button>
    <Avatar name={conversation.title} src={conversation.avatar ?? other?.avatar} status={conversation.participantIds.length <= 2 ? other?.status : undefined} size="sm" />
    <div className="k-chat-header-copy"><h2>{conversation.title}</h2><p role="status">{description}</p></div>
    <div className="k-chat-header-actions">
      {onSearch && <button type="button" className="k-chat-icon-button" aria-label="Buscar mensajes" onClick={onSearch}><UiIcon slot="search" size={18} /></button>}
      <ChatPinnedMessages />{actions}
      {canManageConversations && <ChatPopover label="Gestionar conversación" trigger={<UiIcon slot="more-horizontal" size={18} />}>
        {close => {
          const operation = state.operations[chatOperationKey('conversation', conversation.id)];
          const apply = async (patch: ChatConversationPatch) => { if (await changeConversation(conversation.id, patch)) { close(); if (patch.archived) selectConversation(null); } };
          return <div className="k-chat-menu">
            <button type="button" disabled={operation?.pending} onClick={() => void apply({ favorite: !conversation.favorite })}>{conversation.favorite ? 'Quitar de favoritos' : 'Añadir a favoritos'}</button>
            <button type="button" disabled={operation?.pending} onClick={() => void apply({ muted: !conversation.muted })}>{conversation.muted ? 'Reactivar avisos' : 'Silenciar conversación'}</button>
            <button type="button" disabled={operation?.pending} onClick={() => void apply({ markedUnread: true })}>Marcar como no leído</button>
            <button type="button" disabled={operation?.pending} onClick={() => void apply({ archived: !conversation.archived })}>{conversation.archived ? 'Desarchivar conversación' : 'Archivar conversación'}</button>
            {operation?.error && <p role="alert">{operation.error}</p>}
          </div>;
        }}
      </ChatPopover>}
    </div>
  </header>;
}
