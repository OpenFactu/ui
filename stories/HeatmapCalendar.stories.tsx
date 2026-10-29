import * as React from 'react';
import type { Story } from '@ladle/react';
import { HeatmapCalendar } from '../src/components/HeatmapCalendar';

/** Un año de actividad inventada pero estable (sin azar): más los días laborables, con picos a fin de mes. */
function demoData(end: Date) {
  const data: Record<string, number> = {};
  for (let i = 0; i < 365; i += 1) {
    const d = new Date(end); d.setDate(d.getDate() - i);
    const weekend = d.getDay() === 0 || d.getDay() === 6;
    const base = weekend ? 0 : Math.round((Math.sin(i * 0.7) + 1) * 2 + (i % 11 === 0 ? 3 : 0));
    const monthEnd = d.getDate() >= 27 ? 4 : 0;
    const value = Math.max(0, base + monthEnd - (i % 7 === 3 ? 2 : 0));
    if (value) data[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`] = value;
  }
  return data;
}

export const Basico: Story = () => {
  const data = React.useMemo(() => demoData(new Date()), []);
  const [picked, setPicked] = React.useState<string | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <HeatmapCalendar label="Facturas emitidas" data={data} onDayClick={(iso, v) => setPicked(`${iso}: ${v} facturas`)} />
      <span className="text-[12px] text-[var(--fg-muted,#52606f)]">{picked ?? 'Pulsa un día'}</span>
    </div>
  );
};
