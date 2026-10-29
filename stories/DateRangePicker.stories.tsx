import * as React from 'react';
import type { Story } from '@ladle/react';
import { DateRangePicker, type DateRange } from '../src/components/DateRangePicker';

export const Basico: Story = () => {
  const [range, setRange] = React.useState<DateRange>({ start: null, end: null });
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <DateRangePicker label="Periodo" value={range} onChange={setRange} helperText="Elige un atajo o dos días en el calendario" />
      <code className="text-[12px] text-[var(--fg-muted,#52606f)]">{JSON.stringify(range)}</code>
    </div>
  );
};

export const SinAtajosYConLimites: Story = () => {
  const [range, setRange] = React.useState<DateRange>({ start: '2026-10-05', end: '2026-10-12' });
  return (
    <div className="max-w-sm">
      <DateRangePicker label="Vacaciones" value={range} onChange={setRange} presets={false} months={1} min="2026-10-01" max="2026-12-31" />
    </div>
  );
};
