import * as React from 'react';
import type { Story } from '@ladle/react';
import { Stepper, type Step } from '../src/components/Stepper';
import { Button } from '../src/components/Button';

const PASOS: Step[] = [
  { id: 'empresa', label: 'Datos de empresa', description: 'CIF, domicilio y actividad' },
  { id: 'fiscal', label: 'Configuración fiscal', description: 'Régimen y series' },
  { id: 'usuarios', label: 'Usuarios', description: 'Invita a tu equipo' },
  { id: 'listo', label: 'Listo' },
];

export const Asistente: Story = () => {
  const [paso, setPaso] = React.useState(1);
  return (
    <div className="max-w-2xl space-y-6">
      <Stepper steps={PASOS} current={paso} onStepClick={(_, i) => setPaso(i)} />
      <div className="rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] p-6 text-[13px] text-[var(--fg-body,#2d3a4a)]">
        Contenido del paso <strong>{PASOS[paso].label}</strong>. Los pasos ya hechos se pueden
        pulsar para volver; los pendientes no, porque saltar hacia delante se salta la validación
        de los que quedan por medio.
      </div>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={paso === 0} onClick={() => setPaso((p) => p - 1)}>
          Atrás
        </Button>
        <Button
          variant="accent"
          disabled={paso === PASOS.length - 1}
          onClick={() => setPaso((p) => p + 1)}
        >
          Siguiente
        </Button>
      </div>
    </div>
  );
};

/** Un paso puede marcarse como fallido sin mover el actual. */
export const ConError: Story = () => (
  <div className="max-w-2xl">
    <Stepper
      current={2}
      steps={[
        { id: 'a', label: 'Datos de empresa' },
        { id: 'b', label: 'Configuración fiscal', status: 'error', description: 'Falta el IAE' },
        { id: 'c', label: 'Usuarios' },
        { id: 'd', label: 'Listo', disabled: true },
      ]}
    />
  </div>
);

export const Vertical: Story = () => (
  <div className="max-w-sm">
    <Stepper steps={PASOS} current={2} orientation="vertical" />
  </div>
);

export const Pequeno: Story = () => (
  <div className="max-w-xl">
    <Stepper steps={PASOS} current={1} size="sm" />
  </div>
);
