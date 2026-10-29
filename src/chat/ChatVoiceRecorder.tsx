import { formatClock } from '../internal/format';
import * as React from 'react';
import { useAudioRecording } from '../hooks/useAudioRecording';
import { UiIcon } from '../icons';
import { useChatActions, useChatConversation, useChatPeople } from './ChatProvider';
import { ChatAudioPlayer } from './ChatAudioPlayer';
import { useMessages } from '../i18n/I18nProvider';
export function ChatVoiceRecorder({ disabled, onBusyChange }: { disabled?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const ct = useMessages('chat');
  const { conversation } = useChatConversation();
  const { addAttachments, removeAttachment, selectConversation, sendMessage } = useChatActions();
  const { registerNavigationGuard } = useChatPeople();
  const [navigation, setNavigation] = React.useState<{ id: string | null }>();
  const finishTarget = React.useRef<{ id: string | null } | undefined>(undefined);
  const bypass = React.useRef(false);
  const uploadAbort = React.useRef<AbortController | null>(null);
  React.useEffect(() => () => uploadAbort.current?.abort(), []);
  const labels = React.useMemo(() => ({ microphoneDenied: ct.microphoneDenied, microphoneUnavailable: ct.microphoneUnavailable, audioUnavailable: ct.audioUnavailable, error: ct.voiceError }), [ct]);
  const recording = useAudioRecording(disabled, labels);
  const busy = recording.state !== 'idle';
  React.useEffect(() => { if (!busy) { setNavigation(undefined); return; } return registerNavigationGuard(id => { if (bypass.current) return true; setNavigation({ id }); return false; }); }, [busy, registerNavigationGuard]);
  const attach = async (blob: Blob) => {
    if (!conversation) return;
    const controller = new AbortController(); uploadAbort.current = controller;
    const result = await addAttachments([new File([blob], `${ct.voiceFileName}.${blob.type.includes('mp4') ? 'm4a' : 'webm'}`, { type: blob.type })], conversation.id, recording.elapsed, controller.signal);
    if (controller.signal.aborted) throw new DOMException(ct.voiceCancelled, 'AbortError');
    if (!result.length || result.some(item => item.status !== 'ready')) {
      result.forEach(item => removeAttachment(item.id, conversation.id));
      throw new Error(ct.voiceAttachFailed);
    }
  };
  React.useEffect(() => {
    if (recording.state !== 'recorded' || !recording.blob || !finishTarget.current) return;
    const target = finishTarget.current; finishTarget.current = undefined;
    void recording.useRecording(async blob => { await attach(blob); bypass.current = true; selectConversation(target.id); });
  }, [recording.state, recording.blob]);
  React.useEffect(() => { onBusyChange?.(busy); return () => onBusyChange?.(false); }, [busy, onBusyChange]);
  if (recording.state === 'idle') return <span className="k-chat-voice"><button type="button" className="k-chat-icon-button" title={ct.record} aria-label={ct.record} disabled={disabled || !recording.available} onClick={() => void recording.start()}><UiIcon slot="mic" size={17} /></button>{recording.error && <span role="alert">{recording.error}</span>}</span>;
  return <div className="k-chat-voice-controls" data-recording-state={recording.state}>
    {recording.state !== 'recorded' && <><span className="k-chat-record-dot" aria-hidden="true" />
    <span role="status" className="k-chat-record-label">{recording.state === 'requesting' ? ct.requesting : recording.state === 'paused' ? ct.paused : ct.recording}</span>
    <span className="k-chat-record-time">{formatClock(recording.elapsed)}</span></>}
    {['recording', 'paused'].includes(recording.state) && <><button type="button" className="k-chat-icon-button" aria-label={recording.state === 'paused' ? ct.resumeRecording : ct.pauseRecording} title={recording.state === 'paused' ? ct.resume : ct.pauseShort} onClick={recording.togglePause}><UiIcon slot={recording.state === 'paused' ? 'play' : 'pause'} size={16} /></button><button type="button" className="k-chat-icon-button" aria-label={ct.finishRecording} title={ct.finishAndListen} onClick={recording.finish}><UiIcon slot="square" size={14} /></button></>}
    {recording.blob && <ChatAudioPlayer blob={recording.blob} duration={recording.elapsed} title={ct.listen} />}
    <button type="button" className="k-chat-icon-button k-chat-voice-discard" aria-label={ct.cancelRecording} title={ct.deleteVoice} onClick={() => { uploadAbort.current?.abort(); recording.cancel(); }}><UiIcon slot="trash-2" size={17} /></button>
    {recording.state === 'recorded' && <button type="button" className="k-chat-send k-chat-icon-button" aria-label={ct.sendVoice} title={ct.sendVoice} onClick={() => void recording.useRecording(async blob => { await attach(blob); recording.cancel(); if (conversation) void sendMessage(conversation.id); })}><UiIcon slot="arrow-up" size={18} /></button>}
    {recording.error && <p role="alert">{recording.error}</p>}
    {navigation && <div role="alertdialog" aria-label={ct.recordingInProgress} className="k-chat-voice-navigation"><strong>{ct.voiceInProgress}</strong><p>{ct.voiceInProgressHint}</p>
      {['recording', 'paused', 'recorded'].includes(recording.state) && <button type="button" onClick={() => { finishTarget.current = navigation; if (recording.state === 'recorded' && recording.blob) { const target = navigation; finishTarget.current = undefined; void recording.useRecording(async blob => { await attach(blob); bypass.current = true; selectConversation(target.id); }); } else recording.finish(); }}>{ct.finishAndSwitch}</button>}
      <button type="button" onClick={() => { const target = navigation.id; uploadAbort.current?.abort(); bypass.current = true; recording.cancel(); selectConversation(target); }}>{ct.cancelAndSwitch}</button>
      <button type="button" onClick={() => setNavigation(undefined)}>{ct.stayHere}</button>
    </div>}
  </div>;
}
