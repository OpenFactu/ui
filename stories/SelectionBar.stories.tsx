import * as React from 'react';
import type { Story } from '@ladle/react';
import { SelectionBar } from '../src/components/SelectionBar';
import { Checkbox } from '../src/components/Checkbox';

const ARCHIVOS = ['Contrato.pdf', 'Factura julio.pdf', 'Albarán 0042.pdf', 'Presupuesto grúa.pdf', 'Acta obra.docx', 'Fotos visita.zip'];

/** La barra no sabe de dónde sale la selección: aquí, una lista sencilla de archivos. */
export const ConUnaLista: Story = () => {
  const [marcados, setMarcados] = React.useState<Set<string>>(new Set());
  const [aviso, setAviso] = React.useState('—');
  const alternar = (a: string) => setMarcados((m) => { const n = new Set(m); if (n.has(a)) n.delete(a); else n.add(a); return n; });
  return (
    <div className="flex max-w-[520px] flex-col gap-3">
      <p className="m-0 text-[13px] text-[var(--fg-muted,#52606f)]">Última acción: <strong>{aviso}</strong></p>
      <ul className="m-0 flex list-none flex-col gap-1 p-0">
        {ARCHIVOS.map((a) => (
          <li key={a} className="rounded-[var(--k-radius-sm,6px)] border border-[var(--border-default,#e2e8f0)] px-3 py-2">
            <Checkbox checked={marcados.has(a)} onChange={() => alternar(a)} label={a} size="sm" />
          </li>
        ))}
      </ul>
      <SelectionBar
        count={marcados.size}
        countLabel={(n) => (n === 1 ? '1 archivo' : `${n} archivos`)}
        onClear={() => setMarcados(new Set())}
        selectAll={marcados.size < ARCHIVOS.length ? { total: ARCHIVOS.length, label: 'Seleccionar todos', onSelect: () => setMarcados(new Set(ARCHIVOS)) } : undefined}
        actions={[
          { label: 'Descargar', onClick: () => setAviso(`descargados ${marcados.size}`) },
          { label: 'Compartir', onClick: () => setAviso(`compartidos ${marcados.size}`) },
          { label: 'Mover', onClick: () => setAviso(`movidos ${marcados.size}`) },
          { label: 'Eliminar', destructive: true, onClick: () => { setAviso(`eliminados ${marcados.size}`); setMarcados(new Set()); } },
        ]}
      />
    </div>
  );
};

/** Con `maxInline` decides cuántas acciones se ven; el resto va a «Más». En móvil se ve una y la barra va fija abajo. */
export const PocasALaVista: Story = () => (
  <SelectionBar
    count={3}
    maxInline={1}
    onClear={() => {}}
    actions={[
      { label: 'Aprobar', onClick: () => {} },
      { label: 'Reasignar', onClick: () => {} },
      { label: 'Archivar', onClick: () => {} },
      { label: 'Rechazar', destructive: true, onClick: () => {} },
    ]}
  />
);
