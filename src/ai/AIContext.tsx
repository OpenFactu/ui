import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { useAILabels } from './labels';
import { formatMessage } from '../i18n/format';
import type { AISource, AIUIProps } from './types';
import { compactNumber, contextUsage, hostOf } from './internal/elements';
import { safeUrl } from './internal/helpers';
import { Modal } from '../components/Modal';
import { useMediaQuery } from '../hooks/useMediaQuery';

/** Mantiene la ficha dentro de la ventana: si al abrir no cabe, voltea el lado o la dirección (una sola vez, sin bucles). */
function useCardFit(open: boolean, placement: 'bottom' | 'top', align: 'start' | 'end') {
  const ref = React.useRef<HTMLElement>(null);
  const [fit, setFit] = React.useState({ placement, align });
  React.useLayoutEffect(() => {
    if (!open) { setFit(current => current.placement === placement && current.align === align ? current : { placement, align }); return; }
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect(); const anchor = el.parentElement?.getBoundingClientRect();
    setFit(current => {
      let next = current;
      if (rect.left < 8 && current.align === 'end') next = { ...next, align: 'start' };
      else if (rect.right > window.innerWidth - 8 && current.align === 'start') next = { ...next, align: 'end' };
      if (anchor && rect.bottom > window.innerHeight - 8 && current.placement === 'bottom' && anchor.top >= rect.height + 16) next = { ...next, placement: 'top' };
      return next;
    });
  }, [open, placement, align]);
  return { ref, ...fit };
}

// ── Punto de control ───────────────────────────────────────────────────

export interface AICheckpointProps extends AIUIProps {
  label?: string;
  /** Vuelve a este punto: la conversación conserva hasta aquí y descarta lo posterior. */
  onRestore?: () => void | Promise<void>;
  restored?: boolean;
}
/** Un separador entre turnos al que se puede volver. */
export function AICheckpoint({ label, onRestore, restored, labels, className }: AICheckpointProps) {
  const l = useAILabels(labels);
  const [busy, setBusy] = React.useState(false);
  return <div className={cn('ai-surface ai-checkpoint', className)} role="separator" aria-label={label ?? l.checkpoint} data-restored={restored || undefined}>
    <UiIcon slot="bookmark" size={13} aria-hidden="true" /><span className="ai-checkpoint-label">{label ?? l.checkpoint}</span><span className="ai-checkpoint-rule" aria-hidden="true" />
    {onRestore && <button type="button" className="ai-code-action" disabled={busy || restored} title={l.restoreHint} onClick={async () => { setBusy(true); try { await onRestore(); } finally { setBusy(false); } }}><UiIcon slot="rotate-ccw" size={13} /><span>{restored ? l.restored : l.restore}</span></button>}
  </div>;
}

// ── Uso de contexto ────────────────────────────────────────────────────

export interface AIContextBreakdownItem { id: string; label: string; tokens: number }
export interface AIContextUsageProps extends AIUIProps {
  usedTokens: number;
  maxTokens: number;
  /** El indicador puede integrarse sin marco en una barra de herramientas. El detalle conserva su superficie. */
  variant?: 'outlined' | 'plain';
  /** Nombre del modelo, en la cabecera del detalle. */
  modelLabel?: string;
  /** En qué se ha ido el contexto (sistema, mensajes, herramientas, archivos…). */
  breakdown?: AIContextBreakdownItem[];
  /** Filas sueltas del detalle: coste, entrada, salida, caché… */
  details?: { label: string; value: string }[];
  /** Si existe, con el contexto casi lleno aparece el botón «Compactar conversación». */
  onCompact?: () => void | Promise<void>;
  /** Hacia dónde se abre el detalle. Por defecto debajo y alineado a la derecha. */
  placement?: 'bottom' | 'top';
  align?: 'start' | 'end';
}
const RING = { size: 18, radius: 7 };
const CIRCUMFERENCE = 2 * Math.PI * RING.radius;
/** Cuánto de la ventana de contexto se ha gastado: un anillo con el porcentaje y, al pasar, enfocar o tocar, el detalle. */
export function AIContextUsage({ usedTokens, maxTokens, variant = 'outlined', modelLabel, breakdown, details, onCompact, placement = 'bottom', align = 'end', labels, className }: AIContextUsageProps) {
  const l = useAILabels(labels);
  const { ratio, percent, level } = contextUsage(usedTokens, maxTokens);
  const [open, setOpen] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const id = React.useId();
  const narrow = useMediaQuery('(max-width: 767px)');
  const root = React.useRef<HTMLSpanElement>(null);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = () => { clearTimeout(closeTimer.current); if (!narrow) setOpen(true); };
  const hide = () => { if (pinned || narrow) return; clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpen(false), 120); };
  React.useEffect(() => () => clearTimeout(closeTimer.current), []);
  React.useEffect(() => {
    if (!pinned) return;
    const away = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setPinned(false); setOpen(false); } };
    document.addEventListener('pointerdown', away);
    return () => document.removeEventListener('pointerdown', away);
  }, [pinned]);
  const fit = useCardFit(open, placement, align);
  const left = Math.max(0, maxTokens - usedTokens);
  const parts = (breakdown ?? []).filter(item => item.tokens > 0);
  const interactive = !!onCompact;
  const content = <>
      <div className="ai-context-head"><span className="ai-context-model">{modelLabel ?? l.contextUsed}</span><span className="ai-context-big" data-level={level}>{percent}<small> %</small></span></div>
      <div className="ai-context-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label={l.contextUsed}>
        {parts.length
          ? parts.map((item, index) => <span key={item.id} style={{ width: `${Math.min(100, (item.tokens / Math.max(1, maxTokens)) * 100)}%` }} data-tone={index % 5} />)
          : <span style={{ width: `${percent}%` }} data-tone="0" />}
      </div>
      <div className="ai-context-numbers"><span>{formatMessage(l.contextUsage, { used: compactNumber(usedTokens), max: compactNumber(maxTokens) })}</span><span>{formatMessage(l.contextRemaining, { left: compactNumber(left) })}</span></div>
      {!!parts.length && <ul className="ai-context-legend">{parts.map((item, index) => <li key={item.id}><i data-tone={index % 5} aria-hidden="true" /><span>{item.label}</span><span>{compactNumber(item.tokens)}</span></li>)}</ul>}
      {!!details?.length && <dl className="ai-context-details">{details.map(row => <div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
      {level !== 'ok' && <p className="ai-context-note" data-level={level} role="status">{level === 'danger' ? l.contextFull : l.contextFilling}</p>}
      {level !== 'ok' && onCompact && <button type="button" className="ai-code-primary" disabled={busy} onClick={async () => { setBusy(true); try { await onCompact(); } finally { setBusy(false); } }}>{l.compactChat}</button>}
  </>;
  return <span ref={root} className={cn('ai-surface ai-context', className)} data-variant={variant} data-level={level} onMouseEnter={show} onMouseLeave={hide} onFocus={show}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hide(); }}
    onKeyDown={event => { if (event.key === 'Escape') { setPinned(false); setOpen(false); } }}>
    <button type="button" className="ai-context-trigger" aria-haspopup={narrow || interactive ? 'dialog' : undefined} aria-expanded={open} aria-controls={!narrow && open ? id : undefined} aria-label={`${l.contextUsed}: ${percent} %`}
      onClick={() => { if (narrow) { setPinned(false); setOpen(true); } else { setPinned(value => !(value && open)); setOpen(value => !(pinned && value)); } }}>
      <svg className="ai-ring" width={RING.size} height={RING.size} viewBox={`0 0 ${RING.size} ${RING.size}`} aria-hidden="true">
        <circle className="ai-ring-track" cx={RING.size / 2} cy={RING.size / 2} r={RING.radius} />
        <circle className="ai-ring-value" cx={RING.size / 2} cy={RING.size / 2} r={RING.radius} strokeDasharray={CIRCUMFERENCE} strokeDashoffset={CIRCUMFERENCE * (1 - ratio)} transform={`rotate(-90 ${RING.size / 2} ${RING.size / 2})`} />
      </svg>
      <span className="ai-context-percent">{percent}<small> %</small></span>
    </button>
    {open && !narrow && <div ref={fit.ref as React.RefObject<HTMLDivElement>} id={id} role={interactive ? 'dialog' : 'tooltip'} aria-label={l.contextUsed} className="ai-context-card" data-placement={fit.placement} data-align={fit.align}>{content}</div>}
    <Modal isOpen={narrow && open} onClose={() => { setPinned(false); setOpen(false); }} title={l.contextUsed} size="sm" hideCancel closeOnOverlayClick
      className="ai-context-sheet" overlayClassName="ai-context-sheet-overlay"><div className="ai-surface ai-context-card ai-context-sheet-content" data-level={level}>{content}</div></Modal>
  </span>;
}

// ── Cita en línea ──────────────────────────────────────────────────────

export interface AIInlineCitationProps extends AIUIProps {
  /** Una fuente… */
  source?: AISource;
  /** …o varias para la misma afirmación: el chip muestra «dominio +N» y la ficha se pagina. */
  sources?: AISource[];
}
/** Fuente(s) dentro de la frase que respaldan: un chip con el dominio y, al pasar o enfocar, la ficha. */
export function AIInlineCitation({ source, sources, labels, className }: AIInlineCitationProps) {
  const l = useAILabels(labels);
  const list = sources?.length ? sources : source ? [source] : [];
  const [index, setIndex] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const id = React.useId();
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const show = () => { clearTimeout(closeTimer.current); setOpen(true); };
  const hide = () => { clearTimeout(closeTimer.current); closeTimer.current = setTimeout(() => setOpen(false), 120); };
  React.useEffect(() => () => clearTimeout(closeTimer.current), []);
  const fit = useCardFit(open, 'bottom', 'start');
  if (!list.length) return null;
  const current = list[Math.min(index, list.length - 1)];
  const href = safeUrl(current.url);
  const step = (delta: number) => setIndex(value => (value + delta + list.length) % list.length);
  return <span className={cn('ai-surface ai-citation', className)} onMouseEnter={show} onMouseLeave={hide} onFocus={show}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) hide(); }} onKeyDown={event => { if (event.key === 'Escape') setOpen(false); }}>
    <a className="ai-chip" href={safeUrl(list[0].url)} target="_blank" rel="noreferrer noopener" aria-describedby={open ? id : undefined}>{hostOf(list[0].url)}{list.length > 1 && <span className="ai-chip-more">+{list.length - 1}</span>}</a>
    {open && <span ref={fit.ref as React.RefObject<HTMLSpanElement>} id={id} role="group" aria-label={l.source2} className="ai-context-card ai-citation-card" data-placement={fit.placement} data-align={fit.align}>
      {list.length > 1 && <span className="ai-citation-pager">
        <button type="button" className="ai-icon-button" aria-label={l.previous} onClick={() => step(-1)}><UiIcon slot="chevron-left" size={14} /></button>
        <span aria-live="polite">{index + 1} / {list.length}</span>
        <button type="button" className="ai-icon-button" aria-label={l.next} onClick={() => step(1)}><UiIcon slot="chevron-right" size={14} /></button>
      </span>}
      <span className="ai-citation-head"><span className="ai-citation-mark" aria-hidden="true">{hostOf(current.url).charAt(0).toUpperCase()}</span><strong>{current.title}</strong></span>
      {current.description && <span className="ai-muted">{current.description}</span>}
      {href && <a href={href} target="_blank" rel="noreferrer noopener">{hostOf(current.url)}<span className="ai-sr-only"> {l.opensNewTab}</span></a>}
    </span>}
  </span>;
}
