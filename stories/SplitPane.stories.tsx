import * as React from 'react';
import type { Story } from '@ladle/react';
import { SplitPane, type SplitPaneHandle } from '../src/components/SplitPane';
import { Button } from '../src/components/Button';

const Panel: React.FC<{ title: string; children?: React.ReactNode }> = ({ title, children }) => (
  <div className="h-full p-4 text-[13px]">
    <strong className="block mb-2 text-[14px]">{title}</strong>
    {children ?? <p className="m-0 text-[var(--fg-muted,#52606f)]">Arrastra el separador, usa las flechas con el foco en él o haz doble clic para plegar.</p>}
  </div>
);

export const Horizontal: Story = () => {
  const ref = React.useRef<SplitPaneHandle>(null);
  return (
    <div className="flex flex-col gap-3">
      <div><Button size="sm" variant="secondary" onClick={() => ref.current?.toggleCollapsed()}>Plegar / desplegar lista</Button></div>
      <div className="h-[420px] rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]">
        <SplitPane ref={ref} defaultSize="32%" minSize={180} minSecondary={240} collapsible storageKey="historia-split">
          <Panel title="Facturas" />
          <Panel title="Detalle" />
        </SplitPane>
      </div>
    </div>
  );
};

export const Anidados: Story = () => (
  <div className="h-[480px] rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]">
    <SplitPane defaultSize={240} minSize={160}>
      <Panel title="Carpetas" />
      <SplitPane direction="vertical" defaultSize="60%" minSize={120} minSecondary={100}>
        <Panel title="Editor" />
        <Panel title="Consola" />
      </SplitPane>
    </SplitPane>
  </div>
);
