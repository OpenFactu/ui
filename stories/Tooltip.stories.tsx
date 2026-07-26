import type { Story } from '@ladle/react';
import { Info } from 'lucide-react';
import { Tooltip } from '../src/components/Tooltip';
import { Button } from '../src/components/Button';

export const Lados: Story = () => (
  <div className="flex items-center justify-center gap-6 py-20 px-10">
    <Tooltip content="Arriba (default)">
      <Button variant="secondary">top</Button>
    </Tooltip>
    <Tooltip content="Abajo" side="bottom">
      <Button variant="secondary">bottom</Button>
    </Tooltip>
    <Tooltip content="Izquierda" side="left">
      <Button variant="secondary">left</Button>
    </Tooltip>
    <Tooltip content="Derecha" side="right">
      <Button variant="secondary">right</Button>
    </Tooltip>
  </div>
);

export const EnIcono: Story = () => (
  <div className="flex items-center gap-2 text-[13px] text-[var(--k-ink-700)] dark:text-slate-300">
    Impuesto aplicado
    <Tooltip content="IVA general del 21% aplicado según la configuración fiscal de la empresa.">
      <Info className="h-3.5 w-3.5 text-[var(--k-ink-400)] cursor-help" />
    </Tooltip>
  </div>
);
