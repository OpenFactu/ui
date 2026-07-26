import * as React from 'react';
import type { Story } from '@ladle/react';
import { Transition } from '../src/components/Transition';
import { useAnimatedPresence } from '../src/hooks/useAnimatedPresence';
import { Switch } from '../src/components/Switch';
import { Card } from '../src/components/Card';
import { Badge } from '../src/components/Badge';

export const Presets: Story = () => {
  const [show, setShow] = React.useState(true);
  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <Switch checked={show} onChange={setShow} label="show" />
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--k-ink-400)] mb-2">
            Fade
          </p>
          <Transition show={show}>
            <Card title="Fade">Solo opacidad.</Card>
          </Transition>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--k-ink-400)] mb-2">
            Slide up
          </p>
          <Transition show={show} from="opacity-0 translate-y-3" to="opacity-100 translate-y-0">
            <Card title="Slide up">Opacidad + translate.</Card>
          </Transition>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--k-ink-400)] mb-2">
            Scale
          </p>
          <Transition
            show={show}
            from="opacity-0 scale-95"
            to="opacity-100 scale-100"
            duration={300}
          >
            <Card title="Scale">Zoom sutil, 300ms.</Card>
          </Transition>
        </div>
        <div>
          <p className="text-[11px] font-mono uppercase tracking-wider text-[var(--k-ink-400)] mb-2">
            Slide right
          </p>
          <Transition
            show={show}
            from="opacity-0 -translate-x-6"
            to="opacity-100 translate-x-0"
            duration={250}
          >
            <Card title="Slide right">Entra desde la izquierda.</Card>
          </Transition>
        </div>
      </div>
    </div>
  );
};

/** El hook de bajo nivel para casos custom (el que usan Drawer y Transition). */
export const HookUseAnimatedPresence: Story = () => {
  const [open, setOpen] = React.useState(true);
  const { mounted, visible, duration } = useAnimatedPresence({ open, duration: 400 });
  return (
    <div className="flex flex-col gap-4 max-w-md">
      <Switch checked={open} onChange={setOpen} label="open" />
      <div className="flex gap-2">
        <Badge variant={mounted ? 'teal' : 'neutral'}>mounted: {String(mounted)}</Badge>
        <Badge variant={visible ? 'success' : 'neutral'}>visible: {String(visible)}</Badge>
      </div>
      {mounted && (
        <div
          className={
            'rounded-[4px] border border-[var(--k-line)] dark:border-slate-700 bg-white dark:bg-slate-900 p-4 text-[13px] transition-all ' +
            (visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4')
          }
          style={{ transitionDuration: `${duration}ms` }}
        >
          Sigo montado durante la animación de salida ({duration}ms) y luego desaparezco del DOM.
        </div>
      )}
    </div>
  );
};
HookUseAnimatedPresence.storyName = 'Hook useAnimatedPresence';
