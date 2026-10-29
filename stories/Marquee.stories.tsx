import type { Story } from '@ladle/react';
import { Marquee } from '../src/components/Marquee';

const CLIENTS = ['Talleres Sur', 'Distribuciones Norte', 'Logística Levante', 'Hostelería Centro', 'Agro Ebro', 'Clínica Mar', 'Construcciones Oeste'];

export const Basico: Story = () => (
  <div className="flex max-w-3xl flex-col gap-6">
    <Marquee label="Clientes que confían en nosotros">
      {CLIENTS.map((c) => <span key={c} className="whitespace-nowrap rounded-full border border-[var(--border-default,#e2e8f0)] px-4 py-2 text-[13px] font-semibold">{c}</span>)}
    </Marquee>
    <Marquee label="Últimos avisos" direction="right" speed={60} fade={false}>
      {['Nueva versión de la factura electrónica', 'Mantenimiento el domingo a las 3:00', 'Ya puedes firmar albaranes desde el móvil'].map((t) => <span key={t} className="whitespace-nowrap text-[13px] text-[var(--fg-muted,#52606f)]">● {t}</span>)}
    </Marquee>
  </div>
);
