import * as React from 'react';
import type { Story } from '@ladle/react';
import { DatePicker } from '../src/components/DatePicker';

export const Basico: Story = () => {
  const [value, setValue] = React.useState<string | null>(null);
  return (
    <div className="max-w-xs">
      <DatePicker label="Fecha de factura" value={value} onChange={setValue} clearable />
      <p className="mt-3 text-[11px] font-mono text-[var(--fg-muted,#52606f)] dark:text-slate-400">
        value: {value ?? 'null'}
      </p>
    </div>
  );
};

export const ConLimites: Story = () => {
  const [value, setValue] = React.useState<string | null>('2026-07-15');
  return (
    <div className="max-w-xs">
      <DatePicker
        label="Solo julio 2026"
        value={value}
        onChange={setValue}
        min="2026-07-01"
        max="2026-07-31"
        helperText="Los días fuera del rango están deshabilitados."
      />
    </div>
  );
};
ConLimites.storyName = 'Con límites min/max';

export const Estados: Story = () => (
  <div className="flex flex-col gap-6 max-w-xs">
    <DatePicker label="Con error" value={null} onChange={() => {}} error="La fecha es obligatoria." />
    <DatePicker label="Deshabilitado" value="2026-01-01" onChange={() => {}} disabled />
  </div>
);

/**
 * Click en el mes abre la rejilla de meses; click en el año, la de años.
 * Desde la de años se baja a meses y de ahí a días: dos clicks para saltar
 * a cualquier fecha, por lejana que esté.
 */
export const NavegacionRapida: Story = () => {
  const [value, setValue] = React.useState<string | null>('2026-07-25');
  return (
    <div className="max-w-xs flex flex-col gap-3">
      <DatePicker label="Fecha de nacimiento" value={value} onChange={setValue} />
      <p className="text-[11px] text-[var(--fg-muted,#52606f)] dark:text-slate-400">
        Abre el calendario y pulsa sobre «2026» para saltar de década.
      </p>
    </div>
  );
};
NavegacionRapida.storyName = 'Navegación rápida de mes/año';

/** Se puede abrir directamente en la rejilla de años. */
export const AbreEnAnos: Story = () => {
  const [value, setValue] = React.useState<string | null>(null);
  return (
    <div className="max-w-xs">
      <DatePicker
        label="Año de constitución"
        value={value}
        onChange={setValue}
        initialView="years"
        yearRange={[1950, 2030]}
        hideFooter
      />
    </div>
  );
};
AbreEnAnos.storyName = 'Abre en la vista de años';

/** Semana empezando en domingo y textos en otro idioma. */
export const OtroLocale: Story = () => {
  const [value, setValue] = React.useState<string | null>('2026-07-25');
  return (
    <div className="max-w-xs">
      <DatePicker
        label="Date"
        value={value}
        onChange={setValue}
        weekStartsOn={0}
        clearable
        locale={{
          months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
          monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
          weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
          today: 'Today',
          clear: 'Clear',
        }}
      />
    </div>
  );
};
OtroLocale.storyName = 'Otro idioma / semana en domingo';
