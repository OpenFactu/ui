import * as React from 'react';
import type { Story } from '@ladle/react';
import { InlineEdit } from '../src/components/InlineEdit';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const Basico: Story = () => {
  const [name, setName] = React.useState('Distribuciones Norte, S. L.');
  const [notes, setNotes] = React.useState('');
  const [nif, setNif] = React.useState('B12345678');
  return (
    <dl className="grid max-w-lg grid-cols-[8rem_1fr] items-center gap-y-4 text-[14px]">
      <dt className="text-[var(--fg-muted,#52606f)]">Cliente</dt>
      <dd className="m-0 text-[18px] font-semibold"><InlineEdit label="Nombre del cliente" value={name} onSave={async (v) => { await wait(700); setName(v); }} validate={(v) => (v.length < 3 ? 'Mínimo 3 caracteres' : null)} /></dd>
      <dt className="text-[var(--fg-muted,#52606f)]">NIF</dt>
      <dd className="m-0 font-mono"><InlineEdit label="NIF" value={nif} onSave={async (v) => { await wait(500); if (!/^[A-Z]\d{8}$/i.test(v)) throw new Error('NIF no válido'); setNif(v.toUpperCase()); }} /></dd>
      <dt className="text-[var(--fg-muted,#52606f)]">Notas</dt>
      <dd className="m-0"><InlineEdit label="Notas" value={notes} multiline placeholder="Añadir una nota" onSave={setNotes} /></dd>
    </dl>
  );
};
