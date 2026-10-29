import * as React from 'react';
import type { Story } from '@ladle/react';
import { Spinner, Thinking, type SpinnerVariant } from '../src/components/Spinner';
import { Progress } from '../src/components/Progress';
import { Skeleton } from '../src/components/Skeleton';
import { ShimmerText } from '../src/components/TextEffects';

const VARIANTS: SpinnerVariant[] = ['ring', 'dual', 'pulse', 'orbit', 'dots', 'bars', 'grid'];

export const Spinners: Story = () => (
  <div className="flex flex-col gap-8">
    <div className="grid grid-cols-4 gap-6 sm:grid-cols-7">
      {VARIANTS.map((variant) => (
        <figure key={variant} className="m-0 flex flex-col items-center gap-3">
          <Spinner variant={variant} size="lg" />
          <figcaption className="font-mono text-[11px] text-[var(--fg-muted,#52606f)]">{variant}</figcaption>
        </figure>
      ))}
    </div>
    <div className="flex flex-wrap items-center gap-6">
      {(['xs', 'sm', 'md', 'lg', 'xl'] as const).map((size) => <Spinner key={size} size={size} />)}
      <Spinner tone="muted" variant="dots" />
      <Spinner tone="success" variant="bars" />
      <Spinner tone="danger" variant="dual" />
      <span className="text-[var(--k-danger,#dc2626)]"><Spinner tone="inherit" variant="pulse" size="lg" /></span>
    </div>
  </div>
);

export const Barras: Story = () => {
  const [value, setValue] = React.useState(35);
  React.useEffect(() => { const t = setInterval(() => setValue((v) => (v >= 100 ? 0 : v + 5)), 700); return () => clearInterval(t); }, []);
  return (
    <div className="flex max-w-lg flex-col gap-5">
      <Progress label="Con cuenta" value={value} showValue />
      <Progress label="Rayas" value={value} striped showValue variant="success" />
      <Progress label="Con brillo" value={value} glow variant="warning" />
      <Progress label="Indeterminada" indeterminate />
      <Progress label="Indeterminada fina" indeterminate size="sm" variant="danger" />
    </div>
  );
};

export const CargaDeIA: Story = () => (
  <div className="flex flex-col gap-4">
    <Thinking />
    <Thinking variant="bars">Analizando la factura</Thinking>
    <Thinking variant="ring">Buscando en 1.240 documentos</Thinking>
    <p className="m-0 text-[22px] font-semibold"><ShimmerText>Generando el resumen…</ShimmerText></p>
  </div>
);

export const Esqueletos: Story = () => (
  <div className="flex max-w-md items-start gap-4">
    <Skeleton variant="circle" width={48} height={48} animation="shimmer" />
    <div className="flex-1"><Skeleton lines={3} animation="shimmer" /></div>
  </div>
);
