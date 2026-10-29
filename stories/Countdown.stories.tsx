import * as React from 'react';
import type { Story } from '@ladle/react';
import { Countdown, type CountdownVariant } from '../src/components/Countdown';
import { Button } from '../src/components/Button';

const useTarget = (seconds: number) => React.useMemo(() => Date.now() + seconds * 1000, [seconds]);
const TRIMESTRE = 2 * 86400 + 5 * 3600 + 41 * 60 + 9;

const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--fg-muted,#52606f)]">{children}</span>
);

export const Basico: Story = () => {
  const target = useTarget(TRIMESTRE);
  const [short, setShort] = React.useState(() => Date.now() + 12000);
  const [done, setDone] = React.useState(false);
  return (
    <div className="flex flex-col items-start gap-6">
      <div className="flex flex-col gap-2"><span className="text-[13px] text-[var(--fg-muted,#52606f)]">Cierre del trimestre</span><Countdown target={target} /></div>
      <div className="flex items-center gap-3 text-[18px]"><Countdown target={target} variant="inline" /></div>
      <div className="flex items-center gap-3">
        <Countdown target={short} onComplete={() => setDone(true)} completed={<strong>¡Tiempo!</strong>} />
        <Button size="sm" variant="secondary" onClick={() => { setDone(false); setShort(Date.now() + 12000); }}>Reiniciar 12 s</Button>
        {done && <span className="text-[13px]">onComplete llamado</span>}
      </div>
    </div>
  );
};

const VARIANTS: { variant: CountdownVariant; note: string }[] = [
  { variant: 'blocks', note: 'Tarjetas' },
  { variant: 'flip', note: 'Fichas partidas' },
  { variant: 'ring', note: 'Anillos' },
  { variant: 'display', note: 'Portada' },
  { variant: 'pill', note: 'Pastilla' },
  { variant: 'inline', note: 'En línea' },
];

export const Estilos: Story = () => {
  const target = useTarget(TRIMESTRE);
  return (
    <div className="flex flex-col items-start gap-8">
      {VARIANTS.map(({ variant, note }) => (
        <div key={variant} className="flex flex-col items-start gap-3">
          <Caption>{variant} · {note}</Caption>
          <Countdown target={target} variant={variant} label={variant === 'pill' ? 'Termina en' : undefined} />
        </div>
      ))}
    </div>
  );
};

export const Acento: Story = () => {
  const target = useTarget(TRIMESTRE);
  return (
    <div className="flex flex-col items-start gap-8">
      {(['blocks', 'flip', 'ring', 'pill'] as const).map((variant) => (
        <Countdown key={variant} target={target} variant={variant} tone="accent" label={variant === 'pill' ? 'Oferta' : undefined} />
      ))}
    </div>
  );
};

export const Tamanos: Story = () => {
  const target = useTarget(5 * 3600 + 12 * 60);
  return (
    <div className="flex flex-col items-start gap-8">
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <div key={size} className="flex flex-wrap items-center gap-8">
          <Countdown target={target} size={size} />
          <Countdown target={target} size={size} variant="ring" />
          <Countdown target={target} size={size} variant="flip" />
        </div>
      ))}
    </div>
  );
};

export const Urgente: Story = () => {
  const [target, setTarget] = React.useState(() => Date.now() + 25000);
  return (
    <div className="flex flex-col items-start gap-6">
      <p className="m-0 max-w-[420px] text-[13px] text-[var(--fg-muted,#52606f)]">
        Con <code>urgentBelow</code> en segundos, por debajo de ese umbral pasa a tono de peligro y late cada segundo.
      </p>
      <Countdown target={target} urgentBelow={15} units={['minutes', 'seconds']} />
      <Countdown target={target} urgentBelow={15} variant="ring" units={['minutes', 'seconds']} />
      <Countdown target={target} urgentBelow={15} variant="pill" units={['minutes', 'seconds']} label="La sesión caduca en" />
      <Button size="sm" variant="secondary" onClick={() => setTarget(Date.now() + 25000)}>Reiniciar 25 s</Button>
    </div>
  );
};

export const ConSeparador: Story = () => {
  const target = useTarget(TRIMESTRE);
  return (
    <div className="flex flex-col items-start gap-8">
      <Countdown target={target} separator />
      <Countdown target={target} variant="ring" separator={false} size="sm" />
      <Countdown target={target} variant="display" separator={false} />
    </div>
  );
};
