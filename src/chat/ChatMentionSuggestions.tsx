import type { ChatUser } from './types';
import { useMessages } from '../i18n/I18nProvider';
export function ChatMentionSuggestions({ users, activeIndex, onSelect }: { users: ChatUser[]; activeIndex: number; onSelect: (user: ChatUser) => void }) {
  const ct = useMessages('chat');
  return <div className="k-chat-mention-suggestions" role="listbox" aria-label={ct.mention}>{users.map((user, index) =>
    <button type="button" role="option" aria-selected={index === activeIndex} key={user.id} onMouseDown={event => event.preventDefault()} onClick={() => onSelect(user)}>{user.name}</button>)}
    {!users.length && <span>{ct.noMentions}</span>}
  </div>;
}
