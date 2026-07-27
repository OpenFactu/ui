import * as React from 'react';
import type { Story } from '@ladle/react';
import { Kanban, type KanbanColumn } from '../src/components/Kanban';
import { Badge } from '../src/components/Badge';
import { Avatar } from '../src/components/Avatar';

const INICIAL: KanbanColumn[] = [
  {
    id: 'por-hacer',
    label: 'Por hacer',
    cards: [
      {
        id: 't1',
        title: 'Revisar facturas de agosto',
        description: 'Cuadrar con el extracto bancario antes del cierre.',
        badges: <Badge variant="warning">Vence hoy</Badge>,
        meta: <Avatar name="Ana Pérez" size="xs" />,
        tone: 'warning',
      },
      {
        id: 't2',
        title: 'Pedir presupuesto de grúa',
        badges: <Badge variant="neutral">Compras</Badge>,
      },
    ],
  },
  {
    id: 'en-curso',
    label: 'En curso',
    tone: 'accent',
    wipLimit: 2,
    cards: [
      {
        id: 't3',
        title: 'Alta de proveedor Talleres del Norte',
        description: 'Falta el certificado de estar al corriente.',
        tone: 'accent',
        meta: <Avatar name="Bruno Gil" size="xs" />,
      },
    ],
  },
  {
    id: 'bloqueadas',
    label: 'Bloqueadas',
    tone: 'danger',
    cards: [
      {
        id: 't4',
        title: 'Cerrar inventario de almacén',
        description: 'Esperando el recuento de la planta 2.',
        tone: 'danger',
        badges: <Badge variant="danger">Bloqueada</Badge>,
      },
    ],
  },
  {
    id: 'hechas',
    label: 'Hechas',
    tone: 'success',
    emptyMessage: 'Nada terminado todavía',
    cards: [],
  },
];

export const Tablero: Story = () => {
  const [columnas, setColumnas] = React.useState(INICIAL);
  const [ultimo, setUltimo] = React.useState('—');

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Arrastra una tarjeta a otra columna o a otra posición. Se avisa una sola vez, al soltar.
        Último movimiento: <strong className="text-accent">{ultimo}</strong>
      </p>
      <Kanban
        columns={columnas}
        onCardClick={(c) => setUltimo(`abierta: ${c.title}`)}
        onCardMove={(card, to, from) => {
          setUltimo(`${card.title} → ${to.columnId} (posición ${to.index})`);
          setColumnas((prev) => {
            const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
            const origen = next.find((c) => c.id === from.columnId)!;
            origen.cards.splice(from.index, 1);
            const destino = next.find((c) => c.id === to.columnId)!;
            // `to.index` ya viene corregido: splice directo.
            destino.cards.splice(to.index, 0, card);
            return next;
          });
        }}
      />
    </div>
  );
};

/** Con `wipLimit`, pasarse del máximo recomendado se avisa pero no se impide. */
export const LimiteDeTrabajo: Story = () => (
  <Kanban
    columns={[
      {
        id: 'en-curso',
        label: 'En curso',
        wipLimit: 2,
        tone: 'accent',
        cards: [
          { id: 'a', title: 'Tarea A' },
          { id: 'b', title: 'Tarea B' },
          { id: 'c', title: 'Tarea C' },
          { id: 'd', title: 'Tarea D' },
        ],
      },
      { id: 'hechas', label: 'Hechas', wipLimit: 5, tone: 'success', cards: [{ id: 'e', title: 'Tarea E' }] },
    ]}
  />
);

export const SoloLectura: Story = () => <Kanban columns={INICIAL} />;
