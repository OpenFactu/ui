import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  Icon, IconProvider, LUCIDE_COMPONENTS, adaptIcon, describeIconLibrary, iconFromPaths, iconLibraryFromIcons, iconLibraryFromModule, iconLibraryFromResolver,
  registerIconLibrary, type IconLibrary,
} from '../src/icons';
import { Accordion } from '../src/components/Accordion';
import { Pagination } from '../src/components/Pagination';
import { SearchInput } from '../src/components/SearchInput';
import { Select } from '../src/components/Select';
import { Button } from '../src/components/Button';
import { AIStackTrace, AIFileTree } from '../src/ai';

// Tres «librerías» simuladas, cada una con su propio vocabulario. Sustituyen a `react-icons`, Phosphor o Iconify.
const GLYPHS = {
  home: 'M3 11l9-8 9 8M5 10v10h14V10', close: ['M6 6l12 12', 'M18 6L6 18'], tick: 'M5 12.5l4.5 4.5L19 7.5', find: ['M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z', 'M20 20l-4-4'],
  down: 'M6 9l6 6 6-6', up: 'M6 15l6-6 6 6', left: 'M15 6l-6 6 6 6', right: 'M9 6l6 6-6 6', plus: ['M12 5v14', 'M5 12h14'], spin: 'M12 3a9 9 0 1 0 9 9', bin: ['M5 7h14', 'M9 7V4h6v3', 'M7 7l1 13h8l1-13'],
} as const;

/** 1. Iconos sueltos con los nombres que tú elijas (lo mejor para no cargar una librería entera). */
const OWN: IconLibrary = iconLibraryFromIcons(
  { Casa: iconFromPaths(GLYPHS.home), Cruz: iconFromPaths(GLYPHS.close), Visto: iconFromPaths(GLYPHS.tick), Lupa: iconFromPaths(GLYPHS.find), Abajo: iconFromPaths(GLYPHS.down), Arriba: iconFromPaths(GLYPHS.up), Izquierda: iconFromPaths(GLYPHS.left), Derecha: iconFromPaths(GLYPHS.right), Mas: iconFromPaths(GLYPHS.plus), Girando: iconFromPaths(GLYPHS.spin) },
  { id: 'propios', autoSlots: false, quiet: true, slots: { x: 'Cruz', check: 'Visto', search: 'Lupa', 'chevron-down': 'Abajo', 'chevron-up': 'Arriba', 'chevron-left': 'Izquierda', 'chevron-right': 'Derecha', plus: 'Mas', 'loader-2': 'Girando' } },
);
/** 2. Un módulo importado entero: los nombres son los de la librería, los huecos se rellenan solos. */
const fakeModule = () => {
  const glyph = (paths: string | readonly string[]) => adaptIcon(iconFromPaths(paths), { size: 'size' });
  return {
    HouseIcon: glyph(GLYPHS.home), CaretDownIcon: glyph(GLYPHS.down), CaretUpIcon: glyph(GLYPHS.up), CaretLeftIcon: glyph(GLYPHS.left), CaretRightIcon: glyph(GLYPHS.right),
    XIcon: glyph(GLYPHS.close), CheckIcon: glyph(GLYPHS.tick), MagnifyingGlassIcon: glyph(GLYPHS.find), PlusIcon: glyph(GLYPHS.plus), SpinnerGapIcon: glyph(GLYPHS.spin), TrashIcon: glyph(GLYPHS.bin),
  };
};
const MODULE: IconLibrary = iconLibraryFromModule(fakeModule(), { id: 'módulo', quiet: true });
/** 3. Una librería que se pide por nombre (Iconify: `mdi:home`): el nombre es el de su catálogo. */
const FakeIconify = ({ icon, ...props }: { icon: string } & React.ComponentProps<'svg'>) => {
  const glyph = ({ 'mdi:home': GLYPHS.home, 'mdi:close': GLYPHS.close, 'mdi:check': GLYPHS.tick, 'mdi:magnify': GLYPHS.find, 'mdi:chevron-down': GLYPHS.down, 'mdi:chevron-up': GLYPHS.up, 'mdi:chevron-left': GLYPHS.left, 'mdi:chevron-right': GLYPHS.right, 'mdi:plus': GLYPHS.plus, 'mdi:loading': GLYPHS.spin } as Record<string, string | readonly string[]>)[icon];
  const Component = React.useMemo(() => glyph ? iconFromPaths(glyph) : null, [glyph]);
  return Component ? <Component {...props} /> : <span {...(props as object)}>?</span>;
};
const ICONIFY: IconLibrary = iconLibraryFromResolver((name, props) => <FakeIconify icon={name} {...props} />, {
  id: 'iconify', quiet: true, slots: { x: 'mdi:close', check: 'mdi:check', search: 'mdi:magnify', 'chevron-down': 'mdi:chevron-down', 'chevron-up': 'mdi:chevron-up', 'chevron-left': 'mdi:chevron-left', 'chevron-right': 'mdi:chevron-right', plus: 'mdi:plus', 'loader-2': 'mdi:loading' },
});

type Choice = 'lucide' | 'own' | 'module' | 'iconify';
const LIBRARIES: Record<Choice, { label: string; library?: IconLibrary; names: string[]; code: string }> = {
  lucide: { label: 'Lucide (por defecto)', names: Object.keys(LUCIDE_COMPONENTS).slice(0, 18), code: '<Icon name="ChevronDown" />' },
  own: { label: 'Iconos sueltos', library: OWN, names: ['Casa', 'Cruz', 'Visto', 'Lupa', 'Abajo', 'Arriba', 'Izquierda', 'Derecha', 'Mas', 'Girando'], code: '<Icon name="Casa" />' },
  module: { label: 'Módulo de una librería', library: MODULE, names: Object.keys(fakeModule()), code: '<Icon name="HouseIcon" />' },
  iconify: { label: 'Por nombre (Iconify)', library: ICONIFY, names: ['mdi:home', 'mdi:close', 'mdi:check', 'mdi:magnify', 'mdi:chevron-down', 'mdi:plus', 'mdi:loading'], code: '<Icon name="mdi:home" />' },
};

function Sample() {
  const [page, setPage] = React.useState(2); const [query, setQuery] = React.useState('');
  return <div style={{ display: 'grid', gap: 14 }}>
    <SearchInput value={query} onChange={setQuery} placeholder="Buscar…" />
    <Select value="a" onChange={() => undefined} options={[{ value: 'a', label: 'Opción A' }, { value: 'b', label: 'Opción B' }]} ariaLabel="Ejemplo" />
    <Accordion items={[{ key: '1', title: 'Los chevrons salen de la biblioteca activa', content: 'También la X de limpiar y el spinner.' }, { key: '2', title: 'Otro panel', content: 'Contenido.' }]} defaultOpenKeys={['1']} />
    <Pagination page={page} pageSize={10} total={95} onPageChange={setPage} />
    <div className="ai-surface" style={{ display: 'grid', gap: 8 }}>
      <AIStackTrace trace={'TypeError: x is undefined\n    at seed (/app/seed.ts:3:1)'} defaultOpen />
      <AIFileTree files={[{ path: 'src/a.ts', status: 'added' }, { path: 'src/b/c.ts', status: 'modified' }]} />
    </div>
    <div style={{ display: 'flex', gap: 8 }}><Button size="sm" variant="secondary">Normal</Button><Button size="sm" isLoading>Cargando</Button></div>
  </div>;
}

/** Cada biblioteca con SU vocabulario: lo que escribes en `<Icon name>` es lo que dice tu librería. */
export const Bibliotecas: Story = () => {
  const [choice, setChoice] = React.useState<Choice>('lucide');
  const entry = LIBRARIES[choice];
  const report = React.useMemo(() => entry.library ? describeIconLibrary(entry.library) : null, [entry.library]);
  const view = (
    <div style={{ display: 'grid', gap: 16 }}>
      <div role="radiogroup" aria-label="Biblioteca de iconos" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {(Object.keys(LIBRARIES) as Choice[]).map(key => <button key={key} type="button" role="radio" aria-checked={choice === key} onClick={() => setChoice(key)} style={{ padding: '4px 10px', fontSize: 12, cursor: 'pointer', fontWeight: choice === key ? 700 : 400 }}>{LIBRARIES[key].label}</button>)}
      </div>
      <p style={{ margin: 0, fontSize: 12 }}>En tu código: <code>{entry.code}</code>{report && <> · la interfaz usa {report.filled.length} huecos de esta biblioteca; los otros {report.missing.length} los cubre Lucide.</>}</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(124px, 1fr))', gap: 6 }}>
        {entry.names.map(name => <div key={name} style={{ display: 'grid', justifyItems: 'center', gap: 6, padding: '10px 4px', border: '1px solid var(--border-default)', borderRadius: 'var(--k-radius-sm)', fontSize: 10 }}>
          <Icon name={name} size={20} /><code>{name}</code>
        </div>)}
      </div>
      <div style={{ maxWidth: 560 }}><Sample /></div>
    </div>
  );
  return entry.library ? <IconProvider library={entry.library}>{view}</IconProvider> : view;
};

/** Registrar una biblioteca para toda la aplicación y retirarla. */
export const Registro: Story = () => {
  const [on, setOn] = React.useState(false);
  React.useEffect(() => { if (!on) return; return registerIconLibrary(OWN, { source: 'story' }); }, [on]);
  return <div style={{ display: 'grid', gap: 12, maxWidth: 560 }}>
    <button type="button" onClick={() => setOn(value => !value)} aria-pressed={on} style={{ justifySelf: 'start' }}>{on ? 'Quitar la biblioteca propia' : 'Registrar la biblioteca propia'}</button>
    <p style={{ margin: 0, fontSize: 12 }}>Registrada, los huecos que cubre cambian en toda la página; el resto sigue en Lucide. <Icon name="Casa" size={14} /> aparece solo mientras está registrada.</p>
    <Sample />
  </div>;
};
