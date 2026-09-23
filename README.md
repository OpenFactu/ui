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

`THEME_PRESETS` trae doce temas de fábrica, pero el catálogo es **abierto**: un
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
: `Field` · `FormSection` · `FormGrid` · `Input` · `Textarea` · `Select` ·
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

Estructura y fichas
: `AppShell` · `DescriptionList` · `Alert`

## Estilos y componentes para ERP

Abre **DesignSystem → EstilosERP** en Ladle para comparar tres líneas visuales
en la misma pantalla. Cambian la paleta, las superficies, la tipografía, los
radios y las sombras; los componentes y sus datos se mantienen.

| Preset | Estilo | Tabla del ejemplo |
|---|---|---|
| `keirost-soft` | Claro, violeta, superficies elevadas y bordes redondeados | Lisa, densidad normal |
| `keirost-ledger` | Papel cálido, títulos serif y bordes rectos | Rejilla, densidad normal |
| `keirost-terminal` | Oscuro, verde y tipografía monoespaciada | Filas alternas, densidad compacta |

```tsx
import { applyTheme, ERP_THEME_PRESETS } from '@openfactu/ui';

applyTheme(ERP_THEME_PRESETS.find((preset) => preset.id === 'keirost-soft')!.theme);
```

`ERP_THEME_PRESETS` contiene esos tres estilos y también forma parte del
catálogo general `THEME_PRESETS`. Los presets clásicos conservan su orden y
el tema predeterminado no cambia. La apariencia de cada componente se elige
explícitamente: aplicar el tema no modifica su comportamiento ni su densidad.

| Componente | Nuevas opciones |
|---|---|
| `Table` | `variant="default"`, `"striped"` o `"grid"`; `headerVariant="muted"` |
| `Card` | `variant="outlined"`, `"elevated"`, `"subtle"` o `"ghost"` |
| `Button` | `variant="soft"` y `"link"`, además de las variantes existentes |

Las filas alternas siguen el tema y respetan la selección, el hover y las
columnas fijas. La rejilla añade separadores verticales. Las variantes de
tabla afectan a la presentación tabular; `responsive="cards"` conserva el
formato de ficha al pasar a móvil.

### AppShell

Marco de aplicación con cabecera, navegación plegable y scroll independiente.
En móvil, el menú es un diálogo con bloqueo de scroll, retención del foco,
cierre con Escape y restauración del foco. No depende de un router concreto.

```tsx
<AppShell
  brand={<span>Mi ERP</span>}
  compactBrand={<span>ERP</span>}
  header={<span>Mi empresa · Inventario</span>}
  sidebar={({ collapsed, close }) => (
    <nav aria-label="Secciones">
      <a href="/inventario" onClick={close} aria-label="Inventario">
        {collapsed ? 'INV' : 'Inventario'}
      </a>
    </nav>
  )}
>
  <PageHeader title="Inventario" />
</AppShell>
```

`collapsed`/`onCollapsedChange` permiten controlar el plegado; también hay
`defaultCollapsed`, `sidebarFooter`, `sidebarWidth`, `collapsedWidth`, `height`
y `contentClassName`. La navegación recibe `collapsed`, `mobile` y `close`.
Si utilizas enlaces de tu router, llama a `close` al navegar en móvil.

### DescriptionList y Alert

```tsx
<DescriptionList
  columns={2}
  variant="surface"
  items={[
    { key: 'cliente', label: 'Cliente', value: 'Acme S.L.' },
    { key: 'saldo', label: 'Saldo', value: '1.250,00 €', mono: true },
    { key: 'notas', label: 'Notas', value: null, fullWidth: true },
  ]}
/>

<Alert tone="warning" title="Stock insuficiente" action={<Button variant="soft">Revisar</Button>}>
  Revisa las existencias antes de confirmar el pedido.
</Alert>
```

`DescriptionList` ofrece una, dos o tres columnas, disposición `stacked` o
`inline` y variantes `plain`, `divided` y `surface`. Usa `dt`/`dd`, conserva
valores como cero y muestra `emptyValue` para valores ausentes.

`Alert` ofrece tonos `info`, `success`, `warning`, `danger` y `neutral`, variantes
`soft`/`outline`, icono opcional, acción y `onDismiss`. Su rol predeterminado es
`note`: usa `role="status"` para cambios informativos y `role="alert"` para un
error urgente después de una acción. `Button variant="link"` sigue siendo un
botón de acción; para navegar utiliza un enlace.

## Desarrollo

```bash
npm run dev        # playground (Ladle) en http://localhost:61000
npm run build      # compila a dist/
npm run typecheck  # comprueba también las stories
npm run test:design # estilos, variantes y navegación de AppShell (con Ladle abierto)
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

## Listados para ERP

La story **ERP → Facturacion** reúne búsqueda por factura/cliente, filtros con
chips, densidad, paginación, columnas configurables, selección entre páginas,
exportación CSV, detalle, alta de borradores y registro de cobros. Funciona en
claro y oscuro, y cambia a tarjetas en móvil. Los datos son de ejemplo y los
cambios solo viven en memoria.

`FilterBar` admite `showActiveFilters`, `resultCount` y un slot `actions` para
controles de vista. Sus props se exportan como `FilterBarProps`. Los filtros
conservan su nombre accesible después de seleccionar un valor.

### Ordenación desde una API

```tsx
const [sort, setSort] = useState<TableSort | null>(null);
const [page, setPage] = useState(1);
const [pageSize, setPageSize] = useState(25);
// Incluye sort, page y pageSize en la consulta de tu API.

<Table
  ariaLabel="Facturas"
  columns={columns}
  data={response.items}
  rowKey={(invoice) => invoice.id}
  sort={sort}
  onSortChange={setSort}
  sortMode="server"
  pagination={{
    page, pageSize, total: response.total,
    onPageChange: setPage,
    onPageSizeChange: setPageSize,
  }}
/>
```

`TableSort` tiene la forma `{ colKey: string, dir: 'asc' | 'desc' }`;
`colKey` es `column.id ?? column.header`. El ciclo es ascendente, descendente y
sin orden (`null`). En modo servidor la tabla **no reordena la página recibida**.
El modo predeterminado sigue siendo cliente; `defaultSort` permite un orden
inicial sin controlar el estado. Ordenar o cambiar el tamaño de página emite
`onPageChange(1)`, también con paginación controlada.

Los códigos se ordenan como texto natural (`A-2` antes de `A-10`), conservando
sus letras. Usa números en el `accessor` y `cell` para formatear importes, o
devuelve el valor original en `sortAccessor`. No se intenta interpretar un
importe localizado como `1.234,56 €`; su formato puede ser ambiguo.

### Selección y navegación

- `isRowSelectable={(row) => !row.locked}` excluye filas tanto de la casilla
  individual como de «Seleccionar página». La selección de otras páginas se
  conserva; la aplicación decide si la limpia al filtrar o al completar una acción.
- Usa `id` o `rowKey` estable para datos remotos o que cambien de orden. Sin
  ellos, la alternativa es el índice del dato original: funciona al ordenar y
  paginar en cliente, pero no representa una identidad persistente entre consultas.
- Los encabezados ordenables son botones accesibles con `aria-sort`. Las filas
  con `onRowClick` se abren con Intro o Espacio, sin interceptar controles internos.
- `maxHeight={560}` limita el área de scroll de la tabla y mantiene su cabecera
  visible. En tarjetas se ofrecen selección de página, ordenación, visibilidad
  de columnas y apertura del detalle expandido.

### Comprobación del flujo

Con Ladle abierto en otra terminal (`npm run dev`):

```bash
npx playwright-core install chromium   # solo la primera vez
npm run test:erp
```

El script admite `LADLE_URL` (por defecto `http://localhost:61000`) y
`CHROME_PATH` si prefieres usar un Chrome instalado. Comprueba selección entre
páginas, orden estable, teclado, paginación controlada, filtros, exportación,
alta de borradores y el flujo móvil.

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
