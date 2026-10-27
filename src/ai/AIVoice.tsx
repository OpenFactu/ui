import * as React from 'react';
import { UiIcon } from '../icons';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import { cn } from '../utils';
import { aiLabels } from './labels';
import type { AIUIProps } from './types';
import { AIIconButton, AIStatus, useBlobUrl } from './internal/ui';
import { safeUrl } from './internal/helpers';

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export interface AIAudioPlayerProps extends AIUIProps { src?: string; blob?: Blob; title?: string }
export function AIAudioPlayer({ src, blob, title, labels, className }: AIAudioPlayerProps) {
  const l = aiLabels(labels);
  const objectUrl = useBlobUrl(blob);
  const source = safeUrl(src, 'media') ?? objectUrl;
  const audio = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [position, setPosition] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [speed, setSpeed] = React.useState('1');
  const [error, setError] = React.useState('');
  React.useEffect(() => { setPlaying(false); setPosition(0); setDuration(0); setError(''); }, [source]);
  return <div className={cn('ai-surface ai-audio', className)} aria-label={title ?? l.play}>
    {title && <strong>{title}</strong>}
    <audio ref={audio} src={source} preload="metadata" onLoadedMetadata={() => setDuration(Number.isFinite(audio.current?.duration) ? audio.current!.duration : 0)}
      onDurationChange={() => { if (Number.isFinite(audio.current?.duration)) setDuration(audio.current!.duration); }}
      onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError(l.audioUnavailable)} />
    <div className="ai-audio-controls"><AIIconButton label={playing ? l.pause : l.play} disabled={!source} onClick={async () => {
      if (!audio.current) return;
      if (playing) audio.current.pause();
      else try { await audio.current.play(); setError(''); } catch { setError(l.audioUnavailable); }
    }}>{playing ? <UiIcon slot="pause" size={15} /> : <UiIcon slot="play" size={15} />}</AIIconButton>
      <input type="range" aria-label={l.audioPosition} min={0} max={duration || 0} step={0.1} value={Math.min(position, duration)} disabled={!duration} onChange={event => { const value = Number(event.target.value); if (audio.current) audio.current.currentTime = value; setPosition(value); }} />
      <span className="ai-audio-time">{clock(position)} / {clock(duration)}</span>
      <div className="ai-audio-speed"><Select ariaLabel={l.playbackSpeed} value={speed} options={['0.75', '1', '1.25', '1.5', '2'].map(value => ({ value, label: `${value}×` }))} onChange={value => { setSpeed(value); if (audio.current) audio.current.playbackRate = Number(value); }} /></div>
      <input className="ai-audio-volume" type="range" aria-label={l.volume} min={0} max={1} step={0.05} defaultValue={1} onChange={event => { if (audio.current) audio.current.volume = Number(event.target.value); }} />
    </div>{error && <p role="status" className="ai-error">{error}</p>}
  </div>;
}

export interface AIVoiceRecorderProps extends AIUIProps { onRecorded: (blob: Blob) => void | Promise<void>; disabled?: boolean; /** Botón de icono para la barra del compositor. */ compact?: boolean }
type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopping' | 'recorded' | 'sending';
export function AIVoiceRecorder({ onRecorded, disabled, compact, labels, className }: AIVoiceRecorderProps) {
  const l = aiLabels(labels);
  const [available, setAvailable] = React.useState<boolean | null>(null);
  const [state, setState] = React.useState<RecordingState>('idle');
  const [blob, setBlob] = React.useState<Blob>();
  const [elapsed, setElapsed] = React.useState(0);
  const [error, setError] = React.useState('');
  const recorder = React.useRef<MediaRecorder | null>(null);
  const stream = React.useRef<MediaStream | null>(null);
  const request = React.useRef(0);
  const mounted = React.useRef(true);
  const chunks = React.useRef<Blob[]>([]);
  const started = React.useRef(0);
  const accumulated = React.useRef(0);

  function release() {
    const current = recorder.current;
    if (current) {
      current.ondataavailable = null; current.onstop = null; current.onerror = null;
      if (current.state !== 'inactive') try { current.stop(); } catch { /* Device may have disconnected. */ }
    }
    recorder.current = null;
    stream.current?.getTracks().forEach(track => track.stop()); stream.current = null;
  }
  React.useEffect(() => {
    mounted.current = true;
    setAvailable(typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && window.isSecureContext);
    return () => { mounted.current = false; request.current++; release(); };
  }, []);
  React.useEffect(() => {
    if (state !== 'recording') return;
    const timer = setInterval(() => setElapsed((accumulated.current + Date.now() - started.current) / 1000), 200);
    return () => clearInterval(timer);
  }, [state]);
  React.useEffect(() => { if (disabled) { request.current++; release(); setBlob(undefined); setState('idle'); } }, [disabled]);
  async function start() {
    if (!available || state !== 'idle' || disabled) return;
    const id = ++request.current;
    setState('requesting'); setError(''); setBlob(undefined); setElapsed(0); accumulated.current = 0;
    try {
      const input = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!mounted.current || id !== request.current) { input.getTracks().forEach(track => track.stop()); return; }
      stream.current = input;
      const mimeType = ['audio/webm;codecs=opus', 'audio/mp4', 'audio/webm'].find(type => MediaRecorder.isTypeSupported(type));
      const next = new MediaRecorder(input, mimeType ? { mimeType } : undefined);
      recorder.current = next; chunks.current = [];
      next.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      next.onerror = () => { if (mounted.current && id === request.current) { release(); setError(l.microphoneUnavailable); setState('idle'); } };
      next.onstop = () => {
        if (!mounted.current || id !== request.current) return;
        const result = new Blob(chunks.current, { type: next.mimeType || chunks.current[0]?.type || 'audio/webm' });
        release();
        if (result.size) { setBlob(result); setState('recorded'); }
        else { setError(l.audioUnavailable); setState('idle'); }
      };
      next.start(250); started.current = Date.now(); setState('recording');
    } catch (cause) {
      if (!mounted.current || id !== request.current) return;
      release(); setState('idle');
      setError(cause instanceof DOMException && cause.name === 'NotAllowedError' ? l.microphoneDenied : l.microphoneUnavailable);
    }
  }
  function cancel() { request.current++; release(); setBlob(undefined); setElapsed(0); setError(''); setState('idle'); }
  const active = state === 'recording' || state === 'paused';
  return <div className={cn('ai-surface ai-recorder', compact && 'ai-recorder-compact', className)}>
    {state === 'idle' && (compact ? <AIIconButton label={l.record} disabled={disabled || !available} onClick={() => void start()}><UiIcon slot="mic" size={16} /></AIIconButton> : <Button size="sm" variant="secondary" disabled={disabled || !available} onClick={() => void start()}><UiIcon slot="mic" size={14} />{l.record}</Button>)}
    {state === 'requesting' && <AIStatus>{l.loading}</AIStatus>}
    {active && <div className="ai-inline-actions"><span className="ai-recording-state" role="status"><UiIcon slot="mic" size={14} className="ai-rec-mic" /><span className="ai-wave" aria-hidden="true" data-paused={state === 'paused' || undefined}><i /><i /><i /><i /><i /></span>{state === 'paused' ? l.recordingPaused : l.recording} · {clock(elapsed)}</span>
      <AIIconButton label={state === 'paused' ? l.resume : l.pause} onClick={() => {
        if (state === 'recording') { accumulated.current += Date.now() - started.current; recorder.current?.pause(); setElapsed(accumulated.current / 1000); setState('paused'); }
        else { started.current = Date.now(); recorder.current?.resume(); setState('recording'); }
      }}>{state === 'paused' ? <UiIcon slot="play" size={14} /> : <UiIcon slot="pause" size={14} />}</AIIconButton>
      <AIIconButton label={l.finishRecording} onClick={() => {
        if (state === 'recording') accumulated.current += Date.now() - started.current;
        setElapsed(accumulated.current / 1000); setState('stopping'); recorder.current?.stop();
        stream.current?.getTracks().forEach(track => track.stop());
      }}><UiIcon slot="square" size={13} /></AIIconButton>
    </div>}
    {state === 'stopping' && <AIStatus>{l.loading}</AIStatus>}
    {blob && <AIAudioPlayer blob={blob} labels={labels} />}
    {(state === 'recorded' || state === 'sending') && blob && <Button size="sm" disabled={state === 'sending' || disabled} onClick={async () => {
      const id = request.current;
      setState('sending'); setError('');
      try { await onRecorded(blob); if (mounted.current && id === request.current) cancel(); } catch (cause) { if (mounted.current && id === request.current) { setState('recorded'); setError(cause instanceof Error ? cause.message : l.error); } }
    }}><UiIcon slot="check" size={14} />{l.useRecording}</Button>}
    {state !== 'idle' && state !== 'sending' && <AIIconButton label={l.cancel} onClick={cancel}><UiIcon slot="x" size={14} /></AIIconButton>}
    {available === false && <p className="ai-muted" role="status">{l.recordingUnsupported}</p>}
    {error && <p role="alert" className="ai-error">{error}</p>}
  </div>;
}
