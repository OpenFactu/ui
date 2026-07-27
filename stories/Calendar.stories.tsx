import * as React from 'react';
import type { Story } from '@ladle/react';
import { Calendar, type CalendarEvent } from '../src/components/Calendar';

/** Fecha fija: así las stories se ven siempre igual y las pruebas no dependen del reloj. */
const HOY = '2026-07-22T10:00:00';

const SEMANA: CalendarEvent[] = [
  {
    id: 'hormigon',
    title: 'Llevar hormigón',
    start: '2026-07-22T07:00:00',
    end: '2026-07-22T08:00:00',
    status: 'en-curso',
    meta: 'A. Pérez',
  },
  {
    id: 'revision',
    title: 'Revisión de facturas',
    start: '2026-07-21T09:00:00',
    end: '2026-07-21T11:00:00',
    status: 'hecha',
  },
  {
    id: 'visita',
    title: 'Visita de obra',
    start: '2026-07-23T16:30:00',
    end: '2026-07-23T18:00:00',
    status: 'pendiente',
    meta: 'Con el cliente',
  },
  {
    id: 'bloqueo',
    title: 'Falta material',
    start: '2026-07-24T12:00:00',
    end: '2026-07-24T14:00:00',
    status: 'bloqueada',
  },
  {
    id: 'festivo',
    title: 'Cierre por inventario',
    start: '2026-07-25T00:00:00',
    end: '2026-07-25T23:59:00',
    allDay: true,
    status: 'bloqueada',
  },
];

export const Semana: Story = () => (
  <Calendar events={SEMANA} today={HOY} date={HOY} aria-label="Calendario de tareas" />
);

export const Mes: Story = () => (
  <Calendar
    events={[
      ...SEMANA,
      { id: 'a', title: 'Nóminas', start: '2026-07-05T09:00:00', end: '2026-07-05T10:00:00' },
      { id: 'b', title: 'Modelo 303', start: '2026-07-20T09:00:00', end: '2026-07-20T10:00:00', status: 'hecha' },
      { id: 'c', title: 'Cierre', start: '2026-07-31T09:00:00', end: '2026-07-31T12:00:00' },
      { id: 'd', title: 'Auditoría', start: '2026-07-22T15:00:00', end: '2026-07-22T16:00:00' },
      { id: 'e', title: 'Extra', start: '2026-07-22T18:00:00', end: '2026-07-22T19:00:00' },
      { id: 'f', title: 'Una más', start: '2026-07-22T19:30:00', end: '2026-07-22T20:00:00' },
    ]}
    view="month"
    today={HOY}
    date={HOY}
  />
);

/** Arrastrar mueve el bloque; su borde inferior cambia la duración. */
export const Arrastrable: Story = () => {
  const [eventos, setEventos] = React.useState(SEMANA);
  const [cola, setCola] = React.useState<CalendarEvent[]>([
    { id: 'sin-1', title: 'Pedir grúa', start: HOY, end: HOY, status: 'pendiente' },
    { id: 'sin-2', title: 'Firmar acta', start: HOY, end: HOY, status: 'pendiente' },
  ]);
  const [ultimo, setUltimo] = React.useState('—');
  const fmt = (d: Date) =>
    `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Arrastra un bloque para moverlo, su borde inferior para alargarlo, o una tarjeta de «sin
        programar» al calendario. Se avisa una sola vez, al soltar. Último cambio:{' '}
        <strong className="text-accent">{ultimo}</strong>
      </p>
      <Calendar
        events={eventos}
        unscheduled={cola}
        today={HOY}
        date={HOY}
        onEventChange={(e, { start, end }) => {
          setUltimo(`${e.title}: ${fmt(start)} → ${fmt(end)}`);
          setEventos((prev) =>
            prev.map((p) => (p.id === e.id ? { ...p, start, end } : p)),
          );
        }}
        onSchedule={(e, start) => {
          const fin = new Date(start.getTime() + 60 * 60 * 1000);
          setUltimo(`${e.title} programado el ${fmt(start)}`);
          setCola((prev) => prev.filter((c) => c.id !== e.id));
          setEventos((prev) => [...prev, { ...e, start, end: fin, status: 'pendiente' }]);
        }}
        onSlotClick={(d) => setUltimo(`Hueco libre: ${fmt(d)}`)}
      />
    </div>
  );
};

export const Vacio: Story = () => <Calendar events={[]} today={HOY} date={HOY} unscheduled={[]} />;
