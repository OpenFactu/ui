import * as React from 'react';
import type { Story } from '@ladle/react';
import { CurrencyInput, NumberInput, PercentInput } from '../src/components/NumberInput';

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
      <p className="text-[11px] font-mono text-[var(--k-ink-500)] dark:text-slate-400">
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
      <p className="text-[11px] font-mono text-[var(--k-ink-500)] dark:text-slate-400">
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
      <p className="text-[11px] font-mono text-[var(--k-ink-500)] dark:text-slate-400">
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
