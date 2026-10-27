import { ChatPopover } from './ChatPopover';
import { useChatActions, useChatConversation } from './ChatProvider';
import { UiIcon } from '../icons';
export function ChatPinnedMessages() {
  const { conversation, messages } = useChatConversation(); const { focusMessage } = useChatActions();
  const ids = conversation?.pinnedMessageIds ?? [];
  if (!ids.length) return null;
  return <ChatPopover label={`Mensajes fijados (${ids.length})`} trigger={<UiIcon slot="pin" size={17} />}>
    {close => <div className="k-chat-menu"><strong>Mensajes fijados</strong>{ids.map(id => {
      const message = messages.find(item => item.id === id || item.clientId === id);
      return <button type="button" key={id} disabled={!message || Boolean(message.deletedAt)} onClick={() => { focusMessage(id); close(false); }}>{message?.text || (message?.attachments?.length ? 'Archivo adjunto' : 'Mensaje fuera del historial cargado')}</button>;
    })}</div>}
  </ChatPopover>;
}
