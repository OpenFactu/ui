import * as React from 'react';
import type { Story } from '@ladle/react';
import { PageTransition } from '../src/components/PageTransition';
import { AnimatedList } from '../src/components/AnimatedList';
import { SortableList } from '../src/components/SortableList';
import { Accordion } from '../src/components/Accordion';
import { Collapse } from '../src/components/Collapse';
import { Tabs } from '../src/components/Tabs';
import { Button } from '../src/components/Button';

export const Paginas: Story = () => {
  const [page, setPage] = React.useState('a');
  const [mode, setMode] = React.useState<'rise' | 'slide' | 'fade'>('rise');
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <Tabs items={[{ key: 'a', label: 'Resumen' }, { key: 'b', label: 'Facturas' }, { key: 'c', label: 'Ajustes' }]} value={page} onChange={setPage} />
      <div className="flex gap-2">{(['rise', 'slide', 'fade'] as const).map((m) => <Button key={m} size="sm" variant={mode === m ? 'primary' : 'secondary'} onClick={() => setMode(m)}>{m}</Button>)}</div>
      <PageTransition transitionKey={page} mode={mode} className="rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] p-5">
        <h3 className="m-0 mb-2 text-[16px] font-semibold">Página {page.toUpperCase()}</h3>
        <p className="m-0 text-[13px] text-[var(--fg-muted,#52606f)]">El contenido anterior sale y entra el nuevo con los muelles del tema.</p>
      </PageTransition>
    </div>
  );
};

export const ListaAnimada: Story = () => {
  const [items, setItems] = React.useState([{ id: 1, name: 'Factura 2026-001' }, { id: 2, name: 'Factura 2026-002' }, { id: 3, name: 'Factura 2026-003' }]);
  const next = React.useRef(4);
  return (
    <div className="flex max-w-sm flex-col gap-3">
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setItems((l) => [{ id: next.current, name: `Factura 2026-00${next.current++}` }, ...l])}>Añadir arriba</Button>
        <Button size="sm" variant="secondary" onClick={() => setItems((l) => [...l].reverse())}>Invertir</Button>
        <Button size="sm" variant="secondary" onClick={() => setItems((l) => [...l].sort(() => Math.random() - 0.5))}>Mezclar</Button>
      </div>
      <AnimatedList className="flex flex-col gap-2">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2.5 text-[13px]">
            {item.name}
            <button type="button" className="text-[var(--k-danger-fg,#b91c1c)]" onClick={() => setItems((l) => l.filter((x) => x.id !== item.id))}>Quitar</button>
          </div>
        ))}
      </AnimatedList>
    </div>
  );
};

export const ListaOrdenable: Story = () => {
  const [items, setItems] = React.useState(['Cliente', 'Fecha', 'Importe', 'Estado', 'Responsable']);
  return (
    <div className="max-w-sm">
      <p className="mb-3 mt-0 text-[12px] text-[var(--fg-muted,#52606f)]">Arrastra el asa. Con teclado: Alt + ↑ / ↓.</p>
      <SortableList
        items={items}
        getKey={(i) => i}
        onReorder={setItems}
        className="flex flex-col gap-2"
        renderItem={(item, { handleProps }) => (
          <div className="flex items-center gap-3 rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2.5 text-[13px]">
            <span {...handleProps} role="button" className={`${handleProps.className} select-none text-[var(--fg-subtle,#657486)]`}>⠿</span>
            {item}
          </div>
        )}
      />
    </div>
  );
};

export const Desplegables: Story = () => {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex max-w-md flex-col gap-5">
      <Accordion type="multiple" defaultOpenKeys={['a']} items={[
        { key: 'a', title: '¿Cómo emito una factura?', content: 'Desde Facturas, pulsa «Nueva» y completa cliente, líneas e impuestos. Al guardar se calcula la huella.' },
        { key: 'b', title: '¿Y si la administración la rechaza?', content: 'Verás el motivo en el estado del documento. Corrígelo y reenvía: se genera una subsanación enlazada.' },
        { key: 'c', title: '¿Puedo exportar a Excel?', content: 'Sí, desde el menú de acciones de cualquier listado, con los filtros aplicados.' },
      ]} />
      <div>
        <Button size="sm" variant="secondary" onClick={() => setOpen((v) => !v)}>{open ? 'Ocultar' : 'Mostrar'} detalles</Button>
        <Collapse open={open}><p className="m-0 pt-3 text-[13px] text-[var(--fg-body,#2d3a4a)]">Contenido que se despliega animando su altura con el muelle del tema, sin medirlo.</p></Collapse>
      </div>
    </div>
  );
};
