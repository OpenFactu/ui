import { useObjectUrl } from '../hooks/useObjectUrl';
import { formatClock } from '../internal/format';
import * as React from 'react';
import { UiIcon } from '../icons';
import { chatAttachmentUrl } from './useChatAttachments';
export interface ChatAudioPlayerProps { src?: string; blob?: Blob; duration?: number; title?: string }
export function ChatAudioPlayer({ src, blob, duration: knownDuration = 0, title = 'Nota de voz' }: ChatAudioPlayerProps) {
  const audio = React.useRef<HTMLAudioElement>(null);
  const objectUrl = useObjectUrl(blob);
  const [playing, setPlaying] = React.useState(false); const [duration, setDuration] = React.useState(knownDuration);
  const [position, setPosition] = React.useState(0); const [speed, setSpeed] = React.useState(1); const [error, setError] = React.useState('');
  const [peaks, setPeaks] = React.useState<number[]>(Array(36).fill(.25));
  React.useEffect(() => {
    if ((!blob && !src?.startsWith('blob:')) || typeof AudioContext === 'undefined') return;
    let cancelled = false; const context = new AudioContext();
    const sourceBuffer = blob ? blob.arrayBuffer() : fetch(src!).then(response => response.arrayBuffer());
    void sourceBuffer.then(buffer => context.decodeAudioData(buffer)).then(buffer => {
      if (cancelled) return;
      const data = buffer.getChannelData(0); const size = Math.max(1, Math.floor(data.length / 36));
      const values = Array.from({ length: 36 }, (_, index) => { let max = 0; for (let i = index * size; i < Math.min((index + 1) * size, data.length); i += 4) max = Math.max(max, Math.abs(data[i])); return max; });
      const max = Math.max(.01, ...values); setPeaks(values.map(value => Math.max(.18, value / max)));
    }).catch(() => {}).finally(() => { void context.close().catch(() => {}); });
    return () => { cancelled = true; if (context.state !== 'closed') void context.close().catch(() => {}); };
  }, [blob, src]);
  const source = chatAttachmentUrl(src) ?? objectUrl;
  React.useEffect(() => { setPlaying(false); setPosition(0); setDuration(knownDuration); setError(''); }, [source, knownDuration]);
  return <div className="k-chat-audio-player" aria-label={title}>
    <audio ref={audio} src={source} preload="metadata" onLoadedMetadata={() => { if (Number.isFinite(audio.current?.duration)) setDuration(audio.current!.duration); }}
      onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onEnded={() => setPlaying(false)} onError={() => setError('No se ha podido reproducir la nota de voz.')} />
    <button type="button" className="k-chat-audio-play" aria-label={playing ? 'Pausar nota de voz' : 'Reproducir nota de voz'} disabled={!source} onClick={async () => {
      if (!audio.current) return;
      if (playing) audio.current.pause(); else try { await audio.current.play(); setError(''); } catch { setError('No se ha podido reproducir la nota de voz.'); }
    }}><UiIcon slot={playing ? 'pause' : 'play'} size={19} /></button>
    <div className="k-chat-audio-track"><div className="k-chat-audio-wave" aria-hidden="true">{peaks.map((height, index) => <i key={index} style={{ height: `${Math.max(5, height * 25)}px` }} data-played={duration > 0 && index / peaks.length <= position / duration} />)}</div>
      <input type="range" aria-label="Posición de la nota de voz" min={0} max={duration || 0} step={.1} value={Math.min(position, duration)} disabled={!duration} onChange={event => { if (audio.current) { audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); } }} />
      <span className="k-chat-audio-time">{formatClock(playing || position ? position : duration)}</span>
    </div>
    <button type="button" className="k-chat-audio-speed" aria-label="Velocidad de la nota de voz" onClick={() => { const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; setSpeed(next); if (audio.current) audio.current.playbackRate = next; }}>{speed}×</button>
    {error && <p className="k-chat-message-error" role="status">{error}</p>}
  </div>;
}
