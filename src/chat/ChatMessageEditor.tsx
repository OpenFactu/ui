import * as React from 'react';
import { Textarea } from '../components/Textarea';
import { useChatActions, useChatState } from './ChatProvider';
import { chatOperationKey } from './controller';
import { Button } from '../components/Button';
import type { ChatMessageData } from './types';
export function ChatMessageEditor({ message, onClose }: { message: ChatMessageData; onClose: () => void }) {
  const [text, setText] = React.useState(message.text);
  const { editMessage } = useChatActions();
  const operation = useChatState().operations[chatOperationKey('message', message.conversationId, message.id)];
  const input = React.useRef<HTMLTextAreaElement>(null);
  React.useEffect(() => { input.current?.focus(); }, []);
  return <form className="k-chat-editor" onSubmit={async event => { event.preventDefault(); if (await editMessage(message.id, text, message.conversationId)) onClose(); }}>
    <Textarea inputRef={input} aria-label="Editar mensaje" value={text} disabled={operation?.pending} onChange={event => setText(event.target.value)} onKeyDown={event => { if (event.key === 'Escape' && !operation?.pending) onClose(); }} />
    <div><Button size="sm" variant="secondary" disabled={operation?.pending} onClick={onClose} type="button">Cancelar edición</Button><Button size="sm" type="submit" variant="accent" isLoading={operation?.pending} disabled={!text.trim()}>Guardar cambios</Button></div>
    {operation?.error && <p role="alert" className="k-chat-message-error">{operation.error}</p>}
  </form>;
}
