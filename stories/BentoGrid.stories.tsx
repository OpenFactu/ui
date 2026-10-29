import type { Story } from '@ladle/react';
import { BentoGrid, BentoItem } from '../src/components/BentoGrid';
import { UiIcon } from '../src/icons';
import { Sparkline } from '../src/components/Sparkline';

export const Basico: Story = () => (
  <div className="max-w-5xl">
    <BentoGrid>
      <BentoItem colSpan={2} rowSpan={2} featured title="Facturación de octubre" description="+18 % respecto a septiembre" icon={<UiIcon slot="sparkles" size={18} />}>
        <span className="text-[44px] font-bold leading-none">48.230 €</span>
      </BentoItem>
      <BentoItem title="Pendiente de cobro" description="12 facturas" icon={<UiIcon slot="clock" size={18} />} onClick={() => undefined} />
      <BentoItem title="Clientes nuevos" description="7 este mes" icon={<UiIcon slot="bookmark" size={18} />} onClick={() => undefined} />
      <BentoItem colSpan={2} title="Tendencia" description="Últimas 12 semanas">
        <Sparkline data={[4, 6, 5, 8, 7, 9, 11, 10, 13, 12, 15, 16]} />
      </BentoItem>
      <BentoItem title="Tareas" description="3 por revisar" icon={<UiIcon slot="list-checks" size={18} />} />
      <BentoItem title="Avisos" description="Todo en orden" icon={<UiIcon slot="bell" size={18} />} />
    </BentoGrid>
  </div>
);
