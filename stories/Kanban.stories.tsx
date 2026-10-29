import * as React from 'react';
import type { Story } from '@ladle/react';
import { Kanban, type KanbanCard, type KanbanColumn, type KanbanMove } from '../src/components/Kanban';
import { Badge } from '../src/components/Badge';
import { Avatar } from '../src/components/Avatar';
import { demoImage } from './shared/demoImages';

/** Fecha fija: los vencimientos se ven siempre igual y las pruebas no dependen del reloj. */
const HOY = '2026-07-22T10:00:00';

const INICIAL: KanbanColumn[] = [
  {
    id: 'por-hacer',
    label: 'Por hacer',
    cards: [
      {
        id: 't1',
        title: 'Revisar facturas de agosto',
        description: 'Cuadrar con el extracto bancario antes del cierre.',
        labels: [{ text: 'Contabilidad', tone: 'info' }, { text: 'Urgente', tone: 'danger' }],
        due: '2026-07-22',
        assignees: [{ name: 'Ana Pérez' }, { name: 'Luis Romero' }],
        progress: { done: 2, total: 5 },
        comments: 3,
        tone: 'warning',
      },
      {
        id: 't2',
        title: 'Pedir presupuesto de grúa',
        labels: [{ text: 'Compras' }],
        due: '2026-07-30',
        attachments: 2,
        assignees: [{ name: 'Bruno Gil' }],
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
        cover: demoImage(3, 'Talleres', 520, 200),
        due: '2026-07-21',
        assignees: [{ name: 'Bruno Gil' }, { name: 'Marta Ruiz' }, { name: 'Ana Pérez' }, { name: 'Pablo Gil' }],
        comments: 8,
        attachments: 1,
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
        meta: <Avatar name="Marta Ruiz" size="xs" />,
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

/** Aplica un movimiento de `onCardMove` a las columnas: `to.index` ya viene corregido, así que basta con `splice`. */
const aplicar = (prev: KanbanColumn[], card: KanbanCard, to: KanbanMove, from: KanbanMove) => {
  const next = prev.map((c) => ({ ...c, cards: [...c.cards] }));
  next.find((c) => c.id === from.columnId)!.cards.splice(from.index, 1);
  const movida = to.laneId !== undefined ? { ...card, lane: to.laneId } : card;
  next.find((c) => c.id === to.columnId)!.cards.splice(to.index, 0, { ...movida, done: to.columnId === 'hechas' });
  return next;
};

export const Tablero: Story = () => {
  const [columnas, setColumnas] = React.useState(INICIAL);
  const [ultimo, setUltimo] = React.useState('—');

  return (
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Arrastra una tarjeta a otra columna o a otra posición (cerca del borde, el tablero se desplaza solo). Con el
        teclado: Espacio la coge, las flechas eligen destino y Espacio la suelta. Se avisa una sola vez, al soltar.
        Último movimiento: <strong className="text-[var(--fg-default,#0a1628)]">{ultimo}</strong>
      </p>
      <Kanban
        columns={columnas}
        today={HOY}
        onCardClick={(c) => setUltimo(`abierta: ${c.title}`)}
        onCardAdd={(columna, titulo) => {
          setUltimo(`nueva en ${columna}: ${titulo}`);
          setColumnas((prev) => prev.map((c) => (c.id === columna ? { ...c, cards: [...c.cards, { id: `n${Date.now()}`, title: titulo }] } : c)));
        }}
        onCardMove={(card, to, from) => {
          setUltimo(`${card.title} → ${to.columnId} (posición ${to.index})`);
          setColumnas((prev) => aplicar(prev, card, to, from));
        }}
      />
    </div>
  );
};

const PERSONAS = ['Ana Pérez', 'Bruno Gil', 'Marta Ruiz'];
const conCarril = (lane: string, cards: KanbanCard[]) => cards.map((c) => ({ ...c, lane }));

/** Carriles por responsable: arrastrar entre carriles cambia `lane`. */
export const Carriles: Story = () => {
  const [columnas, setColumnas] = React.useState<KanbanColumn[]>([
    { id: 'por-hacer', label: 'Por hacer', cards: [
      ...conCarril('Ana Pérez', [{ id: 'c1', title: 'Conciliar banco', labels: [{ text: 'Contabilidad', tone: 'info' }], due: '2026-07-24' }]),
      ...conCarril('Bruno Gil', [{ id: 'c2', title: 'Llamar a proveedores', due: '2026-07-20' }, { id: 'c3', title: 'Revisar pedidos', progress: { done: 1, total: 4 } }]),
    ] },
    { id: 'en-curso', label: 'En curso', tone: 'accent', wipLimit: 3, cards: [
      ...conCarril('Ana Pérez', [{ id: 'c4', title: 'Modelo 303', labels: [{ text: 'Impuestos', tone: 'warning' }], due: '2026-07-22', tone: 'accent' }]),
      ...conCarril('Marta Ruiz', [{ id: 'c5', title: 'Inventario planta 1', comments: 4 }]),
    ] },
    { id: 'hechas', label: 'Hechas', tone: 'success', cards: conCarril('Marta Ruiz', [{ id: 'c6', title: 'Cierre de junio', done: true, due: '2026-07-10' }]) },
  ]);
  return (
    <Kanban
      columns={columnas}
      today={HOY}
      lanes={PERSONAS.map((p) => ({ id: p, label: <span className="inline-flex items-center gap-2"><Avatar name={p} size="xs" />{p}</span> }))}
      onCardMove={(card, to, from) => setColumnas((prev) => aplicar(prev, card, to, from))}
      onCardAdd={(columna, titulo, lane) => setColumnas((prev) => prev.map((c) => (c.id === columna ? { ...c, cards: [...c.cards, { id: `n${Date.now()}`, title: titulo, lane }] } : c)))}
    />
  );
};

/** Con `wipLimit`, llegar al máximo se marca en ámbar y pasarse en rojo; avisa pero no impide. */
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
      { id: 'revision', label: 'En revisión', wipLimit: 2, tone: 'warning', cards: [{ id: 'f', title: 'Tarea F' }, { id: 'g', title: 'Tarea G' }] },
      { id: 'hechas', label: 'Hechas', wipLimit: 5, tone: 'success', cards: [{ id: 'e', title: 'Tarea E' }] },
      { id: 'archivo', label: 'Archivo', collapsed: true, cards: [{ id: 'z', title: 'Antigua' }] },
    ]}
  />
);

export const SoloLectura: Story = () => <Kanban columns={INICIAL} today={HOY} />;
