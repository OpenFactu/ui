import * as React from 'react';
import { useAudioRecording } from '../hooks/useAudioRecording';
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
export function AIVoiceRecorder({ onRecorded, disabled, compact, labels, className }: AIVoiceRecorderProps) {
  const l = aiLabels(labels);
  const recording = useAudioRecording(disabled, l);
  const { available, state, blob, elapsed, error, start, cancel } = recording;
  const active = state === 'recording' || state === 'paused';
  return <div className={cn('ai-surface ai-recorder', compact && 'ai-recorder-compact', className)}>
    {state === 'idle' && (compact ? <AIIconButton label={l.record} disabled={disabled || !available} onClick={() => void start()}><UiIcon slot="mic" size={16} /></AIIconButton> : <Button size="sm" variant="secondary" disabled={disabled || !available} onClick={() => void start()}><UiIcon slot="mic" size={14} />{l.record}</Button>)}
    {state === 'requesting' && <AIStatus>{l.loading}</AIStatus>}
    {active && <div className="ai-inline-actions"><span className="ai-recording-state" role="status"><UiIcon slot="mic" size={14} className="ai-rec-mic" /><span className="ai-wave" aria-hidden="true" data-paused={state === 'paused' || undefined}><i /><i /><i /><i /><i /></span>{state === 'paused' ? l.recordingPaused : l.recording} · {clock(elapsed)}</span>
      <AIIconButton label={state === 'paused' ? l.resume : l.pause} onClick={recording.togglePause}>{state === 'paused' ? <UiIcon slot="play" size={14} /> : <UiIcon slot="pause" size={14} />}</AIIconButton>
      <AIIconButton label={l.finishRecording} onClick={recording.finish}><UiIcon slot="square" size={13} /></AIIconButton>
    </div>}
    {state === 'stopping' && <AIStatus>{l.loading}</AIStatus>}
    {blob && <AIAudioPlayer blob={blob} labels={labels} />}
    {(state === 'recorded' || state === 'sending') && blob && <Button size="sm" disabled={state === 'sending' || disabled} onClick={() => void recording.useRecording(onRecorded)}><UiIcon slot="check" size={14} />{l.useRecording}</Button>}
    {state !== 'idle' && state !== 'sending' && <AIIconButton label={l.cancel} onClick={cancel}><UiIcon slot="x" size={14} /></AIIconButton>}
    {available === false && <p className="ai-muted" role="status">{l.recordingUnsupported}</p>}
    {error && <p role="alert" className="ai-error">{error}</p>}
  </div>;
}
