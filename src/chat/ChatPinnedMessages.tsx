import { ChatPopover } from './ChatPopover';
import { useChatActions, useChatConversation } from './ChatProvider';
import { UiIcon } from '../icons';
import { useI18n } from '../i18n/I18nProvider';
export function ChatPinnedMessages() {
  const { messages: { chat: ct }, format } = useI18n();
  const { conversation, messages } = useChatConversation(); const { focusMessage } = useChatActions();
  const ids = conversation?.pinnedMessageIds ?? [];
  if (!ids.length) return null;
  return <ChatPopover label={format(ct.pinnedCount, { count: ids.length })} trigger={<UiIcon slot="pin" size={17} />}>
    {close => <div className="k-chat-menu"><strong>{ct.pinned}</strong>{ids.map(id => {
      const message = messages.find(item => item.id === id || item.clientId === id);
      return <button type="button" key={id} disabled={!message || Boolean(message.deletedAt)} onClick={() => { focusMessage(id); close(false); }}>{message?.text || (message?.attachments?.length ? ct.attachment : ct.outOfHistory)}</button>;
    })}</div>}
  </ChatPopover>;
}
