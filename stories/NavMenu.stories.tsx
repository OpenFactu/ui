import * as React from 'react';
import type { Story } from '@ladle/react';
import { Users, Building2, Wallet, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { NavMenu, type NavMenuItem } from '../src/components/NavMenu';

/**
 * El catálogo llega plano, igual que el `subTabs` de cada módulo del platform:
 * los que comparten `group` se pliegan solos bajo un desplegable.
 */
const RRHH: NavMenuItem[] = [
  { id: 'employees', label: 'Empleados', icon: <Users className="h-3.5 w-3.5" /> },
  { id: 'departments', label: 'Departamentos', icon: <Building2 className="h-3.5 w-3.5" /> },

  { id: 'payrolls', label: 'Nóminas', group: 'Nóminas', icon: <Wallet className="h-3.5 w-3.5" /> },
  { id: 'payroll-concepts', label: 'Conceptos de nómina', group: 'Nóminas' },

  { id: 'timeclock', label: 'Mis fichajes', group: 'Tiempo y turnos', status: 'beta' },
  { id: 'kiosks', label: 'Kioskos de fichaje', group: 'Tiempo y turnos', status: 'beta' },
  { id: 'shift-templates', label: 'Plantillas de turno', group: 'Tiempo y turnos', status: 'beta' },
  { id: 'shift-patterns', label: 'Patrones de turno', group: 'Tiempo y turnos', status: 'beta' },
  { id: 'planning', label: 'Planificación', group: 'Tiempo y turnos', status: 'beta' },

  { id: 'incidents', label: 'Incidencias', group: 'Incidencias', status: 'beta' },
  { id: 'incident-types', label: 'Tipos de incidencia', group: 'Incidencias', status: 'beta' },

  { id: 'performance', label: 'Rendimiento', group: 'Avanzado+', status: 'alpha' },
  { id: 'labor-cost', label: 'Coste laboral', group: 'Avanzado+', status: 'alpha' },
  { id: 'gantt', label: 'Gantt', group: 'Avanzado+', status: 'nuevo' },
  { id: 'okr', label: 'Objetivos', group: 'Avanzado+', status: 'pronto', disabled: true },
];

export const Modulo: Story = () => {
  const [activa, setActiva] = React.useState('employees');
  return (
    <div className="space-y-4">
      <div className="rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2">
        <NavMenu items={RRHH} value={activa} onChange={setActiva} aria-label="Recursos humanos" />
      </div>
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Sección activa: <strong className="text-accent">{activa}</strong>. El grupo que la contiene
        se queda resaltado aunque esté plegado.
      </p>
    </div>
  );
};

export const Distintivos: Story = () => {
  const [activa, setActiva] = React.useState('beta');
  return (
    <NavMenu
      value={activa}
      onChange={setActiva}
      items={[
        { id: 'estable', label: 'Estable' },
        { id: 'beta', label: 'En beta', status: 'beta' },
        { id: 'alpha', label: 'En alpha', status: 'alpha' },
        { id: 'nuevo', label: 'Recién salido', status: 'nuevo' },
        { id: 'pronto', label: 'Próximamente', status: 'pronto', disabled: true },
      ]}
    />
  );
};

export const ConDescripciones: Story = () => {
  const [activa, setActiva] = React.useState('cobros');
  return (
    <NavMenu
      value={activa}
      onChange={setActiva}
      items={[
        { id: 'resumen', label: 'Resumen', icon: <TrendingUp className="h-3.5 w-3.5" /> },
        {
          id: 'cobros',
          label: 'Cobros',
          group: 'Tesorería',
          description: 'Remesas SEPA y conciliación',
          icon: <Wallet className="h-3.5 w-3.5" />,
        },
        {
          id: 'pagos',
          label: 'Pagos',
          group: 'Tesorería',
          description: 'Órdenes y vencimientos',
        },
        {
          id: 'fichajes',
          label: 'Fichajes',
          group: 'Control',
          description: 'Entradas y salidas del personal',
          icon: <Clock className="h-3.5 w-3.5" />,
          status: 'beta',
        },
        {
          id: 'avisos',
          label: 'Avisos',
          group: 'Control',
          description: 'Incidencias abiertas',
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
        },
      ]}
    />
  );
};

/** Muchos grupos en poco sitio: la barra se desplaza y el panel no se recorta. */
export const BarraEstrecha: Story = () => {
  const [activa, setActiva] = React.useState('employees');
  return (
    <div className="max-w-md rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2">
      <NavMenu items={RRHH} value={activa} onChange={setActiva} size="sm" />
    </div>
  );
};
