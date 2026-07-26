/**
 * Comprueba que la aplicación consumidora no se rompe con los cambios de la
 * librería: extrae todo lo que importa de `@openfactu/ui` y verifica que sigue
 * existiendo, y renderiza las llamadas tal y como están escritas allí.
 *
 *   npx tsx scripts/check-consumer.tsx [ruta-al-src-del-consumidor]
 *
 * Requiere haber compilado antes (`npm run build`), porque los tipos se buscan
 * en las declaraciones de `dist`.
 */
import fs from 'node:fs';
import path from 'node:path';
import * as React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import * as UI from '../src/index';

const CONSUMER = process.argv[2] ?? 'D:/dev/platform/apps/web/src';

// ── 1. ¿Sigue existiendo todo lo que importa? ───────────────────────────

function collectImports(root: string): { names: Set<string>; files: number } {
  const names = new Set<string>();
  let files = 0;
  const pattern = /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*'@openfactu\/ui(?:\/[\w-]+)?'/gs;

  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(full);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      const src = fs.readFileSync(full, 'utf8');
      let match: RegExpExecArray | null;
      let hit = false;
      pattern.lastIndex = 0;
      while ((match = pattern.exec(src))) {
        hit = true;
        for (const raw of match[1].split(',')) {
          const name = raw.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
          if (name) names.add(name);
        }
      }
      if (hit) files += 1;
    }
  };

  walk(root);
  return { names, files };
}

function collectDeclarations(dir: string): string {
  let out = '';
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out += collectDeclarations(full);
    else if (entry.name.endsWith('.d.ts')) out += fs.readFileSync(full, 'utf8') + '\n';
  }
  return out;
}

const { names, files } = collectImports(CONSUMER);
const runtime = new Set(Object.keys(UI));
const declarations = collectDeclarations('dist');

const missing = [...names].filter((name) => {
  if (runtime.has(name)) return false;
  // Los tipos solo viven en las declaraciones.
  return !new RegExp(`\\b(interface|type|enum)\\s+${name}\\b`).test(declarations);
});

console.log(`Consumidor: ${CONSUMER}`);
console.log(`${files} ficheros importan de la librería · ${names.size} símbolos distintos`);
console.log(missing.length ? `  AUSENTES: ${missing.join(', ')}` : '  Todos siguen existiendo.');

// ── 2. ¿Siguen funcionando las llamadas tal y como están escritas? ──────
// Las superposiciones van cerradas: abiertas usan portales y aquí no hay DOM.

let broken = 0;
const call = (name: string, el: React.ReactElement) => {
  try {
    renderToString(<MemoryRouter>{el}</MemoryRouter>);
  } catch (e) {
    broken += 1;
    console.log(`  ROTO ${name}: ${(e as Error).message.slice(0, 120)}`);
  }
};

console.log('\nLlamadas tal y como aparecen en el consumidor:');
call('Modal', <UI.Modal isOpen={false} onClose={() => {}} title="Enviar" subtitle="s" maxWidth="lg">x</UI.Modal>);
call('Table', <UI.Table columns={[{ header: 'A', accessor: 'a' as any, sortable: true, primary: true }]} data={[{ id: 1, a: 'x' }]} isLoading={false} density="compact" emptyMessage="vacío" />);
call('Table + rowActions', <UI.Table columns={[{ header: 'A', accessor: 'a' as any }]} data={[{ id: 1, a: 'x' }]} selectable rowActions={() => [{ label: 'Editar' }]} onRowClick={() => {}} />);
call('SearchableSelect', <UI.SearchableSelect options={[{ value: '1', label: 'Uno' }]} value="1" onChange={() => {}} placeholder="Seleccionar..." />);
call('Input', <UI.Input label="CIF" type="email" leftIcon={<span />} error="mal" helperText="ayuda" containerClassName="w-full" />);
call('Button', <>{(['primary', 'accent', 'secondary', 'danger', 'ghost', 'outline'] as const).map((v) => <UI.Button key={v} variant={v} size="sm">x</UI.Button>)}</>);
call('Badge', <>{(['success', 'warning', 'error', 'info', 'neutral', 'teal'] as const).map((v) => <UI.Badge key={v} variant={v}>x</UI.Badge>)}</>);
call('Card', <UI.Card title="T" subtitle="s" headerAction={<span />} footer={<span />} noPadding>x</UI.Card>);
call('KpiCard', <UI.KpiCard label="L" value="1" sub="s" trend={{ dir: 'up', text: 't' }} />);
call('Skeleton', <UI.Skeleton className="h-28 w-full rounded-xl" count={3} />);
call('DashboardSkeleton', <UI.DashboardSkeleton />);
call('FilterBar', <UI.FilterBar searchTerm="" onSearchChange={() => {}} activeFilters={{}} onFilterChange={() => {}} onClear={() => {}} config={[{ key: 'estado', label: 'Estado', type: 'select', options: [{ label: 'A', value: 'a' }] }]} />);
call('Loader + GlobalLoader', <><UI.Loader size="sm" /><UI.GlobalLoader /></>);
call('Checkbox', <UI.Checkbox checked onChange={() => {}} size="sm" />);
call('DropdownMenu', <UI.DropdownMenu items={[{ label: 'a' }]}><span>t</span></UI.DropdownMenu>);
call('Providers', <UI.ToastProvider><UI.PopupProvider><span>x</span></UI.PopupProvider></UI.ToastProvider>);
call('cn()', <span className={UI.cn('a', false && 'b', 'c')} />);

console.log(broken === 0 ? '\nEl consumidor no se rompe.' : `\n${broken} llamadas rotas.`);
process.exit(missing.length || broken ? 1 : 0);
