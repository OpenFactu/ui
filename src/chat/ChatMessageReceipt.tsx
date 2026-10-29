import { DEFAULT_LOCALE } from '../internal/intl';
import * as React from 'react';
import { Modal } from '../components/Modal';
import { UiIcon } from '../icons';
import { useChatConversation } from './ChatProvider';
import type { ChatMessageData } from './types';
import { useI18n } from '../i18n/I18nProvider';

const formatWhen = (value: string | undefined, empty: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString(DEFAULT_LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : empty;
export function ChatMessageReceipt({ message }: { message: ChatMessageData }) {
  const { messages: { chat: ct }, format: fmt } = useI18n();
  const when = (value?: string) => formatWhen(value, ct.noConfirmation);
  const [open, setOpen] = React.useState(false);
  const { conversation, users } = useChatConversation(message.conversationId);
  const status = message.status ?? 'sent';
  const recipients = conversation?.participantIds.filter(id => id !== message.senderId) ?? [];
  return <><button type="button" className="k-chat-receipt" data-status={status} aria-label={fmt(ct.statusLabel, { status: ct.status[status] })} title={ct.status[status]} onClick={() => setOpen(true)}>
    <span className="k-chat-receipt-checks" aria-hidden="true"><UiIcon slot={status === 'sending' ? 'clock' : status === 'error' ? 'alert-circle' : 'check'} size={14} />{(status === 'delivered' || status === 'read') && <UiIcon slot="check" size={14} />}</span>
    <span>{ct.status[status]}</span>
  </button><Modal isOpen={open} onClose={() => setOpen(false)} title={ct.info} hideCancel>
    <div className="k-chat-receipt-details"><p><strong>{ct.status[status]}</strong></p>
      <dl><dt>{ct.created}</dt><dd>{when(message.createdAt)}</dd><dt>{ct.delivered}</dt><dd>{when(message.deliveredAt)}</dd><dt>{ct.read}</dt><dd>{when(message.readAt)}</dd></dl>
      <h3>{ct.participants}</h3><ul>{recipients.map(id => { const receipt = message.receipts?.find(item => item.userId === id); return <li key={id}><strong>{users.find(user => user.id === id)?.name ?? ct.participant}</strong><span>{receipt?.readAt ? fmt(ct.readAt, { date: when(receipt.readAt) }) : receipt?.deliveredAt ? fmt(ct.deliveredAt, { date: when(receipt.deliveredAt) }) : ct.noIndividualConfirmation}</span></li>; })}</ul>
      <p>{ct.receiptsHint}</p>
    </div>
  </Modal></>;
}
