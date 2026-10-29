require('./test-support.cjs');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { resolveTheme, themeToCssVars, themeToAttrs, isGlassTheme } = require('../src/theme/tokens.ts');
const { THEME_PRESETS } = require('../src/theme/presets.ts');
const { validateTheme } = require('../src/theme/registry.ts');

test('factory themes keep the new axes neutral: no glass, density 1, motion 1', () => {
  for (const preset of THEME_PRESETS.filter(item => !item.id.includes('glass') && !item.id.startsWith('keirost-mono'))) {
    const theme = resolveTheme(preset.theme);
    assert.equal(isGlassTheme(theme), false, preset.id);
    assert.deepEqual(themeToAttrs(theme), {}, preset.id);
    assert.equal(theme.density, 1); assert.equal(theme.motion.speed, 1); assert.equal(theme.typography.scale, 1); assert.equal(theme.backdrop, 'none');
  }
});
test('glass presets switch on the material and backdrop attributes', () => {
  const glass = THEME_PRESETS.filter(item => item.id.includes('glass'));
  assert.ok(glass.length >= 2);
  for (const preset of glass) {
    const theme = resolveTheme(preset.theme);
    const attrs = themeToAttrs(theme); assert.equal(attrs['data-k-material'], 'glass', preset.id); assert.equal(attrs['data-k-backdrop'], '', preset.id);
    const vars = themeToCssVars(theme);
    assert.match(vars['--k-surface-blur'], /^\d+px$/); assert.ok(Number(vars['--k-surface-alpha']) < 1); assert.notEqual(vars['--k-app-backdrop'], 'none');
  }
});
test('density, motion and text scale accept names or numbers and stay inside safe bounds', () => {
  assert.equal(resolveTheme({ density: 'compact' }).density, 0.88);
  assert.equal(resolveTheme({ density: 'comfortable' }).density, 1.12);
  assert.equal(resolveTheme({ density: 9 }).density, 1.6);
  assert.equal(resolveTheme({ motion: { speed: 'none' } }).motion.speed, 0);
  assert.equal(resolveTheme({ motion: { speed: 'slow' } }).motion.speed, 1.6);
  assert.equal(resolveTheme({ typography: { scale: 5 } }).typography.scale, 1.4);
  assert.equal(resolveTheme({ material: { blur: 500, alpha: 0 } }).material.blur, 80);
  assert.equal(resolveTheme({ material: { alpha: 0 } }).material.alpha, 0.05);
  const vars = themeToCssVars(resolveTheme({ density: 'compact', motion: { speed: 0, easing: 'linear' }, typography: { scale: 1.1 } }));
  assert.equal(vars['--k-density'], '0.88'); assert.equal(vars['--k-motion'], '0'); assert.equal(vars['--k-ease'], 'linear'); assert.equal(vars['--k-text-scale'], '1.1');
});
test('a patch over a glass theme keeps its material unless overridden', () => {
  const base = resolveTheme({ material: { blur: 20, alpha: 0.5 }, backdrop: 'linear-gradient(#111, #333)' });
  const patched = resolveTheme({ material: { blur: 8 } }, base);
  assert.equal(patched.material.blur, 8); assert.equal(patched.material.alpha, 0.5); assert.equal(patched.backdrop, 'linear-gradient(#111, #333)');
});
test('validation warns about glass without a backdrop and about unreadable translucent text', () => {
  const flat = validateTheme({ mode: 'light', colors: { primary: '#10223f', accent: '#2f6fed' }, material: { blur: 20, alpha: 0.6 } });
  assert.ok(flat.issues.some(issue => issue.field === 'backdrop'));
  const bad = validateTheme({ mode: 'light', colors: { primary: '#10223f', accent: '#2f6fed', bgCard: '#ffffff', fgDefault: '#d0d0d0' }, material: { blur: 20, alpha: 0.4 }, backdrop: 'linear-gradient(#ff00aa, #00ffee)' });
  assert.ok(bad.issues.some(issue => issue.field === 'material.alpha' || issue.field === 'colors.fgDefault'));
  assert.ok(validateTheme({ colors: { primary: '#10223f', accent: '#2f6fed' }, density: 3 }).issues.some(issue => issue.field === 'density'));
  for (const preset of THEME_PRESETS.filter(item => item.id.includes('glass'))) {
    const result = validateTheme(preset.theme);
    assert.ok(result.ok, preset.id); assert.deepEqual(result.issues.filter(issue => issue.field === 'material.alpha' || issue.field === 'backdrop'), [], preset.id);
  }
});
test('the Tailwind preset scales spacing, durations and text with theme variables', () => {
  const { theme } = require('../tailwind/preset.cjs');
  assert.equal(theme.extend.spacing[4], 'calc(1rem * var(--k-density, 1))');
  assert.equal(theme.extend.spacing.px, '1px');
  assert.equal(theme.extend.transitionDuration[200], 'calc(200ms * var(--k-motion, 1))');
  assert.match(theme.extend.fontSize.sm[0], /var\(--k-text-scale, 1\)/);
});
test('border, focus and selection stay inert unless the theme defines them', () => {
  const plain = resolveTheme({});
  assert.equal(plain.border.width, 1); assert.equal(plain.focus.enabled, false); assert.equal(plain.selection.enabled, false);
  assert.deepEqual(themeToAttrs(plain), {});
  const themed = resolveTheme({ border: { width: 9 }, focus: { width: 3, color: '#ff0066' }, selection: { background: '#ffee00' } });
  assert.equal(themed.border.width, 4); assert.equal(themed.focus.width, 3); assert.equal(themed.focus.offset, 2);
  assert.deepEqual(themeToAttrs(themed), { 'data-k-focus': '', 'data-k-selection': '' });
  const vars = themeToCssVars(themed);
  assert.equal(vars['--k-border-width'], '4px'); assert.equal(vars['--k-focus-color'], '#ff0066'); assert.equal(vars['--k-selection-bg'], '#ffee00');
});
test('the animated backdrop needs a backdrop, the drift option and non-zero motion', () => {
  const drift = { backdrop: 'linear-gradient(#111, #333)', backdropMotion: 'drift' };
  assert.equal(themeToAttrs(resolveTheme(drift))['data-k-backdrop-motion'], 'drift');
  assert.equal(themeToAttrs(resolveTheme({ ...drift, motion: { speed: 'none' } }))['data-k-backdrop-motion'], undefined);
  assert.equal(themeToAttrs(resolveTheme({ backdropMotion: 'drift' }))['data-k-backdrop-motion'], undefined);
  assert.equal(themeToCssVars(resolveTheme({ ...drift, motion: { speed: 2 } }))['--k-backdrop-duration'], '30s');
});
test('themes export to JSON and presets source, and import back without executing anything', () => {
  const { themeToJson, themeFromJson, themeToPresetSource } = require('../src/theme/export.ts');
  const glass = THEME_PRESETS.find(item => item.id === 'keirost-glass-aurora').theme;
  const json = themeToJson({ ...glass, material: { ...glass.material }, border: {}, selection: undefined });
  assert.ok(!json.includes('"border": {') && !json.includes('"selection"') && !json.includes('undefined'));
  const back = themeFromJson(json);
  assert.deepEqual(back.theme.colors, glass.colors); assert.equal(back.theme.material.blur, glass.material.blur);
  assert.match(themeToPresetSource({ id: 'x', label: 'X' }, glass), /registerThemePreset\(\{\n  id: "x"[\s\S]*theme: \{\n    "mode": "dark"/);
  assert.equal(themeFromJson('{ nope').theme, undefined);
  assert.equal(themeFromJson('[1]').theme, undefined);
  assert.equal(themeFromJson('{"colors":{"primary":"red","accent":"#fff"}}').theme, undefined);
});
test('the black and white presets are valid, square and keep AA contrast', () => {
  const { contrastRatio, hexToRgb } = require('../src/theme/derive.ts');
  for (const [id, mode, accentFg] of [['keirost-mono', 'light', '#ffffff'], ['keirost-mono-dark', 'dark', '#000000']]) {
    const preset = THEME_PRESETS.find(item => item.id === id);
    const result = validateTheme(preset.theme);
    assert.ok(result.ok, id); assert.deepEqual(result.issues, [], id);
    const theme = resolveTheme(preset.theme);
    assert.equal(theme.mode, mode); assert.equal(theme.radius.md, '0px'); assert.equal(theme.colors.accentFg, accentFg, id);
    for (const bg of [theme.colors.bgApp, theme.colors.bgCard, theme.colors.bgMuted]) assert.ok(contrastRatio(hexToRgb(theme.colors.fgSubtle), hexToRgb(bg)) >= 4.5, `${id} ${bg}`);
    assert.deepEqual(Object.keys(themeToAttrs(theme)).sort(), ['data-k-focus', 'data-k-selection', 'data-k-stagger'], id);
  }
});
test('color aliases travel with the theme so a themed subtree never inherits the root accent text', () => {
  const vars = themeToCssVars(resolveTheme({ colors: { primary: '#000000', accent: '#ffffff', accentFg: '#000000' } }));
  assert.equal(vars['--color-accent'], '#ffffff'); assert.equal(vars['--color-accent-fg'], '#000000'); assert.equal(vars['--color-primary-fg'], '#ffffff');
});
test('in dark presets the accent tints 50 and 100 stay light, because components use them as text', () => {
  const { contrastRatio, hexToRgb } = require('../src/theme/derive.ts');
  for (const preset of THEME_PRESETS.filter(item => resolveTheme(item.theme).mode === 'dark')) {
    const theme = resolveTheme(preset.theme);
    assert.ok(contrastRatio(hexToRgb(theme.colors.accentScale[100]), hexToRgb(theme.colors.bgCard)) >= 3, preset.id);
  }
});
test('Tailwind shadow utilities follow the theme tokens, and monochrome presets define every step', () => {
  const { theme } = require('../tailwind/preset.cjs');
  for (const [key, token] of [['sm', '--k-shadow-sm'], ['md', '--k-shadow-md'], ['lg', '--k-shadow-lg'], ['xl', '--k-shadow-xl'], ['2xl', '--k-shadow-overlay']]) assert.ok(theme.extend.boxShadow[key].startsWith(`var(${token},`), key);
  const vars = themeToCssVars(resolveTheme({}));
  assert.equal(vars['--k-shadow-xl'], '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)');
  for (const id of ['keirost-mono', 'keirost-mono-dark']) {
    const shadows = THEME_PRESETS.find(item => item.id === id).theme.shadows;
    assert.deepEqual(Object.keys(shadows).sort(), ['lg', 'md', 'overlay', 'sm', 'xl'], id);
  }
});

test('monochrome themes have softened shadows and a restrained keyboard focus', () => {
  for (const id of ['keirost-mono', 'keirost-mono-dark']) {
    const theme = resolveTheme(THEME_PRESETS.find(item => item.id === id).theme);
    assert.equal(theme.focus.width, 2, id);
    assert.equal(theme.focus.offset, 0, id);
    for (const [step, shadow] of Object.entries(theme.shadows)) {
      const values = /^(0|[\d.]+px)\s+([\d.]+px)\s+([\d.]+px)/.exec(shadow);
      assert.ok(values && parseFloat(values[3]) > 0, `${id} ${step}: shadow needs blur`);
      assert.equal(parseFloat(values[1]), 0, `${id} ${step}: avoid a hard sideways offset`);
    }
  }
});
test('every bordered box in the library follows the radius token (KpiCard included)', () => {
  const fs = require('node:fs'); const path = require('node:path');
  const source = fs.readFileSync(path.join(__dirname, '../src/components/KpiCard.tsx'), 'utf8');
  assert.ok(/rounded-\[var\(--k-radius-sm/.test(source), 'the shared surface uses the radius token');
  assert.ok(!/<div[^>]*aria-busy[^>]*className=\{cn\('p-7/.test(source), 'no hard-coded padding box left outside `surface`');
});
test('adapters translate size and stroke to each library convention', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { adaptIcon, iconFromPaths, iconFromSprite } = require('../src/icons/adapt.tsx');
  const Probe = props => React.createElement('svg', { 'data-props': JSON.stringify(props) });
  const read = markup => JSON.parse(/data-props="([^"]*)"/.exec(markup)[1].replace(/&quot;/g, '"'));
  const render = (Component, props) => read(renderToStaticMarkup(React.createElement(Component, props)));
  assert.equal(render(adaptIcon(Probe), { size: 14, className: 'a' }).size, 14);
  assert.deepEqual(render(adaptIcon(Probe, { size: 'style', stroke: false }), { size: 14, strokeWidth: 3 }).style, { width: 14, height: 14 });
  assert.equal(render(adaptIcon(Probe, { size: 'style', stroke: false }), { size: 14, strokeWidth: 3 }).strokeWidth, undefined);
  const both = render(adaptIcon(Probe, { size: ['width', 'height'] }), { size: 20 }); assert.equal(both.width, 20); assert.equal(both.height, 20);
  assert.equal(render(adaptIcon(Probe, { stroke: 'stroke' }), { strokeWidth: 1.5 }).stroke, 1.5);
  assert.equal(render(adaptIcon(Probe, { props: { weight: 'bold' } }), {}).weight, 'bold');
  assert.equal(render(adaptIcon(Probe, { props: { icon: 'mdi:home' }, size: ['width', 'height'] }), { size: 16 }).icon, 'mdi:home');
  const svg = renderToStaticMarkup(React.createElement(iconFromPaths(['M5 12h14', 'M12 5v14']), { size: 16, className: 'k' }));
  assert.match(svg, /<svg[^>]*width="16"[^>]*class="k"[\s\S]*<path d="M5 12h14"><\/path><path d="M12 5v14"><\/path>/);
  assert.match(renderToStaticMarkup(React.createElement(iconFromSprite('/i.svg#x'), { size: 12 })), /<use href="\/i\.svg#x"><\/use>/);
});

const iconLibs = () => ({ registry: require('../src/icons/registry.tsx'), adapt: require('../src/icons/adapt.tsx'), lucide: require('../src/icons/lucide.ts'), slots: require('../src/icons/slots.ts'), aliases: require('../src/icons/aliases.ts') });
test('names are the active library vocabulary; interface slots fall back library by library to Lucide', () => {
  const { registry, lucide } = iconLibs();
  const A = () => null; const B = () => null; const C = () => null;
  assert.equal(registry.resolveIcon('Home'), undefined, 'unknown names resolve to nothing');
  assert.equal(registry.resolveIcon('ChevronDown'), lucide.LUCIDE_COMPONENTS.ChevronDown, 'Lucide answers by its own names');
  assert.equal(registry.resolveIcon('chevron-down'), lucide.LUCIDE_COMPONENTS.ChevronDown, 'and tolerates kebab-case');
  const off = registry.registerIconLibrary({ id: 'fi', resolve: name => name === 'FiHome' ? A : name === 'FiX' ? B : undefined, slots: { x: 'FiX' } }, { source: 'fi' });
  assert.equal(registry.resolveIcon('FiHome'), A); assert.equal(registry.resolveSlot('x'), B);
  assert.equal(registry.resolveSlot('search'), lucide.LUCIDE_COMPONENTS.Search, 'a slot the library does not fill falls to Lucide');
  assert.equal(registry.resolveSlot('x', [{ resolve: () => undefined, slots: { x: C } }]), C, 'the provider beats the registry; components are valid slot values');
  assert.equal(registry.resolveIcon('Search', [{ resolve: () => undefined }]), lucide.LUCIDE_COMPONENTS.Search, 'names fall through too');
  off(); assert.equal(registry.resolveIcon('FiHome'), undefined); assert.equal(registry.resolveSlot('x'), lucide.LUCIDE_COMPONENTS.X); assert.deepEqual(registry.getRegisteredIconSources(), []);
  const offSource = registry.registerIconLibrary({ resolve: () => A }, { source: 'plugin' }); assert.deepEqual(registry.getRegisteredIconSources(), ['plugin']); registry.unregisterIconSource('plugin'); offSource();
});
test('every interface slot has a Lucide filler and aliases for other libraries', () => {
  const { slots, lucide, aliases } = iconLibs();
  for (const slot of slots.ICON_SLOTS) { assert.ok(lucide.lucideLibrary.resolve(lucide.LUCIDE_SLOTS[slot]), slot); assert.ok(aliases.ICON_ALIASES[slot]?.length >= 2, slot); }
  assert.equal(Object.keys(lucide.LUCIDE_SLOTS).length, slots.ICON_SLOTS.length);
});
test('the naming style of an imported module is detected, and its slots fill themselves', () => {
  const { adapt } = iconLibs(); const component = () => null;
  const feather = { FiHome: component, FiChevronDown: component, FiX: component, FiSearch: component, FiLoader: component, FiTrash2: component, notAnIcon: 'texto' };
  assert.deepEqual(adapt.detectNaming(feather), { prefix: 'Fi', suffix: '' });
  const hero = { HomeIcon: component, ChevronDownIcon: component, XMarkIcon: component, MagnifyingGlassIcon: component, TrashIcon: component };
  assert.deepEqual(adapt.detectNaming(hero), { prefix: '', suffix: 'Icon' });
  const tabler = { IconHome: component, IconChevronDown: component, IconX: component, IconSearch: component };
  assert.deepEqual(adapt.detectNaming(tabler), { prefix: 'Icon', suffix: '' });
  const library = adapt.iconLibraryFromModule(feather, { quiet: true });
  assert.ok(library.resolve('FiHome'), 'user-facing names are the module exports, untouched');
  assert.equal(library.resolve('Home'), undefined);
  assert.equal(library.slots['chevron-down'], 'FiChevronDown'); assert.equal(library.slots.x, 'FiX'); assert.equal(library.slots.search, 'FiSearch'); assert.equal(library.slots['trash-2'], 'FiTrash2');
  const { filled, missing } = adapt.describeIconLibrary(library);
  assert.ok(filled.includes('x') && missing.includes('copy'));
  assert.equal(adapt.iconLibraryFromModule({ Custom: component }, { quiet: true, slots: { plus: 'Custom' } }).slots.plus, 'Custom', 'explicit slots win');
  assert.deepEqual(adapt.iconLibraryFromModule(feather, { quiet: true, autoSlots: false }).slots, {}, 'autoSlots can be switched off');
  const forwardRef = { $$typeof: Symbol.for('react.forward_ref'), render: () => null };
  assert.ok(adapt.iconLibraryFromModule({ PhX: forwardRef }, { quiet: true }).resolve('PhX'), 'forwardRef components count');
});
test('libraries can also come from single icons or from a name-to-element resolver', () => {
  const { adapt } = iconLibs(); const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const Casa = () => React.createElement('i', { className: 'casa' });
  const single = adapt.iconLibraryFromIcons({ Casa }, { quiet: true, autoSlots: false, slots: { plus: 'Casa' } });
  assert.equal(renderToStaticMarkup(React.createElement(single.resolve('Casa'))), '<i class="casa"></i>'); assert.equal(single.slots.plus, 'Casa');
  const remote = adapt.iconLibraryFromResolver((name, props) => React.createElement('span', { 'data-icon': name, className: props.className }), { quiet: true, slots: { x: 'mdi:close' } });
  assert.equal(renderToStaticMarkup(React.createElement(remote.resolve('mdi:home'), { className: 'k' })), '<span data-icon="mdi:home" class="k"></span>');
  assert.equal(remote.resolve('mdi:home'), remote.resolve('mdi:home'), 'resolved components are cached');
});
test('Icon and UiIcon render through the provider, the registry and Lucide', () => {
  const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
  const { Icon, UiIcon } = require('../src/icons/Icon.tsx'); const { IconProvider, registerIconLibrary } = iconLibs().registry ? { ...iconLibs().registry } : {};
  const Mine = props => React.createElement('i', { className: 'mine ' + (props.className ?? '') });
  const library = { resolve: name => name === 'Casa' ? Mine : undefined, slots: { x: Mine } };
  assert.match(renderToStaticMarkup(React.createElement(UiIcon, { slot: 'x', size: 10 })), /<svg/, 'Lucide by default');
  assert.equal(renderToStaticMarkup(React.createElement(Icon, { name: 'Casa' })), '', 'unknown names render nothing');
  assert.match(renderToStaticMarkup(React.createElement(IconProvider, { library }, React.createElement(Icon, { name: 'Casa', className: 'c' }))), /<i class="mine c"/);
  assert.match(renderToStaticMarkup(React.createElement(IconProvider, { library }, React.createElement(UiIcon, { slot: 'x' }))), /<i class="mine/);
  const off = registerIconLibrary(library, { source: 't' });
  assert.match(renderToStaticMarkup(React.createElement(UiIcon, { slot: 'x' })), /<i class="mine/); off();
  assert.match(renderToStaticMarkup(React.createElement(UiIcon, { slot: 'x' })), /<svg/);
});
