import { useChatActions, useChatPeople, useChatState } from './ChatProvider';
import { effectiveReactions, reactionKey } from './reactions';
import { ChatPopover } from './ChatPopover';
import type { ChatMessageData } from './types';
export function ChatMessageReactions({ message }: { message: ChatMessageData }) {
  const state = useChatState();
  const { currentUser, users } = useChatPeople();
  const { toggleReaction } = useChatActions();
  const reactions = effectiveReactions(state, message);
  const readOnly = state.conversations.find(item => item.id === message.conversationId)?.readOnly;
  const errors = Object.entries(state.reactionErrors).filter(([key, value]) => value && JSON.parse(key)[0] === message.conversationId && JSON.parse(key)[1] === message.id);
  if (!reactions.length && !errors.length) return null;
  return <div className="k-chat-reactions">
    {reactions.map(item => {
      const own = item.userIds.includes(currentUser.id);
      const key = reactionKey({ conversationId: message.conversationId, messageId: message.id, userId: currentUser.id, emoji: item.emoji });
      return <button type="button" className="k-chat-reaction" key={item.emoji} aria-pressed={own} aria-label={`${item.emoji}, ${item.userIds.length} reacciones${own ? ', incluida la tuya' : ''}`}
        title={item.userIds.map(id => users.find(user => user.id === id)?.name ?? 'Participante').join(', ')} disabled={Boolean(readOnly || state.pendingReactions[key])}
        onClick={() => void toggleReaction(message.id, item.emoji, message.conversationId)}><span>{item.emoji}</span><span>{item.userIds.length}</span></button>;
    })}
    {Boolean(reactions.length) && <ChatPopover label="Ver quién ha reaccionado" trigger={<span className="k-chat-reaction-info">Ver</span>}>
      {() => <><strong>Reacciones</strong>{reactions.map(item => <p key={item.emoji}>{item.emoji} {item.userIds.map(id => users.find(user => user.id === id)?.name ?? 'Participante').join(', ')}</p>)}</>}
    </ChatPopover>}
    {errors.map(([key, error]) => <span role="alert" className="k-chat-message-error" key={key}>{error} <button type="button" disabled={readOnly} onClick={() => void toggleReaction(message.id, JSON.parse(key)[2], message.conversationId)}>Reintentar reacción</button></span>)}
  </div>;
}
