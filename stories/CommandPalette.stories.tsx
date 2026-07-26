import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  FileText,
  Users,
  Package,
  Settings,
  Plus,
  Search as SearchIcon,
  BarChart3,
} from 'lucide-react';
import { CommandPalette, useCommandPalette, type CommandSection } from '../src/components/CommandPalette';
import { Button } from '../src/components/Button';

const SECCIONES: CommandSection[] = [
  {
    key: 'acciones',
    label: 'Acciones',
    items: [
      { id: 'nueva-factura', label: 'Nueva factura', icon: <Plus className="h-4 w-4" />, shortcut: ['Ctrl', 'N'], keywords: 'crear emitir venta', onSelect: () => console.log('nueva factura') },
      { id: 'nuevo-cliente', label: 'Nuevo cliente', icon: <Plus className="h-4 w-4" />, keywords: 'crear alta contacto', onSelect: () => console.log('nuevo cliente') },
      { id: 'nuevo-articulo', label: 'Nuevo artículo', icon: <Plus className="h-4 w-4" />, keywords: 'crear producto', disabled: true, onSelect: () => {} },
    ],
  },
  {
    key: 'ir-a',
    label: 'Ir a',
    items: [
      { id: 'facturas', label: 'Facturas de venta', description: '/ventas/facturas', icon: <FileText className="h-4 w-4" />, onSelect: () => console.log('facturas') },
      { id: 'clientes', label: 'Clientes', description: '/contactos/clientes', icon: <Users className="h-4 w-4" />, onSelect: () => console.log('clientes') },
      { id: 'inventario', label: 'Inventario', description: '/almacen/existencias', icon: <Package className="h-4 w-4" />, keywords: 'stock almacen', onSelect: () => console.log('inventario') },
      { id: 'informes', label: 'Informes', description: '/analitica/informes', icon: <BarChart3 className="h-4 w-4" />, onSelect: () => console.log('informes') },
      { id: 'ajustes', label: 'Ajustes de empresa', description: '/ajustes/empresa', icon: <Settings className="h-4 w-4" />, onSelect: () => console.log('ajustes') },
    ],
  },
  {
    key: 'resultados',
    label: 'Documentos recientes',
    items: [
      { id: 'fac-1', label: 'FAC/2026/0042', description: 'Acme S.L. · 1.240,00 €', icon: <FileText className="h-4 w-4" />, onSelect: () => console.log('fac 42') },
      { id: 'fac-2', label: 'FAC/2026/0041', description: 'Globex · 890,50 €', icon: <FileText className="h-4 w-4" />, onSelect: () => console.log('fac 41') },
    ],
  },
];

/** Ctrl+K la abre; el filtrado es en cliente y por palabras sueltas. */
export const Basica: Story = () => {
  const palette = useCommandPalette();
  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" onClick={palette.openPalette}>
        <SearchIcon className="h-3.5 w-3.5" /> Abrir (o pulsa Ctrl+K)
      </Button>
      <p className="text-[12px] text-[var(--fg-muted,#52606f)]">
        Prueba a escribir «fac acme»: las palabras se buscan por separado, no hace falta teclearlas
        seguidas.
      </p>
      <CommandPalette open={palette.open} onClose={palette.close} sections={SECCIONES} />
    </div>
  );
};

/** Modo servidor: el filtrado lo hace el consumidor. */
export const BusquedaEnServidor: Story = () => {
  const palette = useCommandPalette({ shortcut: false });
  const [term, setTerm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resultados, setResultados] = React.useState<CommandSection[]>(SECCIONES);

  const buscar = React.useCallback((t: string) => {
    setTerm(t);
    setLoading(true);
    setTimeout(() => {
      const q = t.toLowerCase();
      setResultados(
        SECCIONES.map((s) => ({
          ...s,
          items: s.items.filter((i) => i.label.toLowerCase().includes(q)),
        })).filter((s) => s.items.length),
      );
      setLoading(false);
    }, 350);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <Button variant="accent" onClick={palette.openPalette}>
        Abrir paleta
      </Button>
      <p className="text-[11px] font-mono text-[var(--fg-muted,#52606f)]">consulta: «{term}»</p>
      <CommandPalette
        open={palette.open}
        onClose={palette.close}
        sections={resultados}
        onSearch={buscar}
        loading={loading}
        placeholder="Buscar en toda la aplicación…"
      />
    </div>
  );
};
BusquedaEnServidor.storyName = 'Búsqueda en servidor';
