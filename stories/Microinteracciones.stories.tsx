import * as React from 'react';
import type { Story } from '@ladle/react';
import { Ripple, StatusMark, fireConfetti, shake } from '../src/components/Feedback';
import { RollingNumber, SwapText, TextScramble } from '../src/components/TextMotion';
import { Spinner } from '../src/components/Spinner';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { BurstToggle, CountBadge, HoldToConfirm, IconSwap, Magnetic, Reveal, flyTo, pop } from '../src/components/Microinteractions';
import { Copy, Check, Heart, Star, ShoppingCart, Bookmark } from 'lucide-react';

export const OndaYConfeti: Story = () => {
  const [saved, setSaved] = React.useState<'idle' | 'saving' | 'done'>('idle');
  const save = (event: React.MouseEvent) => {
    setSaved('saving');
    setTimeout(() => { setSaved('done'); fireConfetti({ x: event.clientX, y: event.clientY }); setTimeout(() => setSaved('idle'), 2400); }, 900);
  };
  return (
    <div className="flex flex-wrap items-center gap-5">
      <button type="button" onClick={save} disabled={saved === 'saving'} className="relative inline-flex h-10 min-w-40 items-center justify-center gap-2 overflow-hidden rounded-[var(--k-radius-sm,4px)] bg-accent px-5 text-[13px] font-semibold text-[color:var(--color-accent-fg)]">
        {saved === 'saving' ? <><Spinner variant="blades" size="xs" tone="inherit" /> Guardando</> : saved === 'done' ? <><StatusMark size={1.2} style={{ color: 'inherit' }} /> Guardado</> : <SwapText>Guardar cambios</SwapText>}
        <Ripple />
      </button>
      <button type="button" className="relative overflow-hidden rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] px-5 py-2 text-[13px]">Solo onda<Ripple /></button>
      <Button variant="secondary" onClick={() => fireConfetti()}>Confeti</Button>
    </div>
  );
};

export const MarcasYErrores: Story = () => {
  const field = React.useRef<HTMLDivElement>(null);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-[14px]">
        {(['success', 'error', 'warning', 'info'] as const).map((status) => <span key={status} className="flex items-center gap-2"><StatusMark status={status} size={2} />{status}</span>)}
      </div>
      <div ref={field} className="max-w-xs"><Input placeholder="Campo con error" aria-invalid /></div>
      <div><Button variant="danger" onClick={() => shake(field.current)}>Provocar error</Button></div>
    </div>
  );
};

export const Recompensas: Story = () => {
  const [liked, setLiked] = React.useState(false);
  const [starred, setStarred] = React.useState(true);
  const [saved, setSaved] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  return (
    <div className="flex flex-wrap items-center gap-6">
      <BurstToggle label="Me gusta" tone="danger" pressed={liked} onPressedChange={setLiked} count={liked ? 13 : 12} icon={<Heart size={18} />} activeIcon={<Heart size={18} fill="currentColor" />} />
      <BurstToggle label="Destacar" tone="warning" pressed={starred} onPressedChange={setStarred} icon={<Star size={18} />} activeIcon={<Star size={18} fill="currentColor" />} />
      <BurstToggle label="Guardar" pressed={saved} onPressedChange={setSaved} icon={<Bookmark size={18} />} activeIcon={<Bookmark size={18} fill="currentColor" />} />
      <Button variant="secondary" onClick={() => { setCopied(true); setTimeout(() => setCopied(false), 1400); }}>
        <IconSwap state={copied}>{copied ? <Check size={14} /> : <Copy size={14} />}</IconSwap>
        {copied ? 'Copiado' : 'Copiar'}
      </Button>
    </div>
  );
};

export const MantenerParaConfirmar: Story = () => {
  const [done, setDone] = React.useState(0);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <HoldToConfirm onConfirm={() => setDone((n) => n + 1)}>Eliminar factura</HoldToConfirm>
      <HoldToConfirm tone="accent" duration={800} onConfirm={() => setDone((n) => n + 1)}>Publicar</HoldToConfirm>
      <span className="text-[length:calc(13px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]">Confirmadas: <span data-testid="hold-count">{done}</span></span>
    </div>
  );
};

export const CarritoYContadores: Story = () => {
  const [count, setCount] = React.useState(0);
  const product = React.useRef<HTMLDivElement>(null);
  const cart = React.useRef<HTMLSpanElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-10">
      <div className="flex flex-col items-start gap-3">
        <div ref={product} className="grid h-20 w-20 place-items-center rounded-[var(--k-radius-md,8px)] bg-[var(--color-accent,#0d9488)] text-[var(--color-accent-fg,#ffffff)]">A4</div>
        <Button size="sm" onClick={() => { void flyTo(product.current, cart.current).then(() => setCount((n) => n + 1)); }}>Añadir</Button>
      </div>
      <span ref={cart} className="relative inline-grid h-11 w-11 place-items-center rounded-full border border-[var(--border-default,#e2e8f0)]">
        <ShoppingCart size={18} />
        <CountBadge value={count} className="absolute -right-1.5 -top-1.5" />
      </span>
      <Button size="sm" variant="secondary" onClick={() => setCount(0)}>Vaciar</Button>
      <Magnetic><Button onClick={(event) => void pop(event.currentTarget)}>Botón con imán</Button></Magnetic>
    </div>
  );
};

export const EntrarAlAparecer: Story = () => (
  <div className="flex flex-col gap-16">
    <p className="m-0 text-[length:calc(13px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]">Baja: cada bloque entra al aparecer.</p>
    <div style={{ height: 500 }} />
    <Reveal stagger className="grid grid-cols-3 gap-3">
      {['Facturas', 'Clientes', 'Almacén'].map((label) => <div key={label} className="k-lift rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-6">{label}</div>)}
    </Reveal>
    <Reveal direction="left"><p className="m-0">Y esto entra desde un lado.</p></Reveal>
  </div>
);

export const TextoQueCambia: Story = () => {
  const [n, setN] = React.useState(1280);
  const [phrase, setPhrase] = React.useState(0);
  const phrases = ['Conectando con el servidor', 'Verificando certificado', 'Todo listo'];
  return (
    <div className="flex max-w-xl flex-col gap-5">
      <p className="m-0 text-[44px] font-bold"><RollingNumber value={n} /></p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setN((v) => v + Math.round(Math.random() * 900))}>Sumar</Button>
        <Button size="sm" variant="secondary" onClick={() => setN(Math.round(Math.random() * 99999))}>Aleatorio</Button>
      </div>
      <p className="m-0 text-[20px]"><TextScramble text={phrases[phrase]} /></p>
      <p className="m-0 text-[16px]"><SwapText>{phrases[phrase]}</SwapText></p>
      <div><Button size="sm" variant="secondary" onClick={() => setPhrase((p) => (p + 1) % phrases.length)}>Siguiente frase</Button></div>
    </div>
  );
};
