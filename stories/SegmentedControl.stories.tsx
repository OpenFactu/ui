import * as React from 'react';
import type { Story } from '@ladle/react';
import { Calendar, LayoutGrid, List as ListIcon, Map, Satellite } from 'lucide-react';
import { SegmentedControl } from '../src/components/SegmentedControl';
import { Tabs } from '../src/components/Tabs';

/** El control de la captura: filtro de periodo del panel de inicio. */
export const Basico: Story = () => {
  const [scope, setScope] = React.useState<'active' | 'all'>('active');
  return (
    <div className="flex flex-col gap-3">
      <SegmentedControl
        size="sm"
        uppercase
        aria-label="Ámbito del periodo"
        value={scope}
        onChange={setScope}
        options={[
          { value: 'active', label: 'Periodo activo' },
          { value: 'all', label: 'Histórico' },
        ]}
      />
      <p className="text-[11px] font-mono text-[var(--fg-muted,#64748b)]">scope = {scope}</p>
    </div>
  );
};

export const Variantes: Story = () => {
  const [a, setA] = React.useState('week');
  const [b, setB] = React.useState('visual');
  const [c, setC] = React.useState('map');
  const [d, setD] = React.useState('list');

  const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#94a3b8)] mb-2">
      {children}
    </p>
  );

  return (
    <div className="flex flex-col gap-7">
      <div>
        <Label>solid · md (por defecto)</Label>
        <SegmentedControl
          aria-label="Escala del calendario"
          value={a}
          onChange={setA}
          options={[
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mes' },
            { value: 'quarter', label: 'Trimestre', disabled: true },
          ]}
        />
      </div>
      <div>
        <Label>raised · pastilla elevada sobre pista</Label>
        <SegmentedControl
          variant="raised"
          aria-label="Modo del editor"
          value={b}
          onChange={setB}
          options={[
            { value: 'visual', label: 'Visual', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            { value: 'code', label: 'Avanzado', icon: <ListIcon className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>
      <div>
        <Label>solid · sm · versales · con iconos</Label>
        <SegmentedControl
          size="sm"
          uppercase
          aria-label="Capa del mapa"
          value={c}
          onChange={setC}
          options={[
            { value: 'map', label: 'Mapa', icon: <Map className="h-3 w-3" /> },
            { value: 'sat', label: 'Satélite', icon: <Satellite className="h-3 w-3" /> },
          ]}
        />
      </div>
      <div className="max-w-md">
        <Label>fullWidth</Label>
        <SegmentedControl
          fullWidth
          aria-label="Vista"
          value={d}
          onChange={setD}
          options={[
            { value: 'list', label: 'Lista', icon: <ListIcon className="h-3.5 w-3.5" /> },
            { value: 'grid', label: 'Tarjetas', icon: <LayoutGrid className="h-3.5 w-3.5" /> },
            { value: 'cal', label: 'Calendario', icon: <Calendar className="h-3.5 w-3.5" /> },
          ]}
        />
      </div>
      <div>
        <Label>deshabilitado</Label>
        <SegmentedControl
          disabled
          aria-label="Deshabilitado"
          value="a"
          onChange={() => {}}
          options={[
            { value: 'a', label: 'Uno' },
            { value: 'b', label: 'Dos' },
          ]}
        />
      </div>
    </div>
  );
};

/**
 * Mismo aspecto, distinto significado: `SegmentedControl` es un filtro (grupo
 * de radio) y `Tabs variant="segmented"` intercambia vistas (pestañas). Se
 * anuncian distinto a los lectores de pantalla.
 */
export const FrenteATabs: Story = () => {
  const [filtro, setFiltro] = React.useState('active');
  const [vista, setVista] = React.useState('reglas');
  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)] mb-1">
          SegmentedControl — filtra los datos que se muestran
        </p>
        <p className="text-[11px] text-[var(--fg-muted,#64748b)] mb-2 font-mono">role="radiogroup"</p>
        <SegmentedControl
          size="sm"
          uppercase
          aria-label="Periodo"
          value={filtro}
          onChange={setFiltro}
          options={[
            { value: 'active', label: 'Periodo activo' },
            { value: 'all', label: 'Histórico' },
          ]}
        />
      </div>
      <div>
        <p className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)] mb-1">
          Tabs variant="segmented" — intercambia paneles
        </p>
        <p className="text-[11px] text-[var(--fg-muted,#64748b)] mb-2 font-mono">role="tablist"</p>
        <Tabs
          variant="segmented"
          value={vista}
          onChange={setVista}
          items={[
            { key: 'reglas', label: 'Reglas' },
            { key: 'acumulados', label: 'Acumulados' },
          ]}
        />
        <p className="mt-3 text-[13px] text-[var(--fg-body,#2d3a4a)]">
          Panel de <strong>{vista}</strong>
        </p>
      </div>
    </div>
  );
};
FrenteATabs.storyName = 'Frente a Tabs';
