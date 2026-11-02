import { useObjectUrl } from '../hooks/useObjectUrl';
import { formatClock } from '../internal/format';
import * as React from 'react';
import { UiIcon } from '../icons';
import { chatAttachmentUrl } from './useChatAttachments';
import { useMessages } from '../i18n/I18nProvider';
import { motionDisabled, readMotionSpeed } from '../motion/dom';
import { WAVE_BARS, WAVE_RIPPLE_SECONDS, placeholderPeaks, waveBarHeight, waveRestHeight } from './audioWave';
export interface ChatAudioPlayerProps { src?: string; blob?: Blob; duration?: number; title?: string }

/**
 * Da vida a la onda mientras suena, escribiendo en las barras sin pasar por React: colorea hasta el cabezal y mueve las
 * alturas (`audioWave.ts`). Al pausar, la energía cae poco a poco y la onda se posa; con movimiento reducido o velocidad 0
 * no hay bucle y solo cambia el color, al ritmo de `timeupdate`.
 */
function useWaveMotion(wave: React.RefObject<HTMLDivElement | null>, audio: React.RefObject<HTMLAudioElement | null>, peaks: number[], duration: number, position: number, playing: boolean) {
  const latest = React.useRef({ peaks, duration });
  latest.current = { peaks, duration };
  const progressNow = () => { const { duration: total } = latest.current; return total > 0 ? Math.min(1, (audio.current?.currentTime ?? 0) / total) : 0; };
  const paintPlayed = (progress: number) => {
    const bars = wave.current?.children; if (!bars) return;
    for (let i = 0; i < bars.length; i += 1) {
      const played = String(latest.current.duration > 0 && (i + 0.5) / bars.length <= progress);
      if (bars[i].getAttribute('data-played') !== played) bars[i].setAttribute('data-played', played);
    }
  };
  // Parado (o sin movimiento): el color sigue a la posición, por ejemplo al mover el control sin reproducir.
  React.useEffect(() => { paintPlayed(duration > 0 ? Math.min(1, position / duration) : 0); }, [position, duration, peaks]);

  const run = React.useRef({ raf: 0, energy: 0, time: 0, last: 0, startedAt: 0, playing: false });
  React.useEffect(() => {
    const el = wave.current; const r = run.current;
    r.playing = playing;
    if (!el || r.raf || !playing || motionDisabled(el)) return;
    const speed = Math.max(readMotionSpeed(el), 1e-3);
    r.last = performance.now(); r.startedAt = r.last;
    el.setAttribute('data-live', '');
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - r.last) / 1000) / speed; r.last = now;
      r.time += dt * (audio.current?.playbackRate ?? 1);
      r.energy += ((r.playing ? 1 : 0) - r.energy) * (1 - Math.exp(-dt / 0.14));
      const age = (now - r.startedAt) / 1000 / speed;
      const rippleAge = age < WAVE_RIPPLE_SECONDS ? age : null;
      const bars = el.children; const progress = progressNow();
      paintPlayed(progress);
      if (!r.playing && r.energy < 0.01 && rippleAge === null) {
        r.raf = 0; r.energy = 0;
        el.removeAttribute('data-live');
        for (let i = 0; i < bars.length; i += 1) (bars[i] as HTMLElement).style.height = `${waveRestHeight(latest.current.peaks[i] ?? 0)}px`;
        return;
      }
      for (let i = 0; i < bars.length; i += 1) {
        const height = waveBarHeight(i, latest.current.peaks[i] ?? 0, bars.length, { progress, time: r.time, energy: r.energy, rippleAge });
        (bars[i] as HTMLElement).style.height = `${height.toFixed(1)}px`;
      }
      r.raf = requestAnimationFrame(frame);
    };
    r.raf = requestAnimationFrame(frame);
  }, [playing]);
  React.useEffect(() => () => { cancelAnimationFrame(run.current.raf); run.current.raf = 0; }, []);
}

export function ChatAudioPlayer({ src, blob, duration: knownDuration = 0, title: titleProp }: ChatAudioPlayerProps) {
  const ct = useMessages('chat');
  const title = titleProp ?? ct.voiceNote;
  const audio = React.useRef<HTMLAudioElement>(null);
  const objectUrl = useObjectUrl(blob);
  const [playing, setPlaying] = React.useState(false); const [duration, setDuration] = React.useState(knownDuration);
  const [position, setPosition] = React.useState(0); const [speed, setSpeed] = React.useState(1); const [error, setError] = React.useState('');
  // Hasta tener la onda real se dibuja una forma de voz estable. Un audio remoto se decodifica al reproducirlo por primera
  // vez (antes solo se piden sus metadatos); si el servidor no lo permite, se queda esa forma.
  const [decoded, setDecoded] = React.useState<number[] | null>(null);
  const [started, setStarted] = React.useState(false);
  const [rewinding, setRewinding] = React.useState(false);
  const wave = React.useRef<HTMLDivElement>(null);
  const placeholder = React.useMemo(() => placeholderPeaks(`${title}|${knownDuration}`), [title, knownDuration]);
  const peaks = decoded ?? placeholder;
  const canDecode = Boolean(blob || src?.startsWith('blob:') || (started && src));
  React.useEffect(() => {
    if (!canDecode || typeof AudioContext === 'undefined') return;
    let cancelled = false; const context = new AudioContext();
    const sourceBuffer = blob ? blob.arrayBuffer() : fetch(src!).then(response => response.arrayBuffer());
    void sourceBuffer.then(buffer => context.decodeAudioData(buffer)).then(buffer => {
      if (cancelled) return;
      const data = buffer.getChannelData(0); const size = Math.max(1, Math.floor(data.length / WAVE_BARS));
      const values = Array.from({ length: WAVE_BARS }, (_, index) => { let max = 0; for (let i = index * size; i < Math.min((index + 1) * size, data.length); i += 4) max = Math.max(max, Math.abs(data[i])); return max; });
      const max = Math.max(...values);
      // Silencio: no hay forma que enseñar, mejor la de reposo que una raya.
      if (max >= .01) setDecoded(values.map(value => Math.max(.18, value / max)));
      // Las notas grabadas con timeslice (WebM sin duración) dan Infinity en el <audio>: la decodificada sí es real.
      if (Number.isFinite(buffer.duration)) setDuration(current => current > 0 ? current : buffer.duration);
    }).catch(() => {}).finally(() => { void context.close().catch(() => {}); });
    return () => { cancelled = true; if (context.state !== 'closed') void context.close().catch(() => {}); };
  }, [blob, src, canDecode]);
  const source = chatAttachmentUrl(src) ?? objectUrl;
  React.useEffect(() => { setPlaying(false); setPosition(0); setDuration(knownDuration); setError(''); setDecoded(null); setStarted(false); setRewinding(false); }, [source, knownDuration]);
  useWaveMotion(wave, audio, peaks, duration, position, playing);
  return <div className="k-chat-audio-player" aria-label={title} data-playing={playing || undefined}>
    <audio ref={audio} src={source} preload="metadata" onLoadedMetadata={() => { if (Number.isFinite(audio.current?.duration)) setDuration(audio.current!.duration); }}
      // Sin duración en los metadatos (WebM grabado a trozos), el navegador la aprende al reproducir: llega aquí.
      onDurationChange={() => { if (Number.isFinite(audio.current?.duration)) setDuration(audio.current!.duration); }}
      onTimeUpdate={() => setPosition(audio.current?.currentTime ?? 0)} onPlay={() => { setPlaying(true); setStarted(true); setRewinding(false); }} onPause={() => setPlaying(false)}
      // Al acabar vuelve al principio: el color se recoge de derecha a izquierda (`data-rewind`) y la hora vuelve a ser la duración.
      onEnded={() => { setPlaying(false); setRewinding(true); setPosition(0); if (audio.current) audio.current.currentTime = 0; }} onError={() => setError(ct.playError)} />
    <button type="button" className="k-chat-audio-play" aria-label={playing ? ct.pause : ct.play} disabled={!source} onClick={async () => {
      if (!audio.current) return;
      if (playing) audio.current.pause(); else try { await audio.current.play(); setError(''); } catch { setError(ct.playError); }
    }}><span className="k-chat-audio-icon" key={playing ? 'pause' : 'play'}><UiIcon slot={playing ? 'pause' : 'play'} size={19} /></span></button>
    <div className="k-chat-audio-track"><div ref={wave} className="k-chat-audio-wave" aria-hidden="true" data-rewind={rewinding || undefined}>{peaks.map((height, index) => <i key={index} style={{ height: `${waveRestHeight(height)}px`, '--i': index } as React.CSSProperties} />)}</div>
      <input type="range" aria-label={ct.position} min={0} max={duration || 0} step={.1} value={Math.min(position, duration)} disabled={!duration} onChange={event => { setRewinding(false); if (audio.current) { audio.current.currentTime = Number(event.target.value); setPosition(Number(event.target.value)); } }} />
      <span className="k-chat-audio-time">{formatClock(playing || position ? position : duration)}</span>
    </div>
    <button type="button" className="k-chat-audio-speed" aria-label={ct.speed} onClick={() => { const next = speed === 1 ? 1.5 : speed === 1.5 ? 2 : 1; setSpeed(next); if (audio.current) audio.current.playbackRate = next; }}>{speed}×</button>
    {error && <p className="k-chat-message-error" role="status">{error}</p>}
  </div>;
}
