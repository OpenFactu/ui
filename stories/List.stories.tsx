import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  Download,
  FileText,
  Inbox,
  MessageSquare,
  Paperclip,
  Receipt,
  Trash2,
  Wallet,
} from 'lucide-react';
import { List } from '../src/components/List';
import { Avatar } from '../src/components/Avatar';
import { Badge } from '../src/components/Badge';
import { Button } from '../src/components/Button';
import { Progress } from '../src/components/Progress';

const Frame: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => (
  <div className="max-w-xl">
    {title && (
      <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)] mb-2">
        {title}
      </p>
    )}
    {children}
  </div>
);

/** Lista de navegación con elemento activo y acción al pasar el ratón. */
export const Navegacion: Story = () => {
  const [active, setActive] = React.useState<string | number>('c2');
  return (
    <Frame title="Conversaciones">
      <List
        variant="plain"
        activeId={active}
        items={[
          { id: 'c1', icon: <MessageSquare className="h-4 w-4" />, title: 'Presupuesto Acme' },
          { id: 'c2', icon: <MessageSquare className="h-4 w-4" />, title: 'Incidencia de envío' },
          { id: 'c3', icon: <MessageSquare className="h-4 w-4" />, title: 'Alta de proveedor' },
        ].map((item) => ({
          ...item,
          onClick: () => setActive(item.id),
          actions: [
            { icon: <Trash2 className="h-3.5 w-3.5" />, label: 'Eliminar', tone: 'danger' as const, onClick: () => {} },
          ],
        }))}
      />
    </Frame>
  );
};

/** Adjuntos: icono, nombre, metadatos y dos acciones. */
export const ConAcciones: Story = () => (
  <Frame title="Adjuntos">
    <List
      variant="bordered"
      items={[
        {
          id: 1,
          icon: <Paperclip className="h-4 w-4" />,
          title: 'contrato-marco.pdf',
          subtitle: '248 KB · subido el 12/07/2026',
        },
        {
          id: 2,
          icon: <Paperclip className="h-4 w-4" />,
          title: 'anexo-precios.xlsx',
          subtitle: '64 KB · subido el 14/07/2026',
        },
      ].map((item) => ({
        ...item,
        actions: [
          { icon: <Download className="h-3.5 w-3.5" />, label: 'Descargar', onClick: () => {} },
          { icon: <Trash2 className="h-3.5 w-3.5" />, label: 'Eliminar', tone: 'danger' as const, onClick: () => {} },
        ],
      }))}
    />
  </Frame>
);

/** Agrupada por secciones, el patrón de los documentos vinculados. */
export const PorSecciones: Story = () => (
  <Frame title="Documentos vinculados">
    <List
      variant="bordered"
      sections={[
        {
          key: 'origen',
          label: 'Origen',
          icon: <FileText className="h-3.5 w-3.5" />,
          meta: '1',
          items: [
            {
              id: 'p1',
              title: 'PED/2026/0031',
              subtitle: 'Pedido de venta · 12/07/2026',
              badge: <Badge variant="info">Confirmado</Badge>,
              meta: '1.240,00 €',
              href: '#',
            },
          ],
        },
        {
          key: 'cobros',
          label: 'Cobros',
          icon: <Wallet className="h-3.5 w-3.5" />,
          tone: 'success',
          meta: '2',
          items: [
            { id: 'c1', title: 'Transferencia', subtitle: '20/07/2026 · ES91 •••• 4521', meta: '640,00 €' },
            { id: 'c2', title: 'Efectivo', subtitle: '22/07/2026', meta: '600,00 €' },
          ],
        },
        {
          key: 'asientos',
          label: 'Asientos',
          icon: <Receipt className="h-3.5 w-3.5" />,
          collapsible: true,
          defaultOpen: false,
          items: [{ id: 'a1', title: 'AS/2026/0142', subtitle: 'Diario de ventas', meta: '1.240,00 €' }],
        },
      ]}
    />
  </Frame>
);

/** No leídos, avatares y un bloque libre bajo el texto. */
export const Enriquecida: Story = () => (
  <Frame title="Notificaciones">
    <List
      items={[
        {
          id: 1,
          avatar: <Avatar name="Ana García" size="sm" />,
          title: 'Ana García te ha mencionado',
          description: 'Revisa el presupuesto de Acme antes del viernes, por favor.',
          meta: 'hace 5 min',
          unread: true,
        },
        {
          id: 2,
          status: { tone: 'warning' as const },
          title: 'Stock bajo en 3 artículos',
          subtitle: 'Almacén central',
          meta: 'hace 2 h',
        },
        {
          id: 3,
          status: { tone: 'success' as const },
          title: 'Importación completada',
          subtitle: '1.204 registros',
          meta: 'ayer',
          content: <Progress value={100} variant="success" size="sm" />,
        },
      ]}
    />
  </Frame>
);

/** Selección múltiple con casillas. */
export const Seleccionable: Story = () => {
  const [ids, setIds] = React.useState<Array<string | number>>([2]);
  return (
    <Frame title={`Seleccionados: ${ids.length}`}>
      <List
        variant="bordered"
        selectable
        selectedIds={ids}
        onSelectionChange={setIds}
        items={[
          { id: 1, title: 'Acme S.L.', subtitle: 'B12345678', meta: '12 facturas' },
          { id: 2, title: 'Globex', subtitle: 'B87654321', meta: '4 facturas' },
          { id: 3, title: 'Initech', subtitle: 'B11223344', meta: '31 facturas' },
        ]}
      />
    </Frame>
  );
};

export const CargaYVacio: Story = () => {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <button
        type="button"
        onClick={() => setLoading((v) => !v)}
        className="self-start rounded-[2px] border border-[var(--k-line)] dark:border-slate-700 px-3 py-1.5 text-[12px] text-[var(--fg-body,#2d3a4a)] dark:text-slate-300 hover:border-accent transition-colors"
      >
        {loading ? 'Terminar carga' : 'Volver a cargar'}
      </button>
      <List
        variant="bordered"
        isLoading={loading}
        skeletonCount={4}
        items={[]}
        emptyState={{
          icon: <Inbox className="h-8 w-8" />,
          title: 'No hay mensajes',
          hint: 'Cuando recibas uno aparecerá aquí.',
          action: <Button variant="accent" size="sm">Redactar</Button>,
        }}
      />
    </div>
  );
};
CargaYVacio.storyName = 'Carga y vacío';

/** Composición manual cuando el modo declarativo se queda corto. */
export const Composicion: Story = () => (
  <Frame title="API de composición">
    <List variant="bordered">
      <List.Item
        id="a"
        leading={<Avatar name="Keirost SL" size="sm" />}
        title="Keirost S.L."
        subtitle="Empresa activa"
        trailing={<Badge variant="teal">Actual</Badge>}
      />
      <List.Item
        id="b"
        leading={<Avatar name="Otra Empresa" size="sm" />}
        title="Otra Empresa S.A."
        subtitle="Sin actividad"
      />
    </List>
  </Frame>
);
