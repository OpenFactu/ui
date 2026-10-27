import type { ChatUser } from './types';
export function ChatMentionSuggestions({ users, activeIndex, onSelect }: { users: ChatUser[]; activeIndex: number; onSelect: (user: ChatUser) => void }) {
  return <div className="k-chat-mention-suggestions" role="listbox" aria-label="Mencionar participante">{users.map((user, index) =>
    <button type="button" role="option" aria-selected={index === activeIndex} key={user.id} onMouseDown={event => event.preventDefault()} onClick={() => onSelect(user)}>{user.name}</button>)}
    {!users.length && <span>No hay participantes con ese nombre.</span>}
  </div>;
}
