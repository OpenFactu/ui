import * as React from 'react';
import type { Story } from '@ladle/react';
import { Gantt, type GanttScale, type GanttTask } from '../src/components/Gantt';
import { SegmentedControl } from '../src/components/SegmentedControl';

/** Fecha fija para que las stories se vean siempre igual. */
const HOY = '2026-07-22';

const OBRA: GanttTask[] = [
  {
    id: 'proyecto',
    name: 'Redacción del proyecto',
    start: '2026-07-06',
    end: '2026-07-17',
    status: 'hecha',
    progress: 1,
    group: 'Preparación',
  },
  {
    id: 'licencia',
    name: 'Licencia de obra',
    start: '2026-07-20',
    end: '2026-08-07',
    status: 'en-curso',
    progress: 0.4,
    dependencies: ['proyecto'],
    group: 'Preparación',
  },
  {
    id: 'acopio',
    name: 'Acopio de material',
    start: '2026-07-27',
    end: '2026-08-07',
    status: 'pendiente',
    group: 'Preparación',
  },
  {
    id: 'cimentacion',
    name: 'Cimentación',
    start: '2026-08-10',
    end: '2026-08-28',
    status: 'pendiente',
    dependencies: ['licencia', 'acopio'],
    group: 'Ejecución',
  },
  {
    id: 'estructura',
    name: 'Estructura',
    start: '2026-08-31',
    end: '2026-09-25',
    status: 'pendiente',
    dependencies: ['cimentacion'],
    group: 'Ejecución',
  },
  {
    id: 'instalaciones',
    name: 'Instalaciones',
    start: '2026-09-14',
    end: '2026-10-09',
    status: 'bloqueada',
    group: 'Ejecución',
  },
  {
    id: 'entrega',
    name: 'Entrega de llaves',
    start: '2026-10-16',
    end: '2026-10-16',
    dependencies: ['estructura'],
    group: 'Ejecución',
  },
];

export const Obra: Story = () => (
  <Gantt tasks={OBRA} scale="week" today={HOY} aria-label="Planificación de obra" />
);

export const Escalas: Story = () => {
  const [scale, setScale] = React.useState<GanttScale>('week');
  return (
    <div className="space-y-3">
      <SegmentedControl
        value={scale}
        onChange={(v) => setScale(v as GanttScale)}
        options={[
          { value: 'day', label: 'Día' },
          { value: 'week', label: 'Semana' },
          { value: 'month', label: 'Mes' },
          { value: 'quarter', label: 'Trimestre' },
        ]}
      />
      <Gantt tasks={OBRA} scale={scale} today={HOY} />
    </div>
  );
};

/** Arrastrar la barra la mueve; arrastrar sus bordes cambia la duración. */
export const Arrastrable: Story = () => {
  const [tareas, setTareas] = React.useState(OBRA);
  const [ultimo, setUltimo] = React.useState<string>('—');
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Arrastra una barra para moverla o sus extremos para alargarla. Se avisa una sola vez, al
        soltar. Último cambio: <strong className="text-accent">{ultimo}</strong>
      </p>
      <Gantt
        tasks={tareas}
        scale="week"
        today={HOY}
        onTaskChange={(t, { start, end }) => {
          setUltimo(`${t.name}: ${fmt(start)} → ${fmt(end)}`);
          setTareas((prev) =>
            prev.map((p) => (p.id === t.id ? { ...p, start: fmt(start), end: fmt(end) } : p)),
          );
        }}
      />
    </div>
  );
};

export const SinAgrupar: Story = () => (
  <Gantt
    scale="day"
    today={HOY}
    tasks={[
      { id: 'a', name: 'Revisar facturas', start: '2026-07-20', end: '2026-07-22', status: 'hecha', progress: 1 },
      { id: 'b', name: 'Cierre mensual', start: '2026-07-22', end: '2026-07-27', status: 'en-curso', progress: 0.6, dependencies: ['a'] },
      { id: 'c', name: 'Presentar modelo 303', start: '2026-07-30', end: '2026-07-30', dependencies: ['b'] },
    ]}
  />
);

export const Vacio: Story = () => <Gantt tasks={[]} />;
