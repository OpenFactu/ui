import * as React from 'react';
import type { Story } from '@ladle/react';
import { Tabs } from '../src/components/Tabs';
import { Input } from '../src/components/Input';
import { Breadcrumbs } from '../src/components/Breadcrumbs';
import { Table } from '../src/components/Table';
import { Slider } from '../src/components/Slider';
import { Gantt } from '../src/components/Gantt';
import { Button } from '../src/components/Button';
import { Select } from '../src/components/Select';
import { Avatar } from '../src/components/Avatar';
import { Switch } from '../src/components/Switch';
import { DropdownMenu } from '../src/components/DropdownMenu';
import { UiIcon } from '../src/icons';

const FILAS = [{ id: 1, cliente: 'شركة النور', total: 1200 }, { id: 2, cliente: 'مؤسسة الفجر', total: 830 }];

const Muestra: React.FC<{ dir: 'ltr' | 'rtl' }> = ({ dir }) => {
  const [tab, setTab] = React.useState('a');
  const [valor, setValor] = React.useState('a');
  const [nivel, setNivel] = React.useState(40);
  return (
    <div dir={dir} data-testid={dir} className="flex flex-col gap-5 rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] p-4">
      <Tabs value={tab} onChange={setTab} items={[{ key: 'a', label: 'الرئيسية' }, { key: 'b', label: 'الفواتير' }, { key: 'c', label: 'العملاء' }]} />
      <Breadcrumbs items={[{ label: 'الرئيسية', onClick: () => undefined }, { label: 'الفواتير' }]} />
      <Input label="الاسم" placeholder="اكتب هنا" />
      <Select label="الحالة" value={valor} onChange={setValor} options={[{ value: 'a', label: 'مفتوحة' }, { value: 'b', label: 'مغلقة' }]} />
      <div className="flex items-center gap-2"><Avatar name="نور" status="online" /><Button>حفظ</Button><span data-testid="sin-direccion"><UiIcon slot="check" size={16} /></span><Switch checked onChange={() => undefined} aria-label="تفعيل" /><DropdownMenu items={[{ label: 'نسخ', onClick: () => undefined }, { label: 'حذف', onClick: () => undefined }]}>Más</DropdownMenu></div>
      <Table data={FILAS} rowKey={(row) => row.id} responsive="scroll" columns={[{ header: 'العميل', accessor: 'cliente' }, { header: 'المبلغ', accessor: 'total', align: 'right' }]} />
      <Slider label="المستوى" value={nivel} onChange={(v) => setNivel(v as number)} />
      <Gantt today="2026-07-10" tasks={[{ id: 't', name: 'مهمة', start: '2026-07-01', end: '2026-07-20' }]} />
    </div>
  );
};

/** Lo mismo en las dos direcciones. Los textos en árabe son de muestra: la librería no trae ese idioma. */
export const DerechaAIzquierda: Story = () => (
  <div className="grid grid-cols-2 gap-4">
    <Muestra dir="ltr" />
    <Muestra dir="rtl" />
  </div>
);
