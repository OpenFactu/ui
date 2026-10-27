import * as React from 'react';
import { Avatar } from '../components/Avatar';
import { SearchInput } from '../components/SearchInput';
import { cn } from '../utils';
import { useChatActions, useChatPeople, useChatState } from './ChatProvider';
import { chatTime } from './format';
import { UiIcon } from '../icons';

export interface ChatConversationListProps {
  title?: string;
  className?: string;
  actions?: React.ReactNode;
}
export function ChatConversationList({ title = 'Mensajes', className, actions }: ChatConversationListProps) {
  const state = useChatState();
  const { currentUser, users } = useChatPeople();
  const { selectConversation } = useChatActions();
  const [query, setQuery] = React.useState('');
  const [archived, setArchived] = React.useState(false);
  const latest = React.useMemo(() => {
    const result = new Map<string, (typeof state.messages)[number]>();
    for (const message of state.messages) result.set(message.conversationId, message);
    return result;
  }, [state.messages]);
  const filtered = state.conversations.filter(item => Boolean(item.archived) === archived && item.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())).sort((a, b) => Number(Boolean(b.favorite)) - Number(Boolean(a.favorite)));
  return <section className={cn('k-chat-conversations', className)} aria-label="Conversaciones">
    <header className="k-chat-list-header"><h2>{title}</h2>{actions}</header>
    <div className="k-chat-search"><SearchInput value={query} onChange={setQuery} placeholder="Buscar conversaciones" aria-label="Buscar conversaciones" clearable /></div>
    {(archived || state.conversations.some(item => item.archived)) && <div className="k-chat-conversation-tabs"><button type="button" aria-pressed={!archived} onClick={() => setArchived(false)}>Activas</button><button type="button" aria-pressed={archived} onClick={() => setArchived(true)}>Archivadas</button></div>}
    <ul className="k-chat-conversation-items">
      {filtered.map(conversation => {
        const last = latest.get(conversation.id);
        const other = users.find(user => conversation.participantIds.includes(user.id) && user.id !== currentUser.id);
        const typing = conversation.typingUserIds?.some(id => id !== currentUser.id);
        return <li key={conversation.id}><button type="button" className="k-chat-conversation-item"
          aria-current={state.activeConversationId === conversation.id ? 'true' : undefined}
          onClick={() => selectConversation(conversation.id)}>
          <Avatar name={conversation.title} src={conversation.avatar ?? other?.avatar} status={conversation.participantIds.length <= 2 ? other?.status : undefined} />
          <span className="k-chat-conversation-copy"><span className="k-chat-conversation-title">{conversation.favorite && <UiIcon slot="bookmark" size={11} />} {conversation.title}</span>
            <span className="k-chat-conversation-preview">{typing ? 'Escribiendo…' : last?.deletedAt ? 'Mensaje eliminado' : last ? `${last.senderId === currentUser.id ? 'Tú: ' : ''}${last.text || 'Archivo adjunto'}` : conversation.description ?? 'Empieza una conversación'}</span>
          </span>
          <span className="k-chat-conversation-meta">{last && <time dateTime={last.createdAt}>{chatTime(last.createdAt)}</time>}
            {Boolean(conversation.unreadCount) && <span className="k-chat-unread" aria-label={`${conversation.unreadCount} sin leer`}>{conversation.unreadCount}</span>}
            {conversation.markedUnread && !conversation.unreadCount && <span className="k-chat-unread" aria-label="Marcada como no leída">•</span>}
            {conversation.muted && <span aria-label="Conversación silenciada">Silenciada</span>}
          </span>
        </button></li>;
      })}
    </ul>
    {!filtered.length && <p className="k-chat-list-empty" role="status">{query ? 'No hay conversaciones con ese nombre.' : 'Todavía no hay conversaciones.'}</p>}
  </section>;
}
