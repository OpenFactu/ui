import * as React from 'react';
import { Modal } from '../Modal';
import { Select } from '../Select';
import { DatePicker } from '../DatePicker';
import { Button } from '../Button';
import { aInstante } from '../../internal/fechas';
import { useMessages } from '../../i18n/I18nProvider';

interface Item { id: string; title: string; start: Date | string; end: Date | string; locked?: boolean }
interface Props { items: Item[]; onChange: (id: string, start: Date, end: Date) => void; allowZeroDuration?: boolean }
const day = (value: Date | string) => { const date = aInstante(value); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; };
export function replaceLocalDay(value: Date | string, iso: string): Date { const date = new Date(aInstante(value)); const [year, month, day] = iso.split('-').map(Number); date.setFullYear(year, month - 1, day); return date; }
export function validScheduleDuration(start: Date, end: Date, allowZeroDuration: boolean): boolean {
  const duration = end.getTime() - start.getTime();
  return allowZeroDuration ? duration >= 0 : duration > 0;
}

/** Alternativa táctil al arrastre; conserva las horas de los eventos existentes. */
export function MobileScheduleActions({ items, onChange, allowZeroDuration = true }: Props) {
  const sa = useMessages('scheduleActions');
  const common = useMessages('common');
  const [selected, setSelected] = React.useState<string>();
  const [start, setStart] = React.useState(''); const [end, setEnd] = React.useState('');
  const editable = items.filter(item => !item.locked);
  const item = items.find(item => item.id === selected);
  const choose = (id: string) => { const next = items.find(item => item.id === id); if (next) { setSelected(id); setStart(day(next.start)); setEnd(day(next.end)); } };
  const valid = !!item && !!start && !!end && validScheduleDuration(replaceLocalDay(item.start, start), replaceLocalDay(item.end, end), allowZeroDuration);
  if (!editable.length) return null;
  return <><div className="k-mobile-schedule-actions"><Button size="sm" variant="secondary" onClick={() => choose(editable[0].id)}>{sa.change}</Button></div>
    <Modal isOpen={!!item} onClose={() => setSelected(undefined)} title={sa.change} fullHeight hideCancel>
      <form onSubmit={event => { event.preventDefault(); if (item && valid && !item.locked) { onChange(item.id, replaceLocalDay(item.start, start), replaceLocalDay(item.end, end)); setSelected(undefined); } }} className="k-mobile-schedule-form">
        <Select label={sa.item} value={selected ?? ''} onChange={choose} options={editable.map(item => ({ value: item.id, label: item.title }))} />
        <DatePicker label={sa.start} value={start || null} onChange={value => setStart(value ?? '')} /><DatePicker label={sa.end} value={end || null} onChange={value => setEnd(value ?? '')} />
        {!valid && <p role="alert">{sa.invalid}</p>}
        <div className="k-mobile-filter-actions"><Button variant="secondary" type="button" onClick={() => setSelected(undefined)}>{common.cancel}</Button><Button type="submit" disabled={!valid}>{sa.save}</Button></div>
      </form>
    </Modal></>;
}
