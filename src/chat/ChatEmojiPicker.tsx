import * as React from 'react';
import { UiIcon } from '../icons';
import { ChatPopover } from './ChatPopover';
import { CHAT_EMOJIS, searchChatEmojis, type ChatEmoji } from './emojiCatalog';
export interface ChatEmojiPickerProps { onSelect: (emoji: string) => void; label?: string; disabled?: boolean; catalog?: ChatEmoji[]; onOpen?: () => void }
function EmojiChoices({ catalog, select }: { catalog: ChatEmoji[]; select: (emoji: string) => void }) {
  const [query, setQuery] = React.useState('');
  const filtered = searchChatEmojis(query, catalog);
  const grid = React.useRef<HTMLDivElement>(null);
  return <><input autoFocus type="search" aria-label="Buscar emoji" placeholder="Buscar emoji…" value={query} onChange={event => setQuery(event.target.value)} className="k-chat-small-input" />
    <div className="k-chat-emoji-grid" ref={grid} role="group" aria-label="Emojis" onKeyDown={event => {
      const buttons = Array.from(grid.current?.querySelectorAll('button') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const step = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 } as Record<string, number>)[event.key];
      if (index >= 0 && step) { event.preventDefault(); buttons[(index + step + buttons.length) % buttons.length]?.focus(); }
    }}>{filtered.map(item => <button type="button" key={item.emoji} aria-label={item.label} title={item.label} onClick={() => select(item.emoji)}>{item.emoji}</button>)}</div>
    {!filtered.length && <p role="status">No hay emojis con ese nombre.</p>}</>;
}
export function ChatEmojiPicker({ onSelect, label = 'Insertar emoji', disabled, catalog = CHAT_EMOJIS, onOpen }: ChatEmojiPickerProps) {
  return <ChatPopover label={label} disabled={disabled} trigger={<UiIcon slot="smile" size={18} />} onOpen={onOpen}>
    {close => <EmojiChoices catalog={catalog} select={emoji => { close(); onSelect(emoji); }} />}
  </ChatPopover>;
}
