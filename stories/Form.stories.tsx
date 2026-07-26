import * as React from 'react';
import type { Story } from '@ladle/react';
import { Field, FormGrid, FormRow, FormSection } from '../src/components/Form';
import { Input } from '../src/components/Input';
import { Textarea } from '../src/components/Textarea';
import { Select } from '../src/components/Select';
import { Switch } from '../src/components/Switch';
import { CurrencyInput } from '../src/components/NumberInput';
import { DatePicker } from '../src/components/DatePicker';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';

/** `Field` envuelve cualquier control, también los que no son de la librería. */
export const Basico: Story = () => (
  <div className="max-w-md flex flex-col gap-5">
    <Field label="Razón social" required>
      <Input defaultValue="Acme S.L." />
    </Field>
    <Field label="Notas" hint="Solo visible para tu equipo.">
      <Textarea rows={3} />
    </Field>
    <Field label="CIF" error="El formato no es válido.">
      <Input defaultValue="12345678" />
    </Field>
    <Field label="Control ajeno a la librería" hint="Un <input> corriente.">
      <input
        className="w-full rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-3 py-2 text-[13px] text-[var(--fg-default,#0a1628)]"
        defaultValue="También queda enlazado con su etiqueta"
      />
    </Field>
  </div>
);

export const TamanosDeEtiqueta: Story = () => (
  <div className="max-w-md flex flex-col gap-5">
    <Field label="md · por defecto" labelSize="md">
      <Input />
    </Field>
    <Field label="sm · formularios densos" labelSize="sm">
      <Input inputSize="sm" />
    </Field>
    <Field label="micro · rejillas de datos" labelSize="micro">
      <Input inputSize="sm" />
    </Field>
    <Field label="Horizontal" orientation="horizontal" hint="La etiqueta va al lado.">
      <Input />
    </Field>
  </div>
);
TamanosDeEtiqueta.storyName = 'Tamaños de etiqueta';

/** Una ficha completa: secciones, rejilla y campos a todo el ancho. */
export const FichaCompleta: Story = () => {
  const [activo, setActivo] = React.useState(true);
  const [fecha, setFecha] = React.useState<string | null>('2026-07-26');
  const [importe, setImporte] = React.useState<number | null>(1240);

  return (
    <div className="max-w-3xl">
      <Card
        title="Ficha de cliente"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm">
              Cancelar
            </Button>
            <Button variant="accent" size="sm">
              Guardar
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-6">
          <FormSection title="Identificación" description="Datos que aparecen en las facturas.">
            <FormGrid>
              <Field label="Razón social" required>
                <Input defaultValue="Acme S.L." />
              </Field>
              <Field label="CIF" required>
                <Input defaultValue="B12345678" />
              </Field>
              <FormRow>
                <Field label="Dirección">
                  <Input defaultValue="Calle Mayor 1, 28013 Madrid" />
                </Field>
              </FormRow>
            </FormGrid>
          </FormSection>

          <FormSection
            title="Condiciones comerciales"
            description="Se aplican por defecto a los documentos nuevos."
            divider
          >
            <FormGrid columns={3}>
              <Field label="Forma de pago">
                <Select
                  value="30"
                  onChange={() => {}}
                  options={[
                    { value: '30', label: '30 días' },
                    { value: '60', label: '60 días' },
                  ]}
                />
              </Field>
              <Field label="Límite de crédito">
                <CurrencyInput value={importe} onChange={setImporte} />
              </Field>
              <Field label="Alta">
                <DatePicker value={fecha} onChange={setFecha} />
              </Field>
            </FormGrid>
          </FormSection>

          <FormSection title="Estado" divider>
            <Field label="Cliente activo" orientation="horizontal" hint="Si se desactiva no se le podrán emitir documentos.">
              <Switch checked={activo} onChange={setActivo} />
            </Field>
          </FormSection>
        </div>
      </Card>
    </div>
  );
};
FichaCompleta.storyName = 'Ficha completa';
