import type * as React from 'react';
import { Avatar } from '../components/Avatar';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { ChatPopover } from './ChatPopover';
import { ChatPinnedMessages } from './ChatPinnedMessages';
import { ChatConversationTools } from './ChatConversationTools';
import { chatOperationKey } from './controller';
import type { ChatConversationPatch } from './types';
import { useI18n } from '../i18n/I18nProvider';

export interface ChatHeaderProps { className?: string; actions?: React.ReactNode; onSearch?: () => void }
export function ChatHeader({ className, actions, onSearch }: ChatHeaderProps) {
  const { messages: { chat: ct }, format } = useI18n();
  const { conversation, currentUser, users } = useChatConversation();
  const { selectConversation, changeConversation } = useChatActions();
  const { canManageConversations } = useChatPeople();
  const state = useChatState();
  if (!conversation) return null;
  const other = users.find(user => conversation.participantIds.includes(user.id) && user.id !== currentUser.id);
  const typing = conversation.typingUserIds?.filter(id => id !== currentUser.id) ?? [];
  const description = typing.length ? format(typing.length === 1 ? ct.isTyping : ct.areTyping, { names: typing.map(id => users.find(user => user.id === id)?.name ?? ct.someone).join(', ') })
    : conversation.description ?? (conversation.participantIds.length > 2 ? format(ct.participantsCount, { count: conversation.participantIds.length }) : other?.status === 'online' ? ct.online : ct.privateConversation);
  return <header className={cn('k-chat-header', className)}>
    <button type="button" className="k-chat-back k-chat-icon-button" aria-label={ct.back} onClick={() => selectConversation(null)}><UiIcon slot="chevron-left" size={20} /></button>
    <Avatar name={conversation.title} src={conversation.avatar ?? other?.avatar} status={conversation.participantIds.length <= 2 ? other?.status : undefined} size="sm" />
    <div className="k-chat-header-copy"><h2>{conversation.title}</h2><p>{description}</p></div>
    <div className="k-chat-header-actions">
      {onSearch && <button type="button" className="k-chat-icon-button" aria-label={ct.searchMessages} onClick={onSearch}><UiIcon slot="search" size={18} /></button>}
      <ChatPinnedMessages /><ChatConversationTools key={conversation.id} />{actions}
      {canManageConversations && <ChatPopover label={ct.manage} trigger={<UiIcon slot="more-horizontal" size={18} />}>
        {close => {
          const operation = state.operations[chatOperationKey('conversation', conversation.id)];
          const apply = async (patch: ChatConversationPatch) => { if (await changeConversation(conversation.id, patch)) { close(); if (patch.archived) selectConversation(null); } };
          return <div className="k-chat-menu">
            <button type="button" disabled={operation?.pending} onClick={() => void apply({ favorite: !conversation.favorite })}>{conversation.favorite ? ct.removeFavorite : ct.addFavorite}</button>
            <button type="button" disabled={operation?.pending} onClick={() => void apply({ muted: !conversation.muted })}>{conversation.muted ? ct.unmute : ct.mute}</button>
            <button type="button" disabled={operation?.pending} onClick={() => void apply({ markedUnread: true })}>{ct.markUnread}</button>
            <button type="button" disabled={operation?.pending} onClick={() => void apply({ archived: !conversation.archived })}>{conversation.archived ? ct.unarchive : ct.archive}</button>
            {operation?.error && <p role="alert">{operation.error}</p>}
          </div>;
        }}
      </ChatPopover>}
    </div>
  </header>;
}
