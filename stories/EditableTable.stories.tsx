import * as React from 'react';
import type { Story } from '@ladle/react';
import { EditableTable, type EditableColumn } from '../src/components/EditableTable';
import { Badge } from '../src/components/Badge';
import { Card } from '../src/components/Card';

const money = (v: number) => `${v.toFixed(2)} €`;

// ── Caso 1: mantenimiento con edición por filas ────────────────────────

interface Impuesto {
  id: number;
  codigo: string;
  nombre: string;
  tipo: number;
  activo: boolean;
}

const IMPUESTOS: Impuesto[] = [
  { id: 1, codigo: 'IVA21', nombre: 'IVA general', tipo: 21, activo: true },
  { id: 2, codigo: 'IVA10', nombre: 'IVA reducido', tipo: 10, activo: true },
  { id: 3, codigo: 'IVA4', nombre: 'IVA superreducido', tipo: 4, activo: true },
  { id: 4, codigo: 'IVA0', nombre: 'Exento', tipo: 0, activo: false },
];

/**
 * El patrón de mantenimiento: se edita una fila entera, con Guardar y
 * Cancelar. Intro guarda y Escape cancela.
 */
export const PorFilas: Story = () => {
  const [datos, setDatos] = React.useState(IMPUESTOS);
  const [ultimo, setUltimo] = React.useState('—');

  const columnas: Array<EditableColumn<Impuesto>> = [
    { header: 'Código', accessor: 'codigo', primary: true, width: '120px', editor: { type: 'text' } },
    { header: 'Nombre', accessor: 'nombre', editor: { type: 'text' } },
    {
      header: 'Tipo',
      accessor: (i) => `${i.tipo} %`,
      field: 'tipo',
      align: 'right',
      width: '120px',
      editor: { type: 'percent' },
    },
    {
      header: 'Activo',
      accessor: 'activo',
      align: 'center',
      width: '90px',
      cell: (i) => (i.activo ? <Badge variant="success">Sí</Badge> : <Badge variant="neutral">No</Badge>),
      editor: { type: 'checkbox' },
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[12px] text-[var(--fg-muted,#52606f)]">
        Última acción: <strong>{ultimo}</strong>
      </p>
      <EditableTable
        columns={columnas}
        data={datos}
        onAddRow={() => {
          const nuevo: Impuesto = {
            id: Date.now(),
            codigo: '',
            nombre: '',
            tipo: 0,
            activo: true,
          };
          setDatos((prev) => [...prev, nuevo]);
          return nuevo;
        }}
        onSave={(fila) => {
          setDatos((prev) => prev.map((r) => (r.id === fila.id ? fila : r)));
          setUltimo(`guardado ${fila.codigo || '(sin código)'}`);
        }}
        onDelete={(fila) => {
          setDatos((prev) => prev.filter((r) => r.id !== fila.id));
          setUltimo(`eliminado ${fila.codigo}`);
        }}
      />
    </div>
  );
};
PorFilas.storyName = 'Edición por filas';

// ── Caso 2: editor de líneas de documento ──────────────────────────────

interface Linea {
  id: number;
  articulo: string;
  cantidad: number;
  precio: number;
  descuento: number;
  /** Las líneas que vienen de un pedido no se pueden tocar. */
  origen?: string;
}

const ARTICULOS = [
  { value: 'ART-001', label: 'Portátil 14"' },
  { value: 'ART-002', label: 'Monitor 27"' },
  { value: 'ART-003', label: 'Teclado mecánico' },
  { value: 'ART-004', label: 'Ratón inalámbrico' },
];

const total = (l: Linea) => l.cantidad * l.precio * (1 - l.descuento / 100);

/**
 * El editor de líneas: cada celda escribe al momento, sin botones, con la
 * fila de totales al pie y la fila de añadir. Las líneas que vienen de un
 * pedido salen bloqueadas.
 */
export const PorCeldas: Story = () => {
  const [lineas, setLineas] = React.useState<Linea[]>([
    { id: 1, articulo: 'ART-001', cantidad: 2, precio: 899, descuento: 0, origen: 'PED/2026/0031' },
    { id: 2, articulo: 'ART-002', cantidad: 3, precio: 249.9, descuento: 5 },
    { id: 3, articulo: 'ART-003', cantidad: 1, precio: 89.5, descuento: 0 },
  ]);

  const bloqueada = (l: Linea) => !!l.origen;

  const columnas: Array<EditableColumn<Linea>> = [
    {
      header: 'Artículo',
      accessor: (l) => ARTICULOS.find((a) => a.value === l.articulo)?.label ?? l.articulo,
      field: 'articulo',
      editor: { type: 'search-select', options: ARTICULOS, placeholder: 'Buscar artículo…' },
      isDisabled: bloqueada,
    },
    {
      header: 'Cantidad',
      accessor: 'cantidad',
      align: 'right',
      width: '124px',
      editor: { type: 'number', precision: 2, min: 0 },
      isDisabled: bloqueada,
    },
    {
      header: 'Precio',
      accessor: (l) => money(l.precio),
      field: 'precio',
      align: 'right',
      width: '130px',
      editor: { type: 'currency' },
      isDisabled: bloqueada,
    },
    {
      header: 'Dto.',
      accessor: (l) => `${l.descuento} %`,
      field: 'descuento',
      align: 'right',
      width: '128px',
      editor: { type: 'percent' },
      isDisabled: bloqueada,
    },
    {
      header: 'Importe',
      accessor: (l) => money(total(l)),
      align: 'right',
      width: '120px',
    },
  ];

  const suma = lineas.reduce((acc, l) => acc + total(l), 0);

  return (
    <Card title="Líneas del documento" noPadding>
      <EditableTable
        mode="cell"
        density="compact"
        columns={columnas}
        data={lineas}
        isRowEditable={() => true}
        onChange={(fila) => setLineas((prev) => prev.map((l) => (l.id === fila.id ? fila : l)))}
        onDelete={(fila) => setLineas((prev) => prev.filter((l) => l.id !== fila.id))}
        onAddRow={() => {
          const nueva: Linea = {
            id: Date.now(),
            articulo: '',
            cantidad: 1,
            precio: 0,
            descuento: 0,
          };
          setLineas((prev) => [...prev, nueva]);
          return nueva;
        }}
        summaryRow={() => [null, null, null, null, money(suma)]}
        className="border-0"
      />
    </Card>
  );
};
PorCeldas.storyName = 'Editor de líneas (celda a celda)';

/** Las columnas sin `editor` siguen siendo de solo lectura al editar. */
export const SoloAlgunasColumnas: Story = () => {
  const [datos, setDatos] = React.useState(IMPUESTOS.slice(0, 3));
  return (
    <EditableTable
      columns={[
        { header: 'Código', accessor: 'codigo', primary: true, width: '120px' },
        { header: 'Nombre', accessor: 'nombre', editor: { type: 'text' } },
        {
          header: 'Tipo',
          accessor: (i) => `${i.tipo} %`,
          field: 'tipo',
          align: 'right',
          width: '110px',
          editor: { type: 'percent' },
        },
      ]}
      data={datos}
      onSave={(fila) => setDatos((prev) => prev.map((r) => (r.id === fila.id ? fila : r)))}
    />
  );
};
SoloAlgunasColumnas.storyName = 'Solo algunas columnas editables';
