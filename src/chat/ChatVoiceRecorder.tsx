import * as React from 'react';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { UiIcon } from '../icons';
import { useChatActions, useChatConversation, useChatPeople } from './ChatProvider';
import { ChatAudioPlayer } from './ChatAudioPlayer';
const labels = { microphoneDenied: 'Permite el micrófono para grabar una nota de voz.', microphoneUnavailable: 'No se puede acceder al micrófono.', audioUnavailable: 'No se ha podido grabar el audio.', error: 'No se ha podido añadir la nota de voz.' };
export function ChatVoiceRecorder({ disabled, onBusyChange }: { disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const { conversation } = useChatConversation();
  const { addAttachments, removeAttachment, selectConversation, sendMessage } = useChatActions();
  const { registerNavigationGuard } = useChatPeople();
  const [navigation, setNavigation] = React.useState<{ id: string | null }>();
  const finishTarget = React.useRef<{ id: string | null } | undefined>(undefined);
  const bypass = React.useRef(false);
  const uploadAbort = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => uploadAbort.current?.abort(), []);
  const recording = useAudioRecording(disabled, labels);
  const busy = recording.state !== 'idle';
  React.useEffect(() => { if (!busy) { setNavigation(undefined); return; } return registerNavigationGuard(id => { if (bypass.current) return true; setNavigation({ id }); return false; }); }, [busy, registerNavigationGuard]);
  const attach = async (blob: Blob) => {
    if (!conversation) return;
    const controller = new AbortController(); uploadAbort.current = controller;
    const result = await addAttachments([new File([blob], `nota-de-voz.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type })], conversation.id, recording.elapsed, controller.signal);
    if (controller.signal.aborted) throw new DOMException('Grabación cancelada', 'AbortError');
    if (!result.length || result.some(item => item.status !== 'ready')) {
      result.forEach(item => removeAttachment(item.id, conversation.id));
      throw new Error('No se ha podido adjuntar la nota de voz. Puedes volver a intentarlo.');
    }
  };
  React.useEffect(() => {
    if (recording.state !== 'recorded' || !recording.blob || !finishTarget.current) return;
    const target = finishTarget.current; finishTarget.current = undefined;
    void recording.useRecording(async blob => { await attach(blob); bypass.current = true; selectConversation(target.id); });
  }, [recording.state, recording.blob]);
  React.useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  if (recording.state === 'idle') return <span className="k-chat-voice"><button type="button" className="k-chat-icon-button" title="Grabar nota de voz" aria-label="Grabar nota de voz" disabled={disabled || !recording.available} onClick={() => void recording.start()}><UiIcon slot="mic" size={17} /></button>{recording.error && <span role="alert">{recording.error}</span>}</span>;
  return <div className="k-chat-voice-controls" data-recording-state={recording.state}>
    {recording.state !== 'recorded' && <><span className="k-chat-record-dot" aria-hidden="true" />
    <span role="status" className="k-chat-record-label">{recording.state === 'requesting' ? 'Permiso…' : recording.state === 'paused' ? 'En pausa' : 'Grabando'}</span>
    <span className="k-chat-record-time">{Math.floor(recording.elapsed / 60)}:{String(Math.floor(recording.elapsed % 60)).padStart(2,'0')}</span></>}
    {['recording', 'paused'].includes(recording.state) && <><button type="button" className="k-chat-icon-button" aria-label={recording.state === 'paused' ? 'Continuar grabación' : 'Pausar grabación'} title={recording.state === 'paused' ? 'Continuar' : 'Pausar'} onClick={recording.togglePause}><UiIcon slot={recording.state === 'paused' ? 'play' : 'pause'} size={16} /></button><button type="button" className="k-chat-icon-button" aria-label="Terminar grabación" title="Terminar y escuchar" onClick={recording.finish}><UiIcon slot="square" size={14} /></button></>}
    {recording.blob && <ChatAudioPlayer blob={recording.blob} duration={recording.elapsed} title="Escuchar nota de voz" />}
    <button type="button" className="k-chat-icon-button k-chat-voice-discard" aria-label="Cancelar grabación" title="Eliminar nota de voz" onClick={() => { uploadAbort.current?.abort(); recording.cancel(); }}><UiIcon slot="trash-2" size={17} /></button>
    {recording.state === 'recorded' && <button type="button" className="k-chat-send k-chat-icon-button" aria-label="Enviar nota de voz" title="Enviar nota de voz" onClick={() => void recording.useRecording(async blob => { await attach(blob); recording.cancel(); if (conversation) void sendMessage(conversation.id); })}><UiIcon slot="arrow-up" size={18} /></button>}
    {recording.error && <p role="alert">{recording.error}</p>}
    {navigation && <div role="alertdialog" aria-label="Grabación en curso" className="k-chat-voice-navigation"><strong>Hay una nota de voz en curso</strong><p>Termina la nota o cancélala antes de cambiar de conversación.</p>
      {['recording', 'paused', 'recorded'].includes(recording.state) && <button type="button" onClick={() => { finishTarget.current = navigation; if (recording.state === 'recorded' && recording.blob) { const target = navigation; finishTarget.current = undefined; void recording.useRecording(async blob => { await attach(blob); bypass.current = true; selectConversation(target.id); }); } else recording.finish(); }}>Terminar y cambiar</button>}
      <button type="button" onClick={() => { const target = navigation.id; uploadAbort.current?.abort(); bypass.current = true; recording.cancel(); selectConversation(target); }}>Cancelar grabación y cambiar</button>
      <button type="button" onClick={() => setNavigation(undefined)}>Seguir aquí</button>
    </div>}
  </div>;
}
