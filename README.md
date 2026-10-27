# @openfactu/ui

Librería de componentes React del sistema de diseño Keirost.

```bash
npm install @openfactu/ui
```

## Puesta en marcha

La librería ya no depende de que la aplicación defina sus tokens: los publica ella.
Son dos líneas, una en el CSS y otra en la configuración de Tailwind.

```css
/* index.css — antes de las directivas @tailwind */
@import '@openfactu/ui/styles.css';
```

```js
// tailwind.config.js
import uiPreset from '@openfactu/ui/tailwind-preset';

export default {
  presets: [uiPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@openfactu/ui/dist/**/*.{js,jsx}', // para que el JIT vea las clases del paquete
  ],
  plugins: [animated], // tailwindcss-animated, si usas las clases animate-in
};
```

`@openfactu/ui/styles.css` equivale a `tokens.css` (las variables) más
`keyframes.css` (las animaciones que los componentes referencian por nombre).
Si solo necesitas las variables, importa `@openfactu/ui/tokens.css`.

## Temas

Un tema son, en lo esencial, **dos colores y un modo**; el resto se deriva
(hover, colores de texto contrastados, superficies del modo oscuro, escala del
acento). Todo lo derivado se puede sobreescribir.

```tsx
import { applyTheme } from '@openfactu/ui';

applyTheme({
  mode: 'dark',
  colors: { primary: '#1E102C', accent: '#EC4899' },
});
```

`applyTheme` escribe las variables sobre `<html>` y alterna la clase `dark`.
Acepta un segundo argumento para tematizar solo un subárbol, útil para
previsualizar un tema dentro de la propia interfaz.

También hay un provider opcional, para manejar el tema con estado de React:

```tsx
<ThemeProvider defaultTheme={{ mode: 'light', colors: { primary: '#0A1628', accent: '#0D9488' } }}>
  <App />
</ThemeProvider>
```

Los componentes **nunca** leen ese contexto: consumen variables CSS, así que
montar el provider es opcional y no es un requisito para usar la librería.

### Evitar el parpadeo inicial

`resolveTheme` es una función pura, de modo que el tema se puede precalcular y
aplicar antes de que arranque React:

```ts
import { resolveTheme, themeToCssText } from '@openfactu/ui';

const css = themeToCssText(resolveTheme(temaDelTenant)); // string de :root { … }
```

Un tema no son solo colores: también define la **redondez** y la tipografía, y
todos los componentes las siguen.

```tsx
applyTheme({
  mode: 'light',
  colors: { primary: '#0A1628', accent: '#0D9488' },
  radius: 'lg',                          // 'none' | 'sm' | 'md' | 'lg', o { xs, sm, md, lg }
  typography: { fontFamily: 'geist' },   // id de FONT_OPTIONS
});
```

### Presets y plugins

`THEME_PRESETS` trae nueve temas de fábrica, pero el catálogo es **abierto**: un
plugin puede aportar los suyos en tiempo de ejecución.

```ts
import { registerThemePreset, registerTokens } from '@openfactu/ui';

// Al activar el plugin
const baja = registerThemePreset({
  id: 'acme-corporativo',
  label: 'Acme corporativo',
  description: 'Azul de marca sobre fondo claro.',
  theme: { mode: 'light', colors: { primary: '#1e3a8a', accent: '#2563eb' } },
}, { source: 'plugin-acme' });

registerTokens('plugin-acme', { '--acme-ancho-panel': '280px' });

baja();                        // al desactivarlo
unregisterThemeSource('plugin-acme');   // o de golpe, todo lo suyo
```

El registro **comprueba el tema antes de aceptarlo**: un color mal formado lo
rechaza, y si el contraste no llega al mínimo avisa por consola diciendo qué
combinación falla. `validateTheme(theme)` devuelve ese mismo informe si
prefieres enseñarlo en tu interfaz.

En React, `useThemePresets()` devuelve el catálogo y se repinta solo cuando
entra o sale un tema. `detectPreset(theme)` dice cuál está activo (o `null` si
es a medida).

### Material, fondo, densidad, movimiento y texto

Además de colores, radio y tipografía, un tema puede cambiar cómo se *sienten*
las superficies y cuánto espacio y movimiento hay. Con los valores de fábrica no
cambia nada; cada eje es opcional.

```ts
registerThemePreset({
  id: 'cristal', label: 'Cristal', description: 'Translúcido sobre una aurora.',
  theme: {
    mode: 'dark',
    colors: { primary: '#0d0a24', accent: '#8b7bff' },
    radius: 'lg',
    material: { blur: 22, alpha: 0.58, saturate: 1.5,          // superficies de cristal
                border: 'rgb(255 255 255 / .16)', highlight: 'inset 0 1px 0 rgb(255 255 255 / .14)' },
    backdrop: 'radial-gradient(60% 55% at 12% 8%, #4c2fb8, transparent 70%), #0d0a24', // lo que se difumina
    density: 'compact',                                         // 'compact' | 'normal' | 'comfortable' | número
    motion: { speed: 'fast', easing: 'cubic-bezier(.23, 1, .32, 1)' }, // 'none' | 'fast' | 'normal' | 'slow' | número
    typography: { scale: 1.05 },                                // escala del texto
  },
});
```

- **Cristal**: con `blur > 0` o `alpha < 1`, `applyTheme` pone `data-k-material` y las
  superficies (tarjetas, diálogos, menús, listas, el espacio de trabajo y el compositor
  de IA) se vuelven translúcidas y difuminan el fondo. Un `backdrop` activa
  `data-k-backdrop`. Para tematizar un subárbol: `<div style={themeToStyle(t)} {...themeToAttrs(t)}>`.
  Con `prefers-reduced-transparency` o colores forzados las superficies vuelven a ser opacas.
- **Densidad, movimiento y texto** actúan a través del preset de Tailwind: el espaciado
  (`p-4`, `gap-2`, `h-9`…), las duraciones (`duration-200`) y los tamaños con nombre
  (`text-sm`) se multiplican por `--k-density`, `--k-motion` y `--k-text-scale`. Los
  valores arbitrarios (`px-[10px]`, `text-[12px]`) no se escalan.
- **Fundido al cambiar de tema**: `applyTheme(tema, undefined, { transition: true })` (o un número de ms) anima colores,
  bordes y sombras durante el cambio. Respeta `prefers-reduced-motion` y `motion.speed`.
- **Sombras**: `shadows: { sm, md, lg, xl, overlay }`. Las utilidades `shadow-*` del preset de Tailwind leen
  estos tokens (con los valores de fábrica son las mismas de Tailwind), así que un tema de sombras duras
  alcanza también a diálogos, paneles y menús.
- **Bordes, foco y selección**: `border: { width }` cambia el grosor de `border` y `divide-*`
  (vía el preset); `focus: { width, offset, color, style }` unifica el anillo de foco de teclado
  y `selection: { background, color }` colorea la selección de texto. Si el tema no define
  `focus` o `selection`, cada componente conserva el suyo.
- **Fondo en movimiento**: `backdropMotion: 'drift'` desplaza despacio el `backdrop` (solo
  `transform`, sin repintar). Se corta con `prefers-reduced-motion` y con `motion.speed: 'none'`.
- **Exportar e importar**: `themeToJson(tema)`, `themeFromJson(texto)` (solo datos, con los avisos de
  `validateTheme`) y `themeToPresetSource({ id, label }, tema)`, que genera el
  `registerThemePreset(…)` listo para pegar. La story `ThemeEditor → Editor` los usa para ajustar
  cada eje en vivo.
- `validateTheme` avisa de un cristal sin fondo o de texto ilegible sobre el cristal
  (mide la superficie translúcida sobre los colores hexadecimales del `backdrop`).

### Cómo elegir el color de un texto

La escala `--k-ink-*` es una **paleta fija**: sirve igual para texto que para
fondos (el degradado del `Avatar`), así que no cambia con el modo. Lo que
responde al tema es la capa semántica, y es a la que deben apuntar los textos:

| Token | Para qué |
|---|---|
| `--fg-default` | títulos y texto principal |
| `--fg-body` | texto corriente |
| `--fg-muted` | texto secundario, metadatos |
| `--fg-subtle` | marcadores de posición, iconos, texto de ayuda |

Lo mismo con los colores de estado: `--k-danger` es para **rellenos y marcas**;
como texto va `--k-danger-fg`, que en modo oscuro sube el tono para seguir
siendo legible.

## Gráficos

Las visualizaciones pequeñas (`Sparkline`, `Ring`, `StackedBar`) son SVG propio
y salen de la entrada principal, sin dependencias.

Los gráficos completos viven en una **subruta aparte** porque usan `recharts`,
declarada como peerDependency **opcional**: si no pintas gráficos, no tienes que
instalarla y la entrada principal sigue sin dependencias de terceros.

```bash
npm install recharts   # solo si usas @openfactu/ui/charts
```

```tsx
import { Chart } from '@openfactu/ui/charts';

<Chart
  type="line"
  data={movimientos}
  xKey="mes"
  series={[
    { key: 'ventas', label: 'Ventas' },
    { key: 'compras', label: 'Compras' },
  ]}
  valueFormat={(v) => `${v.toLocaleString('es-ES')} €`}
/>
```

El componente absorbe el contenedor responsivo, el tooltip, los ejes y la
rejilla derivados del tema, el formato de miles del eje y el estado vacío.

**La paleta de series no se elige a ojo**: el orden de las ocho ranuras se
seleccionó ejecutando el validador de paletas y conservando solo una ordenación
que supera todas las comprobaciones (incluida la separación para daltonismo) en
claro y en oscuro. De ahí salen tres reglas que el componente aplica solo:

- Los colores se reparten **en orden y sin ciclar**; a partir de la octava serie
  toca agrupar en «Otros» en vez de inventar tonos.
- El color va ligado a la **entidad**, no a su puesto en un ranking: filtrar no
  repinta las series que quedan (para eso está `colorBy`).
- Los roles semánticos (`positive`, `negative`, `warning`, `neutral`) están
  **reservados**: significan lo mismo en todos los gráficos y no se reparten
  como una serie más.

Si tocas `src/charts/palette.ts`, hay que volver a pasar el validador.

## Componentes

Formulario
: `Field` · `FormSection` · `FormGrid` · `Input` · `Textarea` · `CodeEditor` · `Select` ·
`SearchableSelect` · `NumberInput` · `CurrencyInput` · `PercentInput` ·
`PasswordInput` · `SearchInput` · `ColorInput` · `FileDropzone` · `DatePicker` ·
`Checkbox` · `Switch` · `RadioGroup`

Datos
: `Table` · `EditableTable` · `List` · `Card` · `KpiCard` · `Badge` ·
`Progress` · `Avatar` · `EmptyState` · `Skeleton` (+ `SkeletonList`,
`SkeletonTable`, `SkeletonPage`)

Gráficos
: `Sparkline` · `Ring` · `StackedBar` · `Chart` (en `@openfactu/ui/charts`)

Navegación
: `PageHeader` · `SegmentedControl` · `Tabs` · `Pagination` · `Breadcrumbs` ·
`NavItem` · `NavGroup` · `FilterBar` · `BulkActionsBar`

Superposiciones
: `CommandPalette` · `Modal` · `Drawer` · `ConfirmDialog` · `DropdownMenu` · `ContextMenu` ·
`Tooltip` · `Popup` · `Toast` · `Loader` · `GlobalLoader` · `Transition`

Hooks
: `usePopover` · `useAnimatedPresence` · `useScrollLock` · `useFocusTrap` ·
`useDebouncedValue` · `useColorScheme` · `useMediaQuery` ·
`usePrefersReducedMotion` · `useThemePresets` · `useContextMenu` · `useToast` ·
`usePopup` · `useTheme`

## Desarrollo

```bash
npm run dev        # playground (Ladle) en http://localhost:61000
npm run build      # compila a dist/
npm run typecheck  # comprueba también las stories
npm test           # edición, lenguajes, temas y contraste automático
npm run test:browser # regresiones reales; requiere Ladle en marcha y Chrome
npm run shots -- .shots/base   # capturas de todas las stories, claro y oscuro
npx tsx scripts/check-contrast.mts        # contraste real de los textos bajo un tema
npx tsx scripts/check-tokens.mjs          # el CSS publicado y el motor TS coinciden
```

Las stories viven en `stories/`, una por componente. `scripts/shots.mjs`
captura todas en ambos modos y compara dos carpetas
(`node scripts/shots.mjs --diff .shots/base .shots/nuevo`), que es la red de
seguridad para cambios transversales. `scripts/check-tokens.mjs` comprueba que
el CSS publicado y el motor de temas en TypeScript producen los mismos valores,
y `scripts/check-contrast.mts` mide el contraste real de cada texto bajo el tema
que se le indique (compone las capas translúcidas y congela las transiciones,
para no medir colores a mitad de camino).

## Editor de código

`CodeEditor` edita un documento con resaltado léxico propio: no descarga
gramáticas, fuentes ni motores de terceros. Usa React y un `textarea` nativo.
Importa `@openfactu/ui/styles.css`, como para el resto de la librería.

```tsx
import { CodeEditor, type CodeEditorThemeValue } from '@openfactu/ui';

const [code, setCode] = useState('const total = 120;');
const [editorTheme, setEditorTheme] = useState<CodeEditorThemeValue>('auto');

<CodeEditor
  label="Código"
  value={code}
  onChange={setCode}
  language="typescript"
  theme={editorTheme}
  onThemeChange={setEditorTheme}
  height={320}
  tabSize={2}
/>
```

El contenido es controlado (`value` / `onChange`). También admite `ref` al
`textarea`, `readOnly`, `disabled`, `required`, `placeholder`, `helperText`,
`error` y atributos accesibles nativos. Un cambio externo de `value` reinicia
el historial; devolver el valor recibido en `onChange` lo conserva.
El historial mantiene hasta 100 entradas con un límite de memoria aproximado.

Incluye `javascript`, `typescript`, `html`, `css`, `json`, `sql`, `yaml` y
`plaintext`. Un identificador desconocido usa texto plano. El resaltado es
léxico: no valida sintaxis, tipos ni código incrustado de otros lenguajes.

| Atajo | Acción |
|---|---|
| Tab / Mayús+Tab | Sangrar / quitar sangría, también en bloques |
| Intro | Mantener sangría; añadir nivel después de una apertura |
| Ctrl+Espacio | Sugerencias de palabras clave y del documento |
| ↑ / ↓, Intro o Tab | Elegir y aceptar una sugerencia |
| Ctrl/Cmd+Z / Ctrl/Cmd+Mayús+Z | Deshacer / rehacer |
| Ctrl/Cmd+F o Ctrl/Cmd+H | Buscar y reemplazar texto literal |
| Esc | Cerrar sugerencias/búsqueda; después liberar Tab para salir |

También hay botones para buscar, deshacer y rehacer. Se permite redimensionar
verticalmente y desplazar horizontalmente; las líneas no se ajustan.
En documentos largos, el resaltado y los números se dibujan solo para las líneas
visibles; el texto completo sigue disponible para editar, buscar y copiar.

### Temas del editor

`auto` sigue los tokens de la aplicación. Además de `light`, `dark` y
`high-contrast`, incluye `monokai`, `dracula`, `nord`, `one-dark`,
`github-light`, `solarized-light` y `solarized-dark`.
Cambiar el tema del editor no modifica el de la app ni
el de otros editores, y conserva contenido, selección, posición e historial.

Con `defaultTheme="dark"` el editor gestiona internamente su tema. Para
controlarlo desde la aplicación, usa `theme` y `onThemeChange`. El selector
está visible por defecto; `showThemeSelector={false}` lo oculta.

Para mostrar solo el área de código, usa `minimal`. Oculta las herramientas,
el selector de temas, los números y la barra de estado; mantiene la edición,
el autocompletado (incluido `getCompletions`) y los atajos. `label`,
`helperText` y `error` siguen siendo opcionales.

```tsx
<CodeEditor value={code} onChange={setCode} theme="monokai" minimal />
```

### Movimiento opcional

`motion` activa un cursor que acompaña los cambios de posición, una transición
corta de la línea activa y una selección de texto animada. También funciona
en modo `minimal`:

```tsx
<CodeEditor value={code} onChange={setCode} theme="monokai" minimal motion />
```

Está desactivado por defecto. Las transiciones duran 100 ms y se pueden
interrumpir con la siguiente acción. El arrastre y el desplazamiento del
documento siguen directamente al ratón, sin retraso añadido.
Al escribir, borrar o pegar, el cursor se coloca al instante; solo se anima
al navegar por el texto. La composición
de texto, el movimiento reducido y los colores forzados conservan el cursor y
la selección nativos. La escritura, los atajos y el historial siguen siendo
los del mismo editor.

Un tema personalizado hereda una base y sobreescribe solo los colores necesarios:

```tsx
<CodeEditor
  label="Configuración"
  value={code}
  onChange={setCode}
  defaultTheme={{
    label: 'Bosque',
    base: 'dark',
    colors: { background: '#10251c', keyword: '#bef264', foreground: '#f0fdf4' },
  }}
/>
```

`CodeEditorColors` permite ajustar `background`, `foreground`, `muted`,
`border`, `selection`, `selectionForeground`, `cursor`, `activeLine`,
`keyword`, `string`, `number`, `comment`, `operator`, `punctuation`, `tag`
y `attribute`. Los presets se exportan como `CODE_EDITOR_THEMES`. Las
paletas incluidas tienen contraste AA; quien personaliza colores controla
el contraste de su paleta.

Las paletas se adaptan de [Monokai en VS Code](https://github.com/microsoft/vscode/blob/main/extensions/theme-monokai/themes/monokai-color-theme.json),
[Dracula](https://github.com/dracula/draculatheme.com/blob/main/content/spec.mdx),
[Nord](https://www.nordtheme.com/docs/colors-and-palettes/),
[One Dark](https://github.com/atom/one-dark-syntax/blob/master/styles/colors.less),
[GitHub](https://github.com/primer/github-vscode-theme) y
[Solarized](https://ethanschoonover.com/solarized/), ajustando algunos tonos
para que el texto pequeño siga siendo legible, también en la línea activa.

### Lenguajes y sugerencias personalizados

```tsx
const formula: CodeLanguageDefinition = {
  id: 'formula',
  label: 'Fórmula',
  keywords: ['SUMA', 'IVA'],
  pairs: { '(': ')' },
  indentAfter: ['('],
  tokenize: text => [...text.matchAll(/\b(SUMA|IVA)\b/g)].map(match => ({
    start: match.index!, end: match.index! + match[0].length, type: 'keyword',
  })),
};

<CodeEditor
  value={code}
  onChange={setCode}
  aria-label="Fórmula"
  language="formula"
  languages={[formula]}
  getCompletions={({ prefix }) => prefix.startsWith('SU')
    ? [{ label: 'SUMA', insertText: 'SUMA()', detail: 'Función' }]
    : []}
/>
```

Importa `CodeLanguageDefinition` desde la entrada principal. También puedes
pasar la definición directamente en `language`. Los rangos del tokenizador
usan posiciones UTF-16, con final exclusivo, ordenadas y sin solaparse; los
huecos se muestran como texto normal. Si el tokenizador falla o devuelve
rangos inválidos, el documento sigue siendo editable como texto plano.
`CODE_LANGUAGES` exporta las definiciones incluidas. `getCompletions` es una
función local y síncrona; sus sugerencias prevalecen sobre las automáticas
cuando comparten etiqueta.

No incluye gestión de archivos, ejecución, terminal ni análisis semántico.
Las pruebas de navegador aceptan `LADLE_URL` y `CHROME_PATH` si el playground
o Chrome están en otra ubicación. Reinicia Ladle si estaba abierto antes de
añadir las stories del editor.

## Herramientas del compositor (`@openfactu/ui/ai`)

La barra del compositor reúne en una fila adjuntar, herramientas, modelo, voz y
enviar. Adjuntar y voz vienen de fábrica; **el resto es un registro** que una
aplicación o un plugin amplía en tiempo de ejecución, sin tocar la librería:

```tsx
import { registerComposerTool, unregisterComposerToolSource } from '@openfactu/ui/ai';

const baja = registerComposerTool({
  id: 'web', label: 'Buscar en la web', icon: <Globe size={15} />,
  kind: 'toggle',                       // 'action' (por defecto) ejecuta onSelect
  order: 10,                            // menor primero
  when: ({ model }) => model?.capabilities?.attachments !== false,
}, { source: 'plugin-busqueda' });

baja();                                          // al desactivar el plugin
unregisterComposerToolSource('plugin-busqueda'); // o todo lo suyo de golpe
```

Las herramientas `toggle` guardan su estado en `draft.tools` (ids activos), que
llega a `onSubmit`. Con más de `maxInlineTools` (3 por defecto) el resto pasa al
menú «+». `<AIComposer tools={[…]}>` añade herramientas solo a esa instancia, y
`render` permite un control propio. `useComposerTools()` devuelve el catálogo
reactivo.

## IA sobre código (`@openfactu/ui/ai`)

- **`AICodeBlock`**: además de copiar y descargar, muestra las acciones de IA
  registradas, **Ejecutar** (la salida aparece bajo el bloque) y **Aplicar**.
- **`AICodeDiff`**: cambios propuestos en vista unificada, con aceptar o
  descartar; pliega las líneas sin cambios lejanas. También como parte de
  mensaje: `{ type: 'diff', id, original, modified, language }`.
- **Selección**: en el panel de resultados, al seleccionar código aparecen las
  acciones con `scope: 'selection'`; `apply` sustituye solo el fragmento.

`AIWorkspace` lo conecta solo: `onApplyCode`, `onRunCode`, `onAcceptDiff` y
`onRejectDiff` en sus `actions`, y las acciones «preguntan» al asistente con
`onSubmit`. Fuera de él, envuelve con `<AICodeProvider onAsk onApplyCode onRunCode …>`.

Las acciones son un **registro**, como las herramientas del compositor. Vienen
tres de fábrica (Explicar, Mejorar, Añadir pruebas; `source: 'ui'`):

```tsx
registerCodeAction({
  id: 'docs', label: 'Documentar', icon: <FileText size={14} />, scope: 'both',
  run: ({ code, selection, ask }) => ask?.(`Documenta:\n\n${selection?.text || code}`),
}, { source: 'plugin-docs' });
unregisterCodeActionSource('ui'); // retirar las de fábrica
```

## Elementos del agente (`@openfactu/ui/ai`)

Piezas para enseñar lo que hace un agente, inspiradas en los *AI Elements* de shadcn y construidas
sobre un único primitivo, **`AITrace`**: una línea (icono, título, descripción, estado) que se abre
en su contenido.

| Componente | Para qué |
|---|---|
| `AIReasoning` | Lo que «piensa» el modelo: se abre mientras piensa, se cierra al acabar (lo que el usuario decide manda) y muestra «Pensó durante 5 s». |
| `AIPlan`, `AIQueue` | Pasos con estado («2 / 5 hechos» y barra) y lista *Por hacer / Completadas*. |
| `AIChainOfThought` | «Investigó en 3 pasos», con las fuentes como chips de dominio. |
| `AITerminal` | Un comando con su salida en vivo; quita los códigos ANSI, sigue el final y copia. |
| `AIStackTrace` | Un `error.stack`: tipo y mensaje, trazas propias (clicables con `onFilePathClick`) y las internas (`node_modules`, `node:`) plegadas aparte. |
| `AITestResults` | Totales, suites plegables (las que fallan se abren) y el error de cada prueba. |
| `AIFileTree` | Archivos modificados en carpetas plegables, con estado (`added`/`modified`/`deleted`) y `+/−`. |
| `AICheckpoint` | Separador entre turnos al que se puede volver (`onRestore`). |
| `AIContextUsage` | Porcentaje de la ventana de contexto, con el detalle al pasar o enfocar. `state.usage` lo pone en la cabecera del espacio de trabajo. |
| `AIInlineCitation` | Chip con el dominio dentro de la frase y ficha de la fuente. |

En los mensajes son partes nuevas (`reasoning`, `plan`, `queue`, `steps`, `terminal`, `stack`,
`tests`, `files`, `checkpoint`); `actions.onOpenFile` y `actions.onRestoreCheckpoint` las conectan.
Como el resto, **el catálogo es abierto**: un plugin registra su propia parte y los mensajes la usan
con `{ type: 'custom', kind, data }`:

```tsx
registerMessagePart('invoice', ({ data }) => <InvoiceCard invoice={data as Invoice} />, { source: 'plugin-facturas' });
```

`parseStackTrace`, `stripAnsi`, `buildFileTree`, `summarizeTests` y `contextUsage` se exportan por si
quieres tu propia vista. Todo usa los tokens del tema (acento, radios, sombras, movimiento y cristal).

## Iconos

La librería **no impone nombres de iconos ni una librería de iconos**. En tu código escribes los nombres de
**la librería que uses** (`FiHome`, `Home`, `HouseIcon`, `mdi:home`…) y los componentes de la librería
pintan su interfaz (la X de cerrar, los chevrons, el spinner…) con los iconos de esa misma biblioteca.

```tsx
import * as Fi from 'react-icons/fi';
import { registerIconLibrary, iconLibraryFromModule, Icon } from '@openfactu/ui';

registerIconLibrary(iconLibraryFromModule(Fi));   // una vez, al arrancar

<Icon name="FiHome" size={16} />                   // el nombre es el de react-icons, tal cual
```

Detrás hay dos cosas separadas:

- **`<Icon name="…" />`** busca ese nombre en las bibliotecas activas: la del `IconProvider` más cercano → las
  registradas (la última, primero) → Lucide. Sin nada registrado funciona con Lucide (`<Icon name="Search" />`).
- **Los huecos de la interfaz** (`x`, `chevron-down`, `search`, `loader-2`… ver `ICON_SLOTS`) los pide la propia
  librería. Cada biblioteca declara con qué los rellena (`slots`); `iconLibraryFromModule` lo hace solo
  (detecta si tu librería llama `FiChevronDown`, `ChevronDownIcon` o `IconChevronDown` y prueba los nombres
  habituales de `ICON_ALIASES`). Lo que una biblioteca no rellene lo cubre la siguiente, y al final Lucide, así
  que una biblioteca incompleta nunca deja un hueco vacío. Tú no escribes esos nombres.

### Formas de aportar una biblioteca

```tsx
// 1. Un módulo entero (react-icons, Phosphor, Heroicons, Tabler, Material…). Los nombres son los suyos.
registerIconLibrary(iconLibraryFromModule(Ph, { stroke: false, props: { weight: 'regular' } }));   // <Icon name="HouseIcon" />
registerIconLibrary(iconLibraryFromModule(Hero, { size: 'style', stroke: false }));                  // <Icon name="HomeIcon" />

// 2. Iconos sueltos, con los nombres que quieras (lo mejor para no cargar una librería entera).
registerIconLibrary(iconLibraryFromIcons({ Casa, Cruz, Lupa }, { slots: { x: 'Cruz', search: 'Lupa' } }));

// 3. Una librería que se pide por nombre a un catálogo (Iconify).
registerIconLibrary(iconLibraryFromResolver(
  (name, props) => <IconifyIcon icon={name} width={props.size} height={props.size} className={props.className} />,
  { slots: { x: 'mdi:close', check: 'mdi:check', search: 'mdi:magnify', 'chevron-down': 'mdi:chevron-down' } },
));

// 4. Solo un panel
<IconProvider library={miBiblioteca}>…</IconProvider>
```

- **Tamaño y trazo.** Las librerías los reciben de formas distintas. `iconLibraryFromModule` acepta
  `size` (`'size'`, `['width','height']` o `'style'` para Heroicons/Material), `stroke` (`'strokeWidth'`, `'stroke'`
  para Tabler o `false`) y `props` fijas (`{ weight: 'regular' }`); `adaptIcon(Componente, opciones)` hace lo
  mismo para un solo componente.
- **Sin ninguna librería**: `iconFromPaths('M5 12h14')` (trazado SVG) e `iconFromSprite('/iconos.svg#x')` crean el
  componente que le das a `iconLibraryFromIcons`.
- **Qué rellena una biblioteca**: `describeIconLibrary(biblioteca)` devuelve `{ filled, missing }`; al construirla,
  los que falten se avisan por consola (`quiet: true` lo calla). Fíjalos con `slots` o `prefix`/`suffix`.
- **Lucide por defecto** solo incluye los iconos que la interfaz necesita, para no inflar el paquete de quien no
  lo usa. Si quieres todos sus nombres: `iconLibraryFromModule(LucideReact)`.
- Los componentes que reciben un icono como prop (`NavItem`, `NavGroup`, `Input`…) aceptan el componente de
  cualquier librería.
- `node scripts/check-icons.mjs` falla si algún componente importa una librería de iconos directamente.

## Avisos (toasts)

```tsx
<ToastProvider position="bottom-right" variant="minimal">…</ToastProvider>

const toast = useToast();
toast.success('Factura guardada', { description: 'FAC/2026/0042', action: { label: 'Ver', onClick: abrir }, cancel: { label: 'Ahora no', onClick: () => {} } });
toast.promise(guardar(), { loading: 'Guardando…', success: 'Guardado', error: (e) => e.message });
```

- **Pila apilada** (`layout="stacked"`, por defecto): como Sonner, los avisos viejos asoman detrás del último,
  encogidos, y la pila se **abre al pasar el ratón** (o con un toque en táctil; otro fuera la cierra). Mientras está
  abierta, las cuentas atrás se detienen. `visibleToasts` (3) limita las capas visibles, `expand` la deja siempre abierta
  y `gap` separa los avisos abiertos. `layout="list"` recupera la columna plana de antes.
- **Formas** (`variant`): `accent` (tarjeta neutra con pastilla de estado), `soft`, `solid`, `outline`, `minimal`
  (sobrio, sin pastilla), `glass` (translúcido, con independencia del tema) e `invert` (oscuro sobre claro y al revés).
- **Opciones por aviso**: `description` (el mensaje pasa a ser el encabezado), `action` y `cancel`, `icon` (propio o
  `false`), `closeStyle: 'corner'` (X en la esquina al pasar el ratón), `duration` (`0` = fijo), `onDismiss`,
  `dismissible`, `id` (repetirlo sustituye en vez de apilar) y la animación (`slide`, `fade`, `scale`, `lift`).
- **Tipos**: `message` (sin icono), `success`, `error`, `info`, `warning`, `loading`, `promise` y
  `custom((id) => <Tu JSX />)`, donde pintas el contenido y el aviso aporta la pila, el temporizador, la entrada y el
  arrastre.
- Una barra fina muestra el tiempo restante y se detiene con el ratón encima. Todo sigue los tokens del tema (radios,
  sombras, movimiento, cristal); con movimiento reducido no hay animaciones y los errores se anuncian de forma asertiva.

## Tablas editables

`EditableTable` cubre los dos patrones de siempre sin escribir el editor a mano.
Los controles se **declaran**, no se pintan:

```tsx
<EditableTable
  mode="cell"                       // 'row' para el CRUD con Guardar/Cancelar
  columns={[
    { header: 'Artículo', accessor: 'articulo',
      editor: { type: 'search-select', options: articulos },
      isDisabled: (l) => !!l.origen },      // líneas que vienen de un pedido
    { header: 'Cantidad', accessor: 'cantidad', align: 'right',
      editor: { type: 'number', precision: 2 } },
    { header: 'Precio', accessor: 'precio', align: 'right',
      editor: { type: 'currency' } },
  ]}
  data={lineas}
  onChange={actualizarLinea}
  onAddRow={nuevaLinea}
  summaryRow={() => [null, null, money(total)]}   // pie alineado con las columnas
/>
```

En `mode="row"` la fila entera entra en edición: **Intro guarda y Escape
cancela**. Los tipos de editor disponibles son `text`, `number`, `currency`,
`percent`, `select`, `search-select`, `date`, `checkbox` y `custom`.

## Tablas en móvil

`Table` acepta `responsive="cards"`: por debajo del punto de corte pinta una
tarjeta por fila en lugar de obligar a desplazarse en horizontal. El papel de
cada columna se declara con `card`:

```tsx
<Table
  responsive="cards"
  columns={[
    { header: 'Número', accessor: 'numero', card: 'title' },
    { header: 'Cliente', accessor: 'cliente', card: 'subtitle' },
    { header: 'Estado', cell: estadoBadge, card: 'status' },
    { header: 'Total', accessor: total, align: 'right', card: 'meta' },
  ]}
/>
```

Lo que no lleve `card` va al cuerpo de la tarjeta con su etiqueta delante.

## Convenciones

- **Clases Tailwind literales**: nunca construidas por concatenación
  (`bg-${variante}` no funciona con el JIT del consumidor). Se usan mapas de
  cadenas completas.
- **Variables con valor de reserva**: `bg-[var(--bg-card,#ffffff)]`, para que un
  consumidor que no importe la hoja de estilos siga viendo la marca por defecto.
- La escala `--k-ink-*` / `--k-line*` / `--k-surface` es una **paleta fija**; lo
  que responde al modo claro/oscuro es la capa semántica (`--bg-*`, `--fg-*`,
  `--border-*`). Los componentes deben apuntar a esta última.
