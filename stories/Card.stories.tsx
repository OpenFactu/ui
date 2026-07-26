import * as React from 'react';
import type { Story } from '@ladle/react';
import { Card } from '../src/components/Card';
import { Button } from '../src/components/Button';

export const Basica: Story = () => (
  <div className="max-w-lg">
    <Card title="Datos fiscales" subtitle="Se usan en todos los documentos emitidos.">
      <p className="text-[13px] text-[var(--k-ink-700)] dark:text-slate-300">
        Acme S.L. · B12345678 · Calle Mayor 1, Madrid
      </p>
    </Card>
  </div>
);

export const ConPieYAccion: Story = () => (
  <div className="max-w-lg">
    <Card
      title="Serie de facturación"
      subtitle="Numeración correlativa obligatoria."
      headerAction={<Button variant="secondary" size="sm">Editar</Button>}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm">Cancelar</Button>
          <Button variant="accent" size="sm">Guardar</Button>
        </div>
      }
    >
      <p className="text-[13px] text-[var(--k-ink-700)] dark:text-slate-300">FAC/2026/####</p>
    </Card>
  </div>
);
ConPieYAccion.storyName = 'Con pie y acción';

export const Carga: Story = () => {
  const [loading, setLoading] = React.useState(true);
  return (
    <div className="flex flex-col gap-4 max-w-lg">
      <button
        type="button"
        onClick={() => setLoading((v) => !v)}
        className="self-start rounded-[2px] border border-[var(--k-line)] dark:border-slate-700 px-3 py-1.5 text-[12px] text-[var(--k-ink-700)] dark:text-slate-300 hover:border-accent transition-colors"
      >
        {loading ? 'Mostrar datos' : 'Volver a cargar'}
      </button>
      <Card isLoading={loading} title="Datos fiscales" subtitle="Se usan en todos los documentos.">
        <p className="text-[13px] text-[var(--k-ink-700)] dark:text-slate-300">
          Acme S.L. · B12345678 · Calle Mayor 1, Madrid. Régimen general de IVA.
        </p>
      </Card>
      <Card isLoading={loading} skeleton="list" skeletonLines={3} title="Últimos movimientos">
        <p className="text-[13px]">Contenido real</p>
      </Card>
    </div>
  );
};
