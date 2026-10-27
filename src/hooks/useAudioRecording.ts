import * as React from 'react';
export type AudioRecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopping' | 'recorded' | 'sending';
export interface AudioRecordingLabels { microphoneDenied: string; microphoneUnavailable: string; audioUnavailable: string; error: string }
/** Shared by human messaging and AI. No transport, URLs or UI ownership. */
export function useAudioRecording(disabled: boolean | undefined, labels: AudioRecordingLabels) {
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [state, setState] = React.useState<AudioRecordingState>('idle');
  const [blob, setBlob] = React.useState<Blob>();
  const [elapsed, setElapsed] = React.useState(0);
  const [error, setError] = React.useState('');
  const recorder = React.useRef<MediaRecorder | null>(null);
  const stream = React.useRef<MediaStream | null>(null);
  const request = React.useRef(0); const mounted = React.useRef(true);
  const chunks = React.useRef<Blob[]>([]); const started = React.useRef(0); const accumulated = React.useRef(0);
  const release = React.useCallback(() => {
    const current = recorder.current;
    if (current) { current.ondataavailable = null; current.onstop = null; current.onerror = null; if (current.state !== 'inactive') try { current.stop(); } catch { /* Disconnected device. */ } }
    recorder.current = null; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
  }, []);
  const cancel = React.useCallback(() => { request.current++; release(); setBlob(undefined); setElapsed(0); setError(''); setState('idle'); }, [release]);
  React.useEffect(() => { mounted.current = true; setAvailable(typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext);
    return () => { mounted.current = false; request.current++; release(); }; }, [release]);
  React.useEffect(() => { if (disabled) cancel(); }, [disabled, cancel]);
  React.useEffect(() => { if (state !== 'recording') return; const timer = setInterval(() => setElapsed((accumulated.current + Date.now() - started.current) / 1000), 200); return () => clearInterval(timer); }, [state]);
  async function start() {
    if (!available || state !== 'idle' || disabled) return;
    const id = ++request.current; setState('requesting'); setError(''); setBlob(undefined); setElapsed(0); accumulated.current = 0;
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || id !== request.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const next = new MediaRecorder(input, mimeType ? { mimeType } : undefined); recorder.current = next; chunks.current = [];
      next.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      next.onerror = () => { if (mounted.current && id === request.current) { release(); setError(labels.microphoneUnavailable); setState('idle'); } };
      next.onstop = () => {
        if (!mounted.current || id !== request.current) return;
        const result = new Blob(chunks.current, { type: next.mimeType || chunks.current[0]?.type || 'audio/webm' }); release();
        if (result.size) { setBlob(result); setState('recorded'); } else { setError(labels.audioUnavailable); setState('idle'); }
      };
      next.start(250); started.current = Date.now(); setState('recording');
    } catch (cause) {
      if (!mounted.current || id !== request.current) return;
      release(); setState('idle'); setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? labels.microphoneDenied : labels.microphoneUnavailable);
    }
  }
  function togglePause() {
    if (state === 'recording') { accumulated.current += Date.now() - started.current; recorder.current?.pause(); setElapsed(accumulated.current / 1000); setState('paused'); }
    else if (state === 'paused') { started.current = Date.now(); recorder.current?.resume(); setState('recording'); }
  }
  function finish() {
    if (!['recording', 'paused'].includes(state)) return;
    if (state === 'recording') accumulated.current += Date.now() - started.current;
    setElapsed(accumulated.current / 1000); setState('stopping'); recorder.current?.stop(); stream.current?.getTracks().forEach(track => track.stop());
  }
  async function useRecording(callback: (blob: Blob) => void | Promise<void>) {
    if (!blob || state !== 'recorded' || disabled) return;
    const id = request.current; setState('sending'); setError('');
    try { await callback(blob); if (mounted.current && id === request.current) cancel(); }
    catch (cause) { if (mounted.current && id === request.current) { setState('recorded'); setError(cause instanceof Error ? cause.message : labels.error); } }
  }
  return { available, state, blob, elapsed, error, start, cancel, togglePause, finish, useRecording };
}
