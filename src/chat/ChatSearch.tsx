import * as React from 'react';
import { useChatActions, useChatConversation } from './ChatProvider';
import { UiIcon } from '../icons';
export function ChatSearch({ query, onChange, onClose }: { query: string; onChange: (query: string) => void; onClose: () => void }) {
  const { messages } = useChatConversation(); const { focusMessage } = useChatActions();
  const [index, setIndex] = React.useState(0);
  const results = messages.filter(message => !message.deletedAt && query.trim() && message.text.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const select = (position: number) => { if (!results.length) return; const next = (position + results.length) % results.length; setIndex(next); focusMessage(results[next].id); };
  React.useEffect(() => { setIndex(0); if (results[0]) focusMessage(results[0].id); }, [query]);
  return <div className="k-chat-search-messages" role="search" aria-label="Buscar en mensajes cargados">
    <input autoFocus type="search" className="k-chat-small-input" aria-label="Buscar en mensajes" placeholder="Buscar en mensajes cargados…" value={query} onChange={event => onChange(event.target.value)} onKeyDown={event => { if (event.key === 'Escape') onClose(); if (event.key === 'Enter') { event.preventDefault(); select(index + (event.shiftKey ? -1 : 1)); } }} />
    <span role="status">{results.length ? `${index + 1} / ${results.length}` : 'Sin coincidencias'}</span>
    <button type="button" className="k-chat-icon-button" aria-label="Coincidencia anterior" disabled={!results.length} onClick={() => select(index - 1)}><UiIcon slot="chevron-up" size={16} /></button>
    <button type="button" className="k-chat-icon-button" aria-label="Coincidencia siguiente" disabled={!results.length} onClick={() => select(index + 1)}><UiIcon slot="chevron-down" size={16} /></button>
    <button type="button" className="k-chat-icon-button" aria-label="Cerrar búsqueda de mensajes" onClick={onClose}><UiIcon slot="x" size={16} /></button>
  </div>;
}
