import * as React from 'react';
import type { Story } from '@ladle/react';
import { Ripple, StatusMark, fireConfetti, shake } from '../src/components/Feedback';
import { RollingNumber, SwapText, TextScramble } from '../src/components/TextMotion';
import { Spinner } from '../src/components/Spinner';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';

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
      <div className="flex items-center gap-6 text-[14px]">
        {(['success', 'error', 'warning', 'info'] as const).map((status) => <span key={status} className="flex items-center gap-2"><StatusMark status={status} size={2} />{status}</span>)}
      </div>
      <div ref={field} className="max-w-xs"><Input placeholder="Campo con error" aria-invalid /></div>
      <div><Button variant="danger" onClick={() => shake(field.current)}>Provocar error</Button></div>
    </div>
  );
};

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
