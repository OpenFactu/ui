import * as React from 'react';
import type { Story } from '@ladle/react';
import { useGestures, useSwipeAction, type Gesture } from '../src/gestures';
import { useSpring } from '../src/motion';
import { Badge } from '../src/components/Badge';
import { Button } from '../src/components/Button';
import { demoImage } from './shared/demoImages';

const card = 'rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]';
const hint = 'text-xs text-[var(--fg-muted,#52606f)]';

/** Lo que va saliendo del reconocedor, lo último arriba. */
function useLog() {
  const [lines, setLines] = React.useState<string[]>([]);
  const push = React.useCallback((text: string) => setLines(prev => [text, ...prev].slice(0, 8)), []);
  const clear = React.useCallback(() => setLines([]), []);
  return { lines, push, clear };
}

const describe = (g: Gesture): string => {
  switch (g.type) {
    case 'tap': return g.count === 2 ? 'Doble toque' : 'Toque';
    case 'longPress': return `Mantener pulsado en ${Math.round(g.point.x)}, ${Math.round(g.point.y)}`;
    case 'swipe': return `Deslizar ${g.direction} · ${Math.round(Math.hypot(g.dx, g.dy))} px · ${g.velocity.toFixed(2)} px/ms`;
    case 'pan': return `Arrastrar ${g.phase} · ${Math.round(g.dx)}, ${Math.round(g.dy)}`;
    case 'pinch': return `Pellizco ${g.phase} · ×${g.scale.toFixed(2)} · ${Math.round(g.rotation)}°`;
  }
};

/** Un área que reconoce todo lo que `useGestures` sabe y lo va contando. Con ratón también (`pointerTypes`). */
export const Reconocedor: Story = () => {
  const log = useLog();
  const g = useGestures({
    pointerTypes: ['touch', 'pen', 'mouse'],
    onTap: g => log.push(describe(g)), onDoubleTap: g => log.push(describe(g)), onLongPress: g => log.push(describe(g)),
    onSwipe: g => log.push(describe(g)), onPinch: g => { if (g.phase !== 'move') log.push(describe(g)); },
    onPan: g => { if (g.phase !== 'move') log.push(describe(g)); },
  });
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <div {...g.bind} style={g.style} className={`${card} grid h-56 select-none place-items-center text-sm text-[var(--fg-muted,#52606f)] data-[gesture=pan]:bg-[var(--bg-muted,#fafbfc)] data-[gesture=pressing]:bg-[var(--bg-muted,#fafbfc)] data-[gesture=held]:border-[var(--color-accent,#0d9488)] data-[gesture=pinch]:border-[var(--color-accent,#0d9488)]`}>
        Toca, toca dos veces, mantén, desliza, arrastra o pellizca aquí
      </div>
      <div className="flex items-center justify-between">
        <p className={hint}>Un solo hook con un manejador por gesto; lo que no tiene manejador se deja al navegador.</p>
        <Button size="sm" variant="ghost" onClick={log.clear}>Limpiar</Button>
      </div>
      <ol className="m-0 flex list-none flex-col gap-1 p-0 font-mono text-xs">
        {log.lines.map((line, i) => <li key={`${i}-${line}`} className={i === 0 ? 'text-[var(--fg-default,#0a1628)]' : 'text-[var(--fg-subtle,#8a94a6)]'}>{line}</li>)}
      </ol>
    </div>
  );
};

/** Una fila que se desliza a la izquierda para archivar y mantiene pulsado para ver opciones, con `useSwipeAction`. */
const Row: React.FC<{ label: string; onArchive: () => void; onMenu: () => void }> = ({ label, onArchive, onMenu }) => {
  const swipe = useSwipeAction({ direction: 'left', distance: 72, pointerTypes: ['touch', 'pen', 'mouse'], onTrigger: onArchive, onLongPress: onMenu });
  return (
    <li className="relative overflow-hidden" data-k-surface>
      {/* Lo que asoma por detrás: su opacidad y tamaño salen de --k-swipe. */}
      <span aria-hidden="true" className="absolute inset-y-0 right-3 grid place-items-center text-xs font-medium text-[var(--k-danger-fg,#b91c1c)]" style={{ opacity: 'var(--k-swipe, 0)', scale: 'calc(.7 + .3 * var(--k-swipe, 0))' }}>Archivar</span>
      <div ref={swipe.ref as React.RefObject<HTMLDivElement>} {...swipe.bind} style={swipe.style} className="relative flex items-center justify-between bg-[var(--bg-card,#ffffff)] px-4 py-3 text-sm data-[gesture=pressing]:bg-[var(--bg-muted,#fafbfc)]">
        <span>{label}</span>
        <Badge variant="neutral">Factura</Badge>
      </div>
    </li>
  );
};

export const DeslizarParaActuar: Story = () => {
  const [rows, setRows] = React.useState(['F-2026-0141 · Talleres Ruiz', 'F-2026-0142 · Clínica Sol', 'F-2026-0143 · Panadería Ortiz', 'F-2026-0144 · Estudio Vera']);
  const [note, setNote] = React.useState('');
  return (
    <div className="flex max-w-md flex-col gap-3">
      <ul className={`${card} m-0 list-none divide-y divide-[var(--border-default,#e2e8f0)] overflow-hidden p-0`}>
        {rows.map(row => <Row key={row} label={row} onArchive={() => { setRows(r => r.filter(x => x !== row)); setNote(`Archivada ${row}`); }} onMenu={() => setNote(`Opciones de ${row}`)} />)}
        {rows.length === 0 && <li className="px-4 py-6 text-center text-sm text-[var(--fg-muted,#52606f)]">Todo archivado</li>}
      </ul>
      <p className={hint}>{note || 'Desliza una fila a la izquierda (72 px arma la acción y vibra) o mantenla pulsada. Al soltar vuelve con el muelle «gesture» del tema.'}</p>
    </div>
  );
};

/** Pellizcar para ampliar y arrastrar para mover, con doble toque para alternar; todo escrito en el elemento, sin estado. */
export const Ampliar: Story = () => {
  const img = React.useRef<HTMLImageElement>(null);
  const view = React.useRef({ scale: 1, x: 0, y: 0, start: { scale: 1, x: 0, y: 0 } });
  const paint = () => { const v = view.current; const el = img.current; if (el) el.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.scale})`; };
  const zoom = useSpring({ ref: img as React.RefObject<HTMLElement | null>, role: 'pop', apply: value => { view.current.scale = value; paint(); } });
  const g = useGestures({
    pointerTypes: ['touch', 'pen', 'mouse'],
    onPinch: p => {
      const v = view.current;
      if (p.phase === 'start') { v.start = { scale: v.scale, x: v.x, y: v.y }; zoom.stop(); return; }
      if (p.phase === 'move') { v.scale = Math.max(1, Math.min(4, v.start.scale * p.scale)); v.x = v.start.x + p.dx; v.y = v.start.y + p.dy; paint(); return; }
      if (v.scale < 1.05) { v.x = 0; v.y = 0; zoom.to(1); }
    },
    onPan: p => {
      const v = view.current;
      if (v.scale <= 1) return;
      if (p.phase === 'start') { v.start = { ...v, start: v.start } as typeof v.start; return; }
      v.x = v.start.x + p.dx; v.y = v.start.y + p.dy; paint();
    },
    onDoubleTap: () => { const v = view.current; if (v.scale > 1) { v.x = 0; v.y = 0; zoom.to(1); } else zoom.to(2.5); },
  });
  return (
    <div className="flex max-w-xl flex-col gap-3">
      <div {...g.bind} style={g.style} className={`${card} aspect-[3/2] overflow-hidden`}>
        <img ref={img} src={demoImage(2, 'Plano')} alt="Plano de ejemplo" className="h-full w-full select-none object-cover" draggable={false} />
      </div>
      <p className={hint}>Pellizca para ampliar o girar, arrastra para moverte y toca dos veces para alternar. Con ratón: doble clic.</p>
    </div>
  );
};
