import * as React from 'react';
import { Modal } from '../components/Modal';
import { Button } from '../components/Button';
import { Checkbox } from '../components/Checkbox';
import { Select } from '../components/Select';
import { UiIcon } from '../icons';
import { useChatActions, useChatConversation, useChatPeople, useChatState } from './ChatProvider';
import { ChatAttachments } from './ChatAttachments';

/** Información compartida y operaciones sobre mensajes ya cargados. */
export function ChatConversationTools() {
  const { conversation, messages, users } = useChatConversation();
  const state = useChatState(); const actions = useChatActions(); const { canDelete } = useChatPeople();
  const [open, setOpen] = React.useState(false); const [selected, setSelected] = React.useState<string[]>([]);
  const [target, setTarget] = React.useState(''); const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState(''); const [confirm, setConfirm] = React.useState(false);
  React.useEffect(() => { setOpen(false); setSelected([]); setTarget(''); setNotice(''); setConfirm(false); }, [conversation?.id]);
  if (!conversation) return null;
  const available = messages.filter(item => !item.deletedAt && !['sending', 'error'].includes(item.status ?? ''));
  const chosen = available.filter(item => selected.includes(item.id));
  const links = [...new Set(available.flatMap(item => item.text.match(/https?:\/\/[^\s<>]+/g) ?? []))];
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
      setNotice(failed.length ? `${failed.length} mensajes no se han podido procesar. Los envíos fallidos se pueden reintentar en el chat de destino.` : remove ? 'Mensajes eliminados.' : 'Mensajes reenviados.');
    } finally { setBusy(false); }
  };
  return <><button className="k-chat-icon-button" type="button" aria-label="Información y mensajes" onClick={() => setOpen(true)}><UiIcon slot="info" size={18} /></button>
    <Modal isOpen={open} onClose={() => { if (!busy) setOpen(false); }} title={conversation.title} fullHeight hideCancel>
      <div className="k-chat-details">
        <section><h3>Participantes</h3><ul>{conversation.participantIds.map(id => <li key={id}>{users.find(user => user.id === id)?.name ?? id}</li>)}</ul></section>
        <section><h3>Archivos compartidos</h3>{available.some(item => item.attachments?.length) ? available.filter(item => item.attachments?.length).map(item => <ChatAttachments key={item.id} attachments={item.attachments!} conversationId={conversation.id} />) : <p>No hay archivos en los mensajes cargados.</p>}</section>
        <section><h3>Enlaces compartidos</h3>{links.length ? <ul>{links.map(url => <li key={url}><a href={url} target="_blank" rel="noopener noreferrer">{url}</a></li>)}</ul> : <p>No hay enlaces en los mensajes cargados.</p>}</section>
        <section><h3>Seleccionar mensajes</h3><p>Selecciona uno o varios mensajes cargados para copiar, reenviar o eliminar.</p>
          <div className="k-chat-selection-list">{available.map(item => <Checkbox key={item.id} disabled={busy} checked={selected.includes(item.id)} onChange={checked => { setConfirm(false); setSelected(ids => checked ? [...ids, item.id] : ids.filter(id => id !== item.id)); }} label={item.text || 'Mensaje con archivos'} />)}</div>
          <p role="status">{chosen.length} seleccionados</p>
          <Button disabled={!chosen.length || busy} variant="secondary" onClick={async () => { try { await navigator.clipboard.writeText(chosen.map(item => item.text).join('\n\n')); setNotice('Mensajes copiados.'); } catch { setNotice('No se han podido copiar los mensajes.'); } }}>Copiar seleccionados</Button>
          <Select label="Reenviar a" value={target} onChange={setTarget} disabled={busy} options={state.conversations.filter(item => item.id !== conversation.id && !item.readOnly).map(item => ({ value: item.id, label: item.title }))} />
          <Button disabled={!chosen.length || !target || busy} onClick={() => void run(false)}>Reenviar seleccionados</Button>
          {!conversation.readOnly && chosen.length > 0 && chosen.every(canDelete) && <Button disabled={busy} variant="secondary" onClick={() => confirm ? void run(true) : setConfirm(true)}>{confirm ? 'Confirmar eliminación' : 'Eliminar seleccionados'}</Button>}
          {confirm && <Button variant="ghost" disabled={busy} onClick={() => setConfirm(false)}>Cancelar eliminación</Button>}
          {notice && <p role="status">{notice}</p>}
        </section>
      </div>
    </Modal></>;
}
