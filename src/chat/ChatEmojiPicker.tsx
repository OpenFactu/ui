import * as React from 'react';
import { UiIcon } from '../icons';
import { ChatPopover } from './ChatPopover';
import { CHAT_EMOJIS, localizeChatEmojis, searchChatEmojis, type ChatEmoji } from './emojiCatalog';
import { useMessages } from '../i18n/I18nProvider';
export interface ChatEmojiPickerProps { onSelect: (emoji: string) => void; label?: string; disabled?: boolean; catalog?: ChatEmoji[]; onOpen?: () => void }
function EmojiChoices({ catalog, select }: { catalog: ChatEmoji[]; select: (emoji: string) => void }) {
  const ct = useMessages('chat');
  const [query, setQuery] = React.useState('');
  const list = React.useMemo(() => (catalog === CHAT_EMOJIS ? localizeChatEmojis(catalog, ct.emojiNames as Record<string, string>, ct.emojiKeywords as Record<string, string>) : catalog), [catalog, ct]);
  const filtered = searchChatEmojis(query, list);
  const grid = React.useRef<HTMLDivElement>(null);
  return <><input autoFocus type="search" aria-label={ct.searchEmoji} placeholder={ct.searchEmojiPlaceholder} value={query} onChange={event => setQuery(event.target.value)} className="k-chat-small-input" />
    <div className="k-chat-emoji-grid" ref={grid} role="group" aria-label={ct.emojis} onKeyDown={event => {
      const buttons = Array.from(grid.current?.querySelectorAll('button') ?? []);
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const step = ({ ArrowRight: 1, ArrowLeft: -1, ArrowDown: 6, ArrowUp: -6 } as Record<string, number>)[event.key];
      if (index >= 0 && step) { event.preventDefault(); buttons[(index + step + buttons.length) % buttons.length]?.focus(); }
    }}>{filtered.map(item => <button type="button" key={item.emoji} aria-label={item.label} title={item.label} onClick={() => select(item.emoji)}>{item.emoji}</button>)}</div>
    {!filtered.length && <p role="status">{ct.noEmojis}</p>}</>;
}
export function ChatEmojiPicker({ onSelect, label: labelProp, disabled, catalog = CHAT_EMOJIS, onOpen }: ChatEmojiPickerProps) {
  const label = labelProp ?? useMessages('chat').insertEmoji;
  return <ChatPopover label={label} disabled={disabled} trigger={<UiIcon slot="smile" size={18} />} onOpen={onOpen}>
    {close => <EmojiChoices catalog={catalog} select={emoji => { close(); onSelect(emoji); }} />}
  </ChatPopover>;
}
