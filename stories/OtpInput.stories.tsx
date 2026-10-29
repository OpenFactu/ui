import * as React from 'react';
import type { Story } from '@ladle/react';
import { OtpInput } from '../src/components/OtpInput';

export const Basico: Story = () => {
  const [code, setCode] = React.useState('');
  const [error, setError] = React.useState<string>();
  return (
    <div className="flex flex-col gap-3">
      <OtpInput
        label="Código de verificación"
        helperText="Te lo hemos enviado por SMS. Prueba a pegar «123 456»."
        value={code}
        onChange={(v) => { setCode(v); setError(undefined); }}
        onComplete={(v) => { if (v !== '123456') setError('Código incorrecto'); }}
        groupSize={3}
        error={error}
        autoFocus
      />
      <span className="text-[12px] text-[var(--fg-muted,#52606f)]">Valor: «{code}»</span>
    </div>
  );
};

export const PinYAlfanumerico: Story = () => {
  const [pin, setPin] = React.useState('');
  const [ref, setRef] = React.useState('');
  return (
    <div className="flex flex-col gap-6">
      <OtpInput label="PIN" value={pin} onChange={setPin} length={4} mask size="lg" />
      <OtpInput label="Referencia" value={ref} onChange={setRef} length={8} mode="alphanumeric" groupSize={4} size="sm" />
    </div>
  );
};
