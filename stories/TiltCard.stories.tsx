import type { Story } from '@ladle/react';
import { TiltCard } from '../src/components/TiltCard';
import { demoImage } from './shared/demoImages';

export const Basico: Story = () => (
  <div className="grid max-w-3xl grid-cols-1 gap-6 p-6 sm:grid-cols-2">
    <TiltCard className="border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-6">
      <span className="font-mono text-[11px] uppercase tracking-[2px] text-[var(--fg-muted,#52606f)]">Plan</span>
      <h3 className="m-0 mt-1 text-[24px] font-bold">Profesional</h3>
      <p className="m-0 mt-2 text-[13px] text-[var(--fg-muted,#52606f)]">Facturas ilimitadas, banca y firma electrónica.</p>
      <p className="m-0 mt-6 text-[32px] font-bold">29 €<span className="text-[14px] font-medium text-[var(--fg-muted,#52606f)]"> /mes</span></p>
    </TiltCard>
    <TiltCard maxTilt={14}>
      <img src={demoImage(1, 'Tarjeta 3D', 800, 520)} alt="Tarjeta de demostración" className="block w-full" />
    </TiltCard>
  </div>
);
