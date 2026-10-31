import { copyText } from '../hooks/useCopyToClipboard';
import * as React from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Select } from '../components/Select';
import { UiIcon } from '../icons';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { ChatAttachments } from './ChatAttachments';
import { useChatMessageText } from './blocks';
import type { ChatConversationData, ChatMessageData } from './types';
import { useI18n } from '../i18n/I18nProvider';

/*
 * Información de la conversación, en piezas sueltas. `ChatConversationDetails` es la composición de serie;
 * la aplicación puede montar la suya con estas piezas y lo que quiera (o sin ellas) y pasarla a
 * `ChatWorkspace details={conversation => …}`.
 */

/** Mensajes cargados que se pueden compartir (sin eliminados ni pendientes). */
function useAvailableMessages(): ChatMessageData[] {
  const { messages } = useChatConversation();
  return React.useMemo(() => messages.filter(item => !item.deletedAt && !['sending', 'error'].includes(item.status ?? '')), [messages]);
}

export interface ChatDetailsSectionProps { className?: string; title?: React.ReactNode }

export function ChatDetailsParticipants({ className, title }: ChatDetailsSectionProps) {
  const { messages: { chat: ct } } = useI18n();
  const { conversation, users } = useChatConversation();
  if (!conversation) return null;
  return <section className={className}><h3>{title ?? ct.participants}</h3><ul>{conversation.participantIds.map(id => <li key={id}>{users.find(user => user.id === id)?.name ?? id}</li>)}</ul></section>;
}

export function ChatDetailsFiles({ className, title }: ChatDetailsSectionProps) {
  const { messages: { chat: ct } } = useI18n();
  const { conversation } = useChatConversation();
  const withFiles = useAvailableMessages().filter(item => item.attachments?.length);
  if (!conversation) return null;
  return <section className={className}><h3>{title ?? ct.sharedFiles}</h3>
    {withFiles.length ? withFiles.map(item => <ChatAttachments key={item.id} attachments={item.attachments!} conversationId={conversation.id} />) : <p>{ct.noFiles}</p>}</section>;
}

export function ChatDetailsLinks({ className, title }: ChatDetailsSectionProps) {
  const { messages: { chat: ct } } = useI18n();
  const available = useAvailableMessages();
  const links = [...new Set(available.flatMap(item => item.text.match(/https?:\/\/[^\s<>]+/g) ?? []))];
  return <section className={className}><h3>{title ?? ct.sharedLinks}</h3>
    {links.length ? <ul>{links.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>)}</ul> : <p>{ct.noLinks}</p>}</section>;
}

/** Seleccionar mensajes cargados para copiarlos, reenviarlos o eliminarlos. */
export function ChatMessageSelection({ className, title }: ChatDetailsSectionProps) {
  const { messages: { chat: ct }, format } = useI18n();
  const { conversation } = useChatConversation();
  const state = useChatState(); const actions = useChatActions(); const { canDelete } = useChatPeople();
  const messageText = useChatMessageText();
  const available = useAvailableMessages();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [target, setTarget] = React.useState(''); const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState(''); const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => { setSelected([]); setTarget(''); setNotice(''); setConfirm(false); }, [conversation?.id]);
  if (!conversation) return null;
  const chosen = available.filter(item => selected.includes(item.id));
  const run = async (remove: boolean) => {
    if (busy || !chosen.length) return;
    setBusy(true); setNotice('');
    const failed: string[] = [];
    try {
      for (const message of chosen) {
        const ok = remove ? await actions.deleteMessage(message.id, conversation.id) : await actions.forwardMessage(message.id, conversation.id, target);
        if (!ok) failed.push(message.id);
      }
      setSelected(failed); setConfirm(false);
      setNotice(failed.length ? format(ct.someFailed, { count: failed.length }) : remove ? ct.deleted : ct.forwarded);
    } finally { setBusy(false); }
  };
  return <section className={className}><h3>{title ?? ct.selectMessages}</h3><p>{ct.selectHint}</p>
    <div className="k-chat-selection-list">{available.map(item => <Checkbox key={item.id} disabled={busy} checked={selected.includes(item.id)} onChange={checked => { setConfirm(false); setSelected(ids => checked ? [...ids, item.id] : ids.filter(id => id !== item.id)); }} label={messageText(item) || ct.messageWithFiles} />)}</div>
    <p role="status">{format(ct.selectedCount, { count: chosen.length })}</p>
    <Button disabled={!chosen.length || busy} variant="secondary" onClick={async () => setNotice(await copyText(chosen.map(item => messageText(item)).join('\n\n')) ? ct.copiedMessages : ct.copyFailed)}>{ct.copySelected}</Button>
    <Select label={ct.forwardTo} value={target} onChange={setTarget} disabled={busy} options={state.conversations.filter(item => item.id !== conversation.id && !item.readOnly).map(item => ({ value: item.id, label: item.title }))} />
    <Button disabled={!chosen.length || !target || busy} onClick={() => void run(false)}>{ct.forwardSelected}</Button>
    {!conversation.readOnly && chosen.length > 0 && chosen.every(canDelete) && <Button disabled={busy} variant="secondary" onClick={() => confirm ? void run(true) : setConfirm(true)}>{confirm ? ct.confirmDelete : ct.deleteSelected}</Button>}
    {confirm && <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>{ct.cancelDelete}</Button>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}

/** La composición de serie: participantes, archivos, enlaces y selección. */
export function ChatConversationDetails({ className }: { className?: string }) {
  return <div className={className ? `k-chat-details ${className}` : 'k-chat-details'}>
    <ChatDetailsParticipants /><ChatDetailsFiles /><ChatDetailsLinks /><ChatMessageSelection />
  </div>;
}

export interface ChatConversationToolsProps {
  /** Abierto desde fuera (por ejemplo, desde el menú de la cabecera plegada). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Pinta su botón ⓘ. Default true. */
  trigger?: boolean;
  /** Contenido propio del diálogo en vez de `ChatConversationDetails`. */
  renderContent?: (conversation: ChatConversationData) => React.ReactNode;
}
/** Botón ⓘ y diálogo con la información de la conversación. */
export function ChatConversationTools({ open: openProp, onOpenChange, trigger = true, renderContent }: ChatConversationToolsProps = {}) {
  const { messages: { chat: ct } } = useI18n();
  const { conversation } = useChatConversation();
  const [openState, setOpenState] = React.useState(false);
  const open = openProp ?? openState;
  const setOpen = (value: boolean) => { setOpenState(value); onOpenChange?.(value); };
  React.useEffect(() => { setOpen(false); }, [conversation?.id]);
  if (!conversation) return null;
  return <>{trigger && <button className="k-chat-icon-button" type="button" aria-label={ct.details} onClick={() => setOpen(true)}><UiIcon slot="info" size={18} /></button>}
    <Modal isOpen={open} onClose={() => setOpen(false)} title={conversation.title} fullHeight hideCancel>
      {renderContent ? renderContent(conversation) : <ChatConversationDetails />}
    </Modal></>;
}
