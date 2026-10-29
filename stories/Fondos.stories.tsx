import * as React from 'react';
import type { Story } from '@ladle/react';
import { AuroraBackground, GlowBorder, MeshBackground, NoiseOverlay, Particles, PatternBackground, Spotlight } from '../src/components/Backdrops';
import { GradientText } from '../src/components/TextEffects';

const Hero: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="relative isolate overflow-hidden rounded-[var(--k-radius-lg,12px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]">
    {children}
    <div className="relative px-8 py-14 text-center">
      <p className="m-0 font-mono text-[11px] uppercase tracking-[2px] text-[var(--fg-muted,#52606f)]">{title}</p>
      <h2 className="m-0 mt-2 text-[32px] font-bold leading-tight"><GradientText animated>Factura sin fricción</GradientText></h2>
    </div>
  </section>
);

export const Capas: Story = () => (
  <div className="grid gap-5 md:grid-cols-2">
    <Hero title="Aurora"><AuroraBackground /><NoiseOverlay /></Hero>
    <Hero title="Malla"><MeshBackground animated /><NoiseOverlay /></Hero>
    <Hero title="Puntos"><PatternBackground variant="dots" /></Hero>
    <Hero title="Cuadrícula"><PatternBackground variant="grid" /><MeshBackground className="opacity-60" /></Hero>
    <Hero title="Partículas"><Particles /></Hero>
    <Hero title="Foco (mueve el ratón)"><PatternBackground variant="grid" /><Spotlight /></Hero>
  </div>
);

export const BordeConBrillo: Story = () => (
  <div className="max-w-sm">
    <GlowBorder>
      <div className="p-6 text-[14px]">
        <strong className="block text-[16px]">Plan Profesional</strong>
        <span className="text-[var(--fg-muted,#52606f)]">Facturación ilimitada, firma y conciliación bancaria.</span>
      </div>
    </GlowBorder>
  </div>
);
