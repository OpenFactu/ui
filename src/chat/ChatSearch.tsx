import * as React from 'react';
import { useChatActions, useChatConversation } from './ChatProvider';
import { UiIcon } from '../icons';
import { useChatMessageText } from './blocks';
import { useMessages } from '../i18n/I18nProvider';
import { matchesAllWords } from '../internal/text';

/**
 * Buscar en los mensajes cargados, sin mirar acentos y con todas las palabras en cualquier orden. Como en las apps de
 * mensajería, empieza por la coincidencia más reciente (1 / n), y ↑ o Intro van hacia atrás en la conversación.
 */
export function ChatSearch({ query, onChange, onClose }: { query: string; onChange: (query: string) => void; onClose: () => void }) {
  const ct = useMessages('chat');
  const { messages, conversation } = useChatConversation(); const { focusMessage } = useChatActions();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const input = React.useRef<HTMLInputElement>(null);
  const messageText = useChatMessageText();
  const searching = query.trim().length > 0;
  // De la más reciente a la más antigua. La activa se recuerda por id: si llega un mensaje nuevo, no se pierde el sitio.
  const results = searching ? messages.filter(message => !message.deletedAt && matchesAllWords(messageText(message), query)).reverse() : [];
  const rank = Math.max(0, results.findIndex(message => message.id === activeId));
  const select = (position: number) => {
    if (!results.length) return;
    const next = results[(position + results.length) % results.length];
    setActiveId(next.id); focusMessage(next.id);
  };
  React.useEffect(() => { setActiveId(null); select(0); }, [query, conversation?.id]);
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') { event.preventDefault(); select(rank + (event.shiftKey ? -1 : 1)); }
    if (event.key === 'ArrowUp') { event.preventDefault(); select(rank + 1); }
    if (event.key === 'ArrowDown') { event.preventDefault(); select(rank - 1); }
  };
  const clear = () => { onChange(''); input.current?.focus(); };
  return <div className="k-chat-search-messages" role="search" aria-label={ct.searchLoaded} onKeyDown={event => { if (event.key === 'Escape') onClose(); }}>
    <label className="k-chat-search-field" data-k-focus-surface="">
      <UiIcon slot="search" size={15} />
      <input ref={input} autoFocus type="search" data-k-focus-input="" aria-label={ct.searchInMessages} placeholder={ct.searchPlaceholder} value={query} onChange={event => onChange(event.target.value)} onKeyDown={onKeyDown} />
      {/* Sin coincidencias: «0 / 0» a la vista y la frase para el lector de pantalla (entera le quitaría el sitio al campo). */}
      <span className="k-chat-search-count" role="status" data-empty={searching && !results.length ? true : undefined}>
        {searching && (results.length ? `${rank + 1} / ${results.length}` : <><span aria-hidden="true">0 / 0</span><span className="sr-only">{ct.noSearchMatches}</span></>)}
      </span>
      {searching && <button type="button" className="k-chat-search-clear" aria-label={ct.clearSearch} onClick={clear}><UiIcon slot="x" size={12} /></button>}
    </label>
    {searching && <>
      <button type="button" className="k-chat-icon-button" aria-label={ct.previousMatch} disabled={!results.length} onClick={() => select(rank + 1)}><UiIcon slot="chevron-up" size={16} /></button>
      <button type="button" className="k-chat-icon-button" aria-label={ct.nextMatch} disabled={!results.length} onClick={() => select(rank - 1)}><UiIcon slot="chevron-down" size={16} /></button>
    </>}
    <button type="button" className="k-chat-icon-button" aria-label={ct.closeSearch} onClick={onClose}><UiIcon slot="x" size={16} /></button>
  </div>;
}
