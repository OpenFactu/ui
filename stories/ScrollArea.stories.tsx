import type { Story } from '@ladle/react';
import { ScrollArea } from '../src/components/ScrollArea';

const rows = Array.from({ length: 40 }, (_, i) => `Movimiento ${String(i + 1).padStart(3, '0')} · ${(Math.sin(i) * 900 + 1000).toFixed(2)} €`);

export const Vertical: Story = () => (
  <div className="flex flex-wrap gap-6">
    <ScrollArea maxHeight={260} className="w-72 rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)]">
      <ul className="m-0 list-none p-0 text-[13px]">{rows.map((r) => <li key={r} className="border-b border-[var(--border-subtle,#f1f5f9)] px-3 py-2">{r}</li>)}</ul>
    </ScrollArea>
    <ScrollArea maxHeight={260} autoHide className="w-72 rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)]">
      <p className="m-0 p-3 text-[13px] leading-relaxed">Barras que solo aparecen al pasar el ratón. {rows.join(' · ')}</p>
    </ScrollArea>
  </div>
);

export const Horizontal: Story = () => (
  <ScrollArea axis="x" className="max-w-lg rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)]">
    <div className="flex gap-3 p-3">
      {Array.from({ length: 14 }, (_, i) => <div key={i} className="grid h-24 w-36 shrink-0 place-items-center rounded-[var(--k-radius-sm,4px)] bg-[var(--bg-muted,#fafbfc)] text-[13px]">Tarjeta {i + 1}</div>)}
    </div>
  </ScrollArea>
);
