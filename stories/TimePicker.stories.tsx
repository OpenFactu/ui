import * as React from 'react';
import type { Story } from '@ladle/react';
import { TimePicker } from '../src/components/TimePicker';

export const Basico: Story = () => {
  const [time, setTime] = React.useState<string | null>('09:30');
  const [meeting, setMeeting] = React.useState<string | null>(null);
  return (
    <div className="flex max-w-xs flex-col gap-5">
      <TimePicker label="Hora de entrada" value={time} onChange={setTime} helperText="Escribe «930» o «9:30», o elige de la lista" />
      <TimePicker label="Reunión (horario de oficina)" value={meeting} onChange={setMeeting} step={30} min="08:00" max="18:00" />
      <code className="text-[12px] text-[var(--fg-muted,#52606f)]">{JSON.stringify({ time, meeting })}</code>
    </div>
  );
};
