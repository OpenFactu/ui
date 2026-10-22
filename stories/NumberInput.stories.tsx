import * as React from 'react';
import type { Story } from '@ladle/react';
import { CurrencyInput, NumberInput, PercentInput } from '../src/components/NumberInput';
import { Button, Input, PageHeader } from '../src';

export const Basico: Story = () => {
  const [qty, setQty] = React.useState<number | null>(1);
  const [weight, setWeight] = React.useState<number | null>(2.5);
  return (
    <div className="flex flex-col gap-6 max-w-xs">
      <NumberInput label="Unidades" value={qty} onChange={setQty} min={0} showSteppers />
      <NumberInput
        label="Peso"
        value={weight}
        onChange={setWeight}
        precision={3}
        suffix="kg"
        helperText="Se puede teclear «2,5» o «2.5»."
      />
      <p className="text-[11px] font-mono text-[var(--fg-muted,#52606f)] dark:text-slate-400">
        unidades={String(qty)} · peso={String(weight)}
      </p>
    </div>
  );
};

export const Moneda: Story = () => {
  const [price, setPrice] = React.useState<number | null>(1234.5);
  const [discount, setDiscount] = React.useState<number | null>(21);
  return (
    <div className="flex flex-col gap-6 max-w-xs">
      <CurrencyInput label="Precio" value={price} onChange={setPrice} />
      <CurrencyInput label="En dólares, símbolo delante" currency="USD" symbolPosition="prefix" value={price} onChange={setPrice} />
      <PercentInput label="IVA" value={discount} onChange={setDiscount} />
      <p className="text-[11px] font-mono text-[var(--fg-muted,#52606f)] dark:text-slate-400">
        precio={String(price)} · iva={String(discount)}
      </p>
    </div>
  );
};

/** El caso que rompía en las implementaciones a mano: teclear un decimal. */
export const Decimales: Story = () => {
  const [value, setValue] = React.useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3 max-w-xs">
      <NumberInput
        label="Escribe 0,5"
        value={value}
        onChange={setValue}
        precision={2}
        helperText="Los estados intermedios («0,», «-») no se normalizan mientras escribes."
      />
      <p className="text-[11px] font-mono text-[var(--fg-muted,#52606f)] dark:text-slate-400">
        value={String(value)}
      </p>
    </div>
  );
};

export const Estados: Story = () => (
  <div className="flex flex-col gap-6 max-w-xs">
    <NumberInput label="Con error" value={null} onChange={() => {}} error="Introduce una cantidad." />
    <NumberInput label="Deshabilitado" value={42} onChange={() => {}} disabled />
    <NumberInput label="Alineado a la izquierda" value={7} onChange={() => {}} align="left" />
  </div>
);

export const EdicionERP: Story = () => {
  const [price, setPrice] = React.useState<number | null>(1234.5);
  const [quantity, setQuantity] = React.useState<number | null>(5);
  const [international, setInternational] = React.useState<number | null>(1234.5);
  const [readOnlyChanges, setReadOnlyChanges] = React.useState(0);
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Edición de importes" subtitle="Decimales, pegado desde hojas de cálculo y campos de consulta." />
      <div className="grid gap-6 sm:grid-cols-2">
        <CurrencyInput label="Precio unitario" value={price} onChange={setPrice}
          helperText="Teclea 12,50 o 12.50; también puedes pegar 1.234,56." />
        <NumberInput label="Unidades al confirmar" value={quantity} onChange={setQuantity}
          commitOn="blur" min={0} max={100} showSteppers
          helperText="Las flechas parten de lo escrito; el valor se confirma al salir." />
        <CurrencyInput label="Importe internacional" currency="USD" decimalSeparator="."
          value={international} onChange={setInternational} helperText="Admite pegar 1,234.56." />
        <NumberInput label="Cantidad de consulta" value={42} readOnly showSteppers
          onChange={() => setReadOnlyChanges((count) => count + 1)} helperText="Solo lectura, incluidos los incrementos." />
        <Input label="Referencia obligatoria" error="Introduce una referencia." aria-describedby="reference-help" />
        <p id="reference-help" className="text-[12px] text-[var(--fg-muted)]">La referencia identifica el documento.</p>
      </div>
      <Button type="button" variant="secondary">Salir del campo</Button>
      <output aria-label="Valores confirmados" className="block rounded-[var(--k-radius-sm)] bg-[var(--bg-muted)] p-4 font-mono text-[12px] text-[var(--fg-body)] break-words">
        {JSON.stringify({ price, quantity, international, readOnlyChanges })}
      </output>
    </div>
  );
};
