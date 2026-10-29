import * as React from 'react';
import type { Story } from '@ladle/react';
import { ToggleGroup } from '../src/components/ToggleGroup';

const B = <strong className="font-serif text-[14px]">B</strong>;
const I = <em className="font-serif text-[14px]">I</em>;
const U = <span className="font-serif text-[14px] underline">U</span>;
const Align = ({ d }: { d: string }) => <svg viewBox="0 0 16 16" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><path d={d} /></svg>;

export const Formato: Story = () => {
  const [format, setFormat] = React.useState<string[]>(['b']);
  const [align, setAlign] = React.useState<string | null>('left');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <ToggleGroup type="multiple" aria-label="Formato" value={format} onChange={setFormat} items={[{ value: 'b', icon: B, title: 'Negrita' }, { value: 'i', icon: I, title: 'Cursiva' }, { value: 'u', icon: U, title: 'Subrayado' }]} />
      <ToggleGroup type="single" aria-label="Alineación" value={align} onChange={setAlign} items={[
        { value: 'left', icon: <Align d="M2 4h12M2 8h8M2 12h10" />, title: 'Izquierda' },
        { value: 'center', icon: <Align d="M2 4h12M4 8h8M3 12h10" />, title: 'Centro' },
        { value: 'right', icon: <Align d="M2 4h12M6 8h8M4 12h10" />, title: 'Derecha' },
      ]} />
    </div>
  );
};

export const Filtros: Story = () => {
  const [status, setStatus] = React.useState<string[]>(['pendiente', 'vencida']);
  return (
    <ToggleGroup type="multiple" variant="ghost" aria-label="Estado" value={status} onChange={setStatus} items={[
      { value: 'borrador', label: 'Borrador' }, { value: 'pendiente', label: 'Pendiente' }, { value: 'pagada', label: 'Pagada' }, { value: 'vencida', label: 'Vencida' }, { value: 'anulada', label: 'Anulada', disabled: true },
    ]} />
  );
};
