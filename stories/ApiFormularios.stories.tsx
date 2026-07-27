import * as React from 'react';
import type { Story } from '@ladle/react';
import { Plus, Inbox } from 'lucide-react';
import { Checkbox } from '../src/components/Checkbox';
import { Select } from '../src/components/Select';
import { SearchableSelect } from '../src/components/SearchableSelect';
import { DatePicker } from '../src/components/DatePicker';
import { Input } from '../src/components/Input';
import { Textarea } from '../src/components/Textarea';
import { Table } from '../src/components/Table';
import { Badge } from '../src/components/Badge';
import { Button } from '../src/components/Button';

const PAISES = [
  { value: 'es', label: 'España' },
  { value: 'pt', label: 'Portugal' },
  { value: 'fr', label: 'Francia' },
];

/** Los cinco controles con `required`: marca visible y `aria-required`. */
export const Obligatorios: Story = () => {
  const [sel, setSel] = React.useState('');
  const [busc, setBusc] = React.useState('');
  const [fecha, setFecha] = React.useState('');
  return (
    <div className="grid max-w-md gap-4">
      <Input label="Razón social" required placeholder="Acme S.L." />
      <Textarea label="Observaciones" required placeholder="…" />
      <Select label="País" required value={sel} onChange={setSel} options={PAISES} />
      <SearchableSelect
        label="Almacén"
        required
        value={busc}
        onChange={setBusc}
        options={[
          { value: 'a', label: 'Almacén central' },
          { value: 'b', label: 'Tienda Norte' },
        ]}
        helperText="Se usa para las salidas de stock."
      />
      <DatePicker
        label="Fecha de emisión"
        required
        value={fecha}
        onChange={(v) => setFecha(v ?? "")}
      />
    </div>
  );
};

/** `Checkbox` y `SearchableSelect` ya traen etiqueta propia. */
export const Etiquetas: Story = () => {
  const [a, setA] = React.useState(true);
  const [b, setB] = React.useState(false);
  const [v, setV] = React.useState('');
  return (
    <div className="grid max-w-md gap-4">
      <Checkbox checked={a} onChange={setA} label="Recargo de equivalencia" />
      <Checkbox
        checked={b}
        onChange={setB}
        label="Enviar copia por correo"
        description="Se manda al contacto principal en cuanto se valide la factura."
      />
      <Checkbox checked={b} onChange={setB} size="sm" label="Etiqueta pequeña" required />
      <SearchableSelect
        label="Serie"
        value={v}
        onChange={setV}
        options={[{ value: 'f', label: 'FAC — Facturas de venta' }]}
        error={v ? undefined : 'Elige una serie.'}
      />
    </div>
  );
};

const FILAS = [
  { id: 1, codigo: 'GEN-000001', nombre: 'Tornillos de 10 cm', asignada: true },
  { id: 2, codigo: 'GEN-000002', nombre: 'Tuercas M8', asignada: false },
  { id: 3, codigo: 'GEN-000013', nombre: 'Caja de cartón', asignada: false },
];

/** `rowClassName` y `emptyMessage` como nodo: lo que bloqueaba migrar tablas. */
export const TablaConEstadoPorFila: Story = () => {
  const [sel, setSel] = React.useState(2);
  return (
    <div className="space-y-6">
      <Table
        data={FILAS}
        onRowClick={(f) => setSel(f.id)}
        rowClassName={(f) =>
          f.asignada
            ? 'opacity-50 line-through'
            : f.id === sel
              ? 'ring-1 ring-inset ring-accent'
              : undefined
        }
        columns={[
          { header: 'Código', accessor: 'codigo' },
          { header: 'Nombre', accessor: 'nombre', primary: true },
          {
            header: 'Estado',
            accessor: (f) =>
              f.asignada ? (
                <Badge variant="neutral">Asignada</Badge>
              ) : (
                <Badge variant="success">Libre</Badge>
              ),
          },
        ]}
      />

      <Table
        data={[]}
        columns={[{ header: 'Código', accessor: 'codigo' }]}
        emptyMessage={
          <div className="flex flex-col items-center gap-2 py-4">
            <Inbox className="h-6 w-6 text-[var(--fg-subtle,#657486)]" />
            <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
              Todavía no hay lotes asignados.
            </p>
            <Button size="sm" variant="accent">
              <Plus className="h-3.5 w-3.5" /> Asignar el primero
            </Button>
          </div>
        }
      />
    </div>
  );
};

/** `danger` es el nombre bueno; `error` sigue valiendo. Pintan igual. */
export const VariantesDeBadge: Story = () => (
  <div className="flex flex-wrap items-center gap-2">
    <Badge variant="success">success</Badge>
    <Badge variant="warning">warning</Badge>
    <Badge variant="danger">danger</Badge>
    <Badge variant="error">error</Badge>
    <Badge variant="info">info</Badge>
    <Badge variant="accent">accent</Badge>
    <Badge variant="teal">teal</Badge>
    <Badge variant="neutral">neutral</Badge>
  </div>
);
