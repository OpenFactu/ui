import type { Story } from '@ladle/react';
import { FileText, Send, Check, AlertTriangle, Pencil } from 'lucide-react';
import { Timeline, type TimelineEvent } from '../src/components/Timeline';
import { Badge } from '../src/components/Badge';

/** Reloj fijo: así las fechas relativas salen siempre igual. */
const AHORA = '2026-07-22T18:00:00';

const HISTORIAL: TimelineEvent[] = [
  {
    id: '1',
    title: 'Factura creada',
    description: 'FAC/2026/0042 por 1.240,00 € a Construcciones Acme S.L.',
    author: 'Ana Pérez',
    date: '2026-07-20T09:12:00',
    icon: <FileText className="h-3.5 w-3.5" />,
  },
  {
    id: '2',
    title: 'Línea modificada',
    description: 'Tornillos de 10 cm: 100 → 120 unidades.',
    author: 'Bruno Gil',
    date: '2026-07-20T11:40:00',
    icon: <Pencil className="h-3.5 w-3.5" />,
  },
  {
    id: '3',
    title: 'Enviada a la AEAT',
    author: 'Sistema',
    date: '2026-07-21T08:05:00',
    tone: 'info',
    icon: <Send className="h-3.5 w-3.5" />,
  },
  {
    id: '4',
    title: 'Rechazada por la AEAT',
    description: 'Código 3002: el NIF del destinatario no consta en el censo.',
    author: 'Sistema',
    date: '2026-07-21T08:06:00',
    tone: 'danger',
    icon: <AlertTriangle className="h-3.5 w-3.5" />,
    content: <Badge variant="danger">Requiere corrección</Badge>,
  },
  {
    id: '5',
    title: 'Aceptada',
    author: 'Sistema',
    date: '2026-07-22T16:30:00',
    tone: 'success',
    icon: <Check className="h-3.5 w-3.5" />,
  },
];

export const Historial: Story = () => (
  <div className="max-w-xl">
    <Timeline events={HISTORIAL} now={AHORA} aria-label="Historial de la factura" />
  </div>
);

/** Para paneles laterales: una línea por acontecimiento, sin agrupar. */
export const Compacto: Story = () => (
  <div className="max-w-sm">
    <Timeline events={HISTORIAL} variant="compacto" now={AHORA} />
  </div>
);

/** Sin icono se pinta un punto del color del tono. */
export const SinIconos: Story = () => (
  <div className="max-w-xl">
    <Timeline
      now={AHORA}
      events={HISTORIAL.map(({ icon, ...rest }) => rest)}
    />
  </div>
);

export const Vacio: Story = () => <Timeline events={[]} now={AHORA} />;
