import type { Story } from '@ladle/react';
import { Carousel } from '../src/components/Carousel';
import { demoImage } from './shared/demoImages';

export const Basico: Story = () => (
  <div className="max-w-2xl">
    <Carousel label="Productos destacados">
      {Array.from({ length: 6 }, (_, i) => <img key={i} src={demoImage(i, `Diapositiva ${i + 1}`)} alt={`Diapositiva ${i + 1}`} />)}
    </Carousel>
  </div>
);

export const VariasALaVez: Story = () => (
  <div className="max-w-3xl">
    <Carousel label="Clientes" perView={3} gap={12} autoplay={3500}>
      {Array.from({ length: 9 }, (_, i) => (
        <div key={i} className="flex h-40 flex-col justify-end rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-4">
          <strong className="text-[15px]">Cliente {i + 1}</strong>
          <span className="text-[12px] text-[var(--fg-muted,#52606f)]">{(i + 1) * 12} facturas este año</span>
        </div>
      ))}
    </Carousel>
  </div>
);
