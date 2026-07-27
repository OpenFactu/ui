import * as React from 'react';
import type { Story } from '@ladle/react';
import { Package, Users, FileText, Plus, Settings } from 'lucide-react';
import { CommandPalette, useCommandPalette, type CommandSection } from '../src/components/CommandPalette';
import { SearchTrigger } from '../src/components/SearchTrigger';

const ARTICULOS = [
  { id: 'a1', label: 'Tornillos de 10 cm', meta: 'GEN-000001' },
  { id: 'a2', label: 'Tuercas M8', meta: 'GEN-000002' },
  { id: 'a3', label: 'Caja de cartón', meta: 'GEN-000013' },
];
const INTERLOCUTORES = [
  { id: 'i1', label: 'Construcciones Acme S.L.', meta: 'B12345678' },
  { id: 'i2', label: 'Talleres del Norte', meta: 'B87654321' },
];
const DOCUMENTOS = [
  { id: 'd1', label: 'FAC/2026/0042', meta: '1.240,00 €' },
  { id: 'd2', label: 'ALB/2026/0117', meta: '312,50 €' },
];

/**
 * La cabecera reproducida: caja con lupa y chip Ctrl+K que abre la paleta, y
 * dentro las secciones con el código alineado a la derecha.
 */
export const Cabecera: Story = () => {
  const paleta = useCommandPalette();
  const [ultimo, setUltimo] = React.useState('—');
  // Como el buscador real: la búsqueda la resuelve quien consume, no la paleta.
  const [term, setTerm] = React.useState('');
  const casa = (texto: string) =>
    !term || texto.toLowerCase().includes(term.toLowerCase());

  const todas: CommandSection[] = [
    {
      key: 'acciones',
      label: 'Acciones',
      icon: <Plus className="h-3 w-3" />,
      items: [
        {
          id: 'nueva-factura',
          label: 'Nueva factura',
          icon: <FileText className="h-4 w-4" />,
          shortcut: ['Ctrl', 'N'],
          keywords: 'crear emitir venta',
          onSelect: () => setUltimo('Nueva factura'),
        },
        {
          id: 'ajustes',
          label: 'Ajustes de empresa',
          icon: <Settings className="h-4 w-4" />,
          keywords: 'configuración empresa',
          onSelect: () => setUltimo('Ajustes'),
        },
      ],
    },
    {
      key: 'articulos',
      label: 'Artículos',
      icon: <Package className="h-3 w-3" />,
      action: { label: 'Ver todos', onSelect: () => setUltimo('Listado de artículos') },
      items: ARTICULOS.map((a) => ({
        id: a.id,
        label: a.label,
        meta: a.meta,
        keywords: a.meta,
        onSelect: () => setUltimo(a.label),
      })),
    },
    {
      key: 'interlocutores',
      label: 'Interlocutores',
      icon: <Users className="h-3 w-3" />,
      action: { label: 'Ver todos', onSelect: () => setUltimo('Listado de interlocutores') },
      items: INTERLOCUTORES.map((i) => ({
        id: i.id,
        label: i.label,
        meta: i.meta,
        keywords: i.meta,
        onSelect: () => setUltimo(i.label),
      })),
    },
    {
      key: 'documentos',
      label: 'Documentos',
      icon: <FileText className="h-3 w-3" />,
      items: DOCUMENTOS.map((d) => ({
        id: d.id,
        label: d.label,
        meta: d.meta,
        onSelect: () => setUltimo(d.label),
      })),
    },
  ];

  const secciones = term
    ? todas
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => casa(`${i.label} ${i.meta ?? ''} ${i.keywords ?? ''}`)),
        }))
        .filter((s) => s.items.length > 0)
    : [];

  return (
    <div className="space-y-4">
      {/* Cabecera de la aplicación. */}
      <div className="flex items-center gap-3 rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2">
        <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--fg-subtle,#657486)]">
          Keirost
        </span>
        <div className="max-w-md flex-1">
          <SearchTrigger
            onOpen={paleta.openPalette}
            placeholder="Buscar interlocutores, artículos o documentos…"
          />
        </div>
      </div>

      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Pulsa la caja, escribe con el foco puesto en ella, o usa Ctrl+K. Último resultado abierto:{' '}
        <strong className="text-accent">{ultimo}</strong>
      </p>

      <CommandPalette
        open={paleta.open}
        onClose={paleta.close}
        sections={secciones}
        onSearch={setTerm}
        recentKey="story-buscador-global"
        emptyMessage={term ? 'Sin resultados' : 'Escribe para buscar'}
        placeholder="Buscar interlocutores, artículos o documentos…"
      />
    </div>
  );
};

/** Búsqueda en servidor: el filtrado lo hace quien consume, no la paleta. */
export const EnServidor: Story = () => {
  const paleta = useCommandPalette({ shortcut: false });
  const [term, setTerm] = React.useState('');
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!term) return;
    setLoading(true);
    const t = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(t);
  }, [term]);

  const encontrados = ARTICULOS.filter((a) =>
    `${a.label} ${a.meta}`.toLowerCase().includes(term.toLowerCase()),
  );

  return (
    <div className="max-w-md space-y-3">
      <SearchTrigger onOpen={paleta.openPalette} placeholder="Buscar artículos…" shortcut={false} />
      <CommandPalette
        open={paleta.open}
        onClose={paleta.close}
        onSearch={setTerm}
        loading={loading}
        sections={
          term && !loading
            ? [
                {
                  key: 'articulos',
                  label: 'Artículos',
                  icon: <Package className="h-3 w-3" />,
                  items: encontrados.map((a) => ({
                    id: a.id,
                    label: a.label,
                    meta: a.meta,
                    onSelect: () => {},
                  })),
                },
              ]
            : []
        }
        emptyMessage={term ? 'Sin resultados' : 'Escribe para buscar'}
      />
    </div>
  );
};
