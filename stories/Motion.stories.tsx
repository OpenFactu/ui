import * as React from 'react';
import type { Story } from '@ladle/react';
import { Archive, Copy, Pencil, Trash2 } from 'lucide-react';
import { MOTION_CHARACTERS, MOTION_ROLES, SPRING_PRESETS, spring, springAt, springSettleTime, type MotionCharacter, type MotionRole, type SpringConfig } from '../src/motion';
import { resolveTheme, themeToAttrs, themeToStyle } from '../src/theme';
import { Button } from '../src/components/Button';
import { Modal } from '../src/components/Modal';
import { Drawer } from '../src/components/Drawer';
import { DropdownMenu } from '../src/components/DropdownMenu';
import { Tabs } from '../src/components/Tabs';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { useToast } from '../src/context/ToastContext';

const CHARACTERS = Object.keys(MOTION_CHARACTERS) as MotionCharacter[];

/** Curva de un muelle: posición en el tiempo hasta que se asienta (la línea punteada es el destino). */
const Curve: React.FC<{ config: Required<SpringConfig>; label: string }> = ({ config, label }) => {
  const settle = Math.max(springSettleTime(config, -1, 0, 0.002), 0.1);
  const W = 180; const H = 64; const top = 8;
  const mapY = (v: number) => H - top - v * (H - top * 2);
  const points = Array.from({ length: 61 }, (_, i) => {
    const t = (i / 60) * settle;
    return `${((i / 60) * W).toFixed(1)},${mapY(1 + springAt(t, config, -1, 0).value).toFixed(1)}`;
  }).join(' ');
  return (
    <figure className="m-0 flex min-w-0 flex-col gap-1">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Curva ${label}`} className="h-auto w-full max-w-[180px] rounded-[var(--k-radius-sm,4px)] bg-[var(--bg-muted,#fafbfc)] border border-[var(--border-default,#e2e8f0)]">
        <line x1="0" x2={W} y1={mapY(1)} y2={mapY(1)} stroke="var(--border-strong,#cbd5e1)" strokeDasharray="3 3" />
        <polyline points={points} fill="none" stroke="var(--color-accent,#0d9488)" strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <figcaption className="text-[11px] font-mono text-[var(--fg-muted,#52606f)]">{label} · {Math.round(settle * 1000)} ms</figcaption>
    </figure>
  );
};

/** Un panel con su propio tema de movimiento: los componentes de dentro heredan el carácter. */
const Themed: React.FC<{ character: MotionCharacter; children: React.ReactNode }> = ({ character, children }) => {
  const theme = React.useMemo(() => resolveTheme({ motion: { character } }), [character]);
  return (
    <section style={themeToStyle(theme)} {...themeToAttrs(theme)} className="flex flex-col gap-4 rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-4">
      <strong className="text-[13px] font-mono uppercase tracking-wider text-[var(--fg-default,#0a1628)]">{character}</strong>
      {children}
    </section>
  );
};

export const Caracteres: Story = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {CHARACTERS.map((character) => {
      const theme = resolveTheme({ motion: { character } });
      return (
        <Themed key={character} character={character}>
          <div className="grid grid-cols-2 gap-3">
            {MOTION_ROLES.map((role: MotionRole) => <Curve key={role} config={theme.motion.springs[role]} label={role} />)}
          </div>
          <p className="m-0 text-[12px] text-[var(--fg-muted,#52606f)]">Escalonado {theme.motion.stagger} ms · escala de entrada {theme.motion.enterScale} · desenfoque {theme.motion.enterBlur} px</p>
        </Themed>
      );
    })}
  </div>
);

/** Editor de un muelle suelto: rigidez, amortiguación y masa, o el formato «rebote + duración». */
export const Muelle: Story = () => {
  const [bounce, setBounce] = React.useState(0.4);
  const [duration, setDuration] = React.useState(0.5);
  const config = React.useMemo(() => spring({ bounce, duration }), [bounce, duration]);
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <label className="flex items-center gap-3 text-[13px]">Rebote <input type="range" min={0} max={0.8} step={0.02} value={bounce} onChange={(e) => setBounce(Number(e.target.value))} /> {bounce.toFixed(2)}</label>
      <label className="flex items-center gap-3 text-[13px]">Duración <input type="range" min={0.15} max={1.2} step={0.05} value={duration} onChange={(e) => setDuration(Number(e.target.value))} /> {duration.toFixed(2)} s</label>
      <Curve config={config} label={`k ${config.stiffness.toFixed(0)} · c ${config.damping.toFixed(1)} · m ${config.mass}`} />
      <div className="flex flex-wrap gap-3">
        {Object.entries(SPRING_PRESETS).map(([name, preset]) => <Curve key={name} config={spring(preset)} label={name} />)}
      </div>
    </div>
  );
};

const Toggle: React.FC<{ label: string }> = ({ label }) => {
  const [open, setOpen] = React.useState(true);
  const [mounted, setMounted] = React.useState(true);
  const [state, setState] = React.useState<'open' | 'closed'>('open');
  React.useEffect(() => {
    if (open) { setMounted(true); const raf = requestAnimationFrame(() => requestAnimationFrame(() => setState('open'))); return () => cancelAnimationFrame(raf); }
    setState('closed'); const timer = setTimeout(() => setMounted(false), 700); return () => clearTimeout(timer);
  }, [open]);
  return (
    <div className="flex h-36 flex-col items-start gap-3">
      <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>{open ? 'Cerrar' : 'Abrir'} {label}</Button>
      {mounted && <div data-state={state} className="k-appear w-56 rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-4 text-[13px] shadow-lg">Aparece creciendo con el muelle del tema.</div>}
    </div>
  );
};

export const AbrirYCerrar: Story = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {CHARACTERS.map((character) => <Themed key={character} character={character}><Toggle label={character} /></Themed>)}
  </div>
);

const Overlays: React.FC = () => {
  const [modal, setModal] = React.useState(false);
  const [drawer, setDrawer] = React.useState(false);
  const toast = useToast();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm" onClick={() => setModal(true)}>Diálogo</Button>
      <Button size="sm" variant="secondary" onClick={() => setDrawer(true)}>Panel lateral</Button>
      <DropdownMenu items={[{ label: 'Editar', icon: <Pencil size={14} /> }, { label: 'Duplicar', icon: <Copy size={14} /> }, { label: 'Archivar', icon: <Archive size={14} /> }, { label: 'Eliminar', icon: <Trash2 size={14} />, destructive: true, separatorBefore: true }]}><Button size="sm" variant="secondary">Menú</Button></DropdownMenu>
      <Button size="sm" variant="secondary" onClick={() => toast.success('Guardado', { description: 'En móvil se descarta arrastrándolo con un lanzamiento.' })}>Aviso</Button>
      <Modal isOpen={modal} onClose={() => setModal(false)} title="Hoja arrastrable" primaryAction={{ label: 'Entendido', onClick: () => setModal(false) }}>
        En pantallas estrechas se agarra por el asa o la cabecera y se lanza hacia abajo.
      </Modal>
      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Panel lateral">Con tacto, se arrastra hacia su borde.</Drawer>
    </div>
  );
};

export const Superficies: Story = () => (
  <div className="grid gap-4 md:grid-cols-2">
    {CHARACTERS.map((character) => <Themed key={character} character={character}><Overlays /></Themed>)}
  </div>
);

export const Indicadores: Story = () => {
  const [tab, setTab] = React.useState('a');
  const [segment, setSegment] = React.useState('dia');
  const [pill, setPill] = React.useState('a');
  const items = [{ key: 'a', label: 'Resumen' }, { key: 'b', label: 'Facturas' }, { key: 'c', label: 'Clientes' }];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {CHARACTERS.map((character) => (
        <Themed key={character} character={character}>
          <Tabs items={items} value={tab} onChange={setTab} />
          <Tabs items={items} value={pill} onChange={setPill} variant="pill" />
          <SegmentedControl options={[{ value: 'dia', label: 'Día' }, { value: 'semana', label: 'Semana' }, { value: 'mes', label: 'Mes' }]} value={segment} onChange={setSegment} variant="raised" />
        </Themed>
      ))}
    </div>
  );
};
