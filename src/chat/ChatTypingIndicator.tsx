import { Avatar } from '../components/Avatar';
import { useChatConversation } from './ChatProvider';
import { cn } from '../utils';

export interface ChatTypingIndicatorProps { conversationId?: string; className?: string }
/** Presencia recibida mediante setTyping; no simula actividad ni envía mensajes. */
export function ChatTypingIndicator({ conversationId, className }: ChatTypingIndicatorProps) {
  const { conversation, currentUser, users } = useChatConversation(conversationId);
  const ids = [...new Set(conversation?.typingUserIds ?? [])].filter(id => id !== currentUser.id && conversation?.participantIds.includes(id));
  if (!ids.length) return null;
  const people = ids.map(id => users.find(user => user.id === id));
  const names = people.map(user => user?.name ?? 'Alguien');
  const text = ids.length === 1 ? `${names[0]} está escribiendo` : ids.length === 2 ? `${names[0]} y ${names[1]} están escribiendo` : `${names[0]}, ${names[1]} y ${ids.length - 2} más están escribiendo`;
  return <div className={cn('k-chat-typing', className)} role="status" aria-live="polite" aria-atomic="true">
    <div className="k-chat-typing-avatars" aria-hidden="true">{people.slice(0, 3).map((user, index) => <Avatar key={ids[index]} name={user?.name ?? 'Participante'} src={user?.avatar} size="sm" />)}</div>
    <div className="k-chat-typing-copy"><span className="k-chat-typing-dots" aria-hidden="true"><i /><i /><i /></span><span>{text}…</span></div>
  </div>;
}
