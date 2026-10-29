import * as React from 'react';
import type { Story } from '@ladle/react';
import { Slider } from '../src/components/Slider';

const euros = (n: number) => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

export const Basico: Story = () => {
  const [value, setValue] = React.useState(35);
  return (
    <div className="max-w-md">
      <Slider label="Descuento" value={value} onChange={setValue} formatValue={(v) => `${v} %`} helperText={`Aplicado: ${value} %`} />
    </div>
  );
};

export const Rango: Story = () => {
  const [range, setRange] = React.useState<[number, number]>([200, 1200]);
  return (
    <div className="max-w-md">
      <Slider label="Importe" value={range} onChange={setRange} min={0} max={2000} step={50} minGap={100} formatValue={euros} helperText={`De ${euros(range[0])} a ${euros(range[1])}`} />
    </div>
  );
};

export const ConMarcas: Story = () => {
  const [value, setValue] = React.useState(3);
  const [months, setMonths] = React.useState(12);
  return (
    <div className="flex max-w-md flex-col gap-10">
      <Slider label="Prioridad" value={value} onChange={setValue} min={1} max={5} marks showValue="always" />
      <Slider label="Plazo" value={months} onChange={setMonths} min={0} max={36} step={6} formatValue={(v) => `${v} meses`} marks={[{ value: 0, label: 'Hoy' }, { value: 12, label: '1 año' }, { value: 24, label: '2 años' }, { value: 36, label: '3 años' }]} />
    </div>
  );
};

export const Estados: Story = () => (
  <div className="flex max-w-md flex-col gap-6">
    <Slider label="Pequeño" size="sm" value={60} onChange={() => undefined} />
    <Slider label="Desactivado" value={40} onChange={() => undefined} disabled />
    <Slider label="Con error" value={95} onChange={() => undefined} error="No puede superar el 90 %" />
  </div>
);
