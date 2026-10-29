import * as React from 'react';
import { Modal } from '../components/Modal';
import { UiIcon } from '../icons';
import { useChatConversation } from './ChatProvider';
import type { ChatMessageData, ChatMessageStatus } from './types';

const labels: Record<ChatMessageStatus, string> = { sending: 'Enviando', sent: 'Enviado', delivered: 'Entregado', read: 'Leído', error: 'No enviado' };
const format = (value?: string) => value && !Number.isNaN(Date.parse(value)) ? new Date(value).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Sin confirmación';
export function ChatMessageReceipt({ message }: { message: ChatMessageData }) {
  const [open, setOpen] = React.useState(false);
  const { conversation, users } = useChatConversation(message.conversationId);
  const status = message.status ?? 'sent';
  const recipients = conversation?.participantIds.filter(id => id !== message.senderId) ?? [];
  return <><button type="button" className="k-chat-receipt" data-status={status} aria-label={`Estado del mensaje: ${labels[status]}`} title={labels[status]} onClick={() => setOpen(true)}>
    <span className="k-chat-receipt-checks" aria-hidden="true"><UiIcon slot={status === 'sending' ? 'clock' : status === 'error' ? 'alert-circle' : 'check'} size={14} />{(status === 'delivered' || status === 'read') && <UiIcon slot="check" size={14} />}</span>
    <span>{labels[status]}</span>
  </button><Modal isOpen={open} onClose={() => setOpen(false)} title="Información del mensaje" hideCancel>
    <div className="k-chat-receipt-details"><p><strong>{labels[status]}</strong></p>
      <dl><dt>Creado</dt><dd>{format(message.createdAt)}</dd><dt>Entregado</dt><dd>{format(message.deliveredAt)}</dd><dt>Leído</dt><dd>{format(message.readAt)}</dd></dl>
      <h3>Participantes</h3><ul>{recipients.map(id => { const receipt = message.receipts?.find(item => item.userId === id); return <li key={id}><strong>{users.find(user => user.id === id)?.name ?? 'Participante'}</strong><span>{receipt?.readAt ? `Leído · ${format(receipt.readAt)}` : receipt?.deliveredAt ? `Entregado · ${format(receipt.deliveredAt)}` : 'Sin confirmación individual'}</span></li>; })}</ul>
      <p>Las confirmaciones dependen de la información recibida del servicio de mensajería.</p>
    </div>
  </Modal></>;
}
