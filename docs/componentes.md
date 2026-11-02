# Componentes

El catálogo general, y cómo personalizar lo que muestra opciones.

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

Estructura y fichas
: `AppShell` · `DescriptionList` · `Alert`

### Opciones y menús a medida

Todo lo que muestra opciones o elementos elegibles se personaliza igual, con el mismo estado y los mismos nombres. La fila, el teclado, la búsqueda y la accesibilidad siguen siendo del componente.

| Componente | Pintar | Clases | Además |
| --- | --- | --- | --- |
| `Select`, `SearchableSelect` | `renderOption`, `renderValue` | `optionClassName` | `selectedStyle` (`fill`, `soft`, `check`, `none`). `SearchableSelect`: `renderChip` |
| `DropdownMenu`, `ContextMenu`, `useContextMenu`, `SplitButton` | `renderItem` | `itemClassName` | Cada elemento admite `description` |
| `CommandPalette` | `renderItem` | `itemClassName` | |
| `SearchInput` | `renderSuggestion` | `suggestionClassName` | |
| `RadioGroup`, `ChoiceCards` | `renderOption` | `optionClassName` | `indicator={false}` quita la marca. La marcada lleva `data-checked` |
| `SegmentedControl` | `renderOption` | `optionClassName` | |
| `ToggleGroup` | `renderItem` | `itemClassName` | |
| `TagInput` | `renderTag` | `tagClassName` | |
| `FilterBar` (`config`), `EditableTable` (`editor`) | `customize` | `customize` | Pasa lo de `Select` a sus desplegables |
| `Tabs` | `renderItem` | `itemClassName` | El rol, el teclado y el indicador siguen siendo suyos |
| `Accordion` | `renderItem`, `renderIndicator` | `itemClassName` | `selected` dice si está abierto |
| `Stepper` | `renderItem`, `renderMarker` | `itemClassName` | `selected` es el paso actual |
| `Timeline` | `renderItem`, `renderMarker` | `itemClassName` | `renderItem` recibe además `when` |
| `Breadcrumbs` | `renderItem`, `separator` | `itemClassName` | `renderItem` recibe `current` e `index` |
| `NotificationList` | `renderItem` | `itemClassName` | `selected` es «sin leer» |
| `TreeView` | `renderLabel` | `itemClassName` | |
| `NavMenu` | | `itemClassName` | |
| `Calendar` | `renderEvent` | `eventClassName` | `renderEvent` recibe `place`: en qué vista o franja se pinta |
| `Table` | `renderHeader`, `renderEmpty` | `cellClassName`, `headerClassName` | Cada columna conserva su `cell` |
| `Tooltip` | | `contentClassName` | |
| `ToastProvider` | `renderToast` | | Si devuelve `undefined`, ese aviso sale como de serie; un `custom` propio gana |

Cada `render…` recibe el elemento, con tus datos propios tal cual (`option.rol`), y su estado: `selected`, `highlighted`, `disabled`, `query`, `label` (con la coincidencia marcada) y `content`, lo que se pintaría de serie, para envolverlo en vez de rehacerlo. Las clases ganan a las de serie y también pueden ser una función del elemento y su estado.

```tsx
<SearchableSelect
  options={usuarios}
  value={valor}
  onChange={setValor}
  selectedStyle="soft"
  optionClassName="rounded-[var(--k-radius-lg,12px)] py-2"
  renderOption={(option, { label }) => (
    <span className="flex items-center gap-2"><Avatar name={option.label} size="sm" />{label}<Badge>{option.rol}</Badge></span>
  )}
/>
```

**Todos a la vez.** `ComponentDefaults` fija las props de todos los de un tipo desde un solo sitio, sin tocar cada uso. Se puede anidar, y una prop en el propio componente siempre gana.

```tsx
<ComponentDefaults value={{
  SearchableSelect: { selectedStyle: 'soft', optionClassName: 'rounded-[var(--k-radius-lg,12px)]' },
  Select: { selectedStyle: 'soft' },
  DropdownMenu: { itemClassName: 'py-2' },
}}>
  <App />
</ComponentDefaults>
```

Story: **Personalización**.

### Avatares

`Avatar` saca un tono estable del nombre, para distinguir a las personas de un vistazo; el texto y el fondo se mezclan con el tema, así que se leen igual en claro y en oscuro.

- `color`: `auto` (por defecto), `accent`, `ink` (el de antes) o cualquier color CSS.
- `shape`: `circle`, `rounded` o `square`. `size` añade `xl`.
- `fallback`: un icono en lugar de las iniciales. `decorative`: el nombre ya se lee al lado.
- Una imagen que falla deja las iniciales, y una nueva lo vuelve a intentar.
- `AvatarGroup`: apilados con «+N», y se separan al pasar por encima.
- `ComponentDefaults` con `Avatar: { color: 'ink' }` devuelve el aspecto anterior en todas partes.

### Controles y paneles

Todos siguen el contrato de los demás controles: controlados (`value` + `onChange(valor)`), con `label`, `helperText`, `error`, `id` enlazable desde `Field`, `aria-*` completos y `data-k-control` para el móvil.

- **`Slider`**: un valor o un rango `[inicio, fin]`, con marcas, burbuja con el valor (`formatValue`) y `minGap`. Se arrastra, se pulsa en la pista (el pulgar viaja con el muelle del tema) y se maneja con flechas, RePág/AvPág, Inicio y Fin. `onChangeEnd` avisa al soltar.
- **`Rating`**: estrellas o un icono propio, con medias estrellas, solo lectura con decimales y teclado.
- **`OtpInput`**: código en casillas. Se puede **pegar** entero (aunque traiga espacios o guiones) y admite el autocompletado de SMS (`one-time-code`). Tiene `mask` para PIN, `groupSize` y `onComplete`; con error, se sacude.
- **`ToggleGroup`**: botones de selección única o múltiple, como barra de herramientas accesible (un solo tabulador y flechas).
- **`InlineEdit`**: texto que se edita en su sitio. Intro guarda y Esc cancela. Acepta `validate` y un `onSave` asíncrono, con error y marca al guardar.
- **`ChoiceCards`**: tarjetas grandes de elección (plan, pago, tipo), radio o casilla por debajo.
- **`SignaturePad`**: firma con trazo suavizado y grosor según la velocidad. Tiene deshacer y borrar, y exporta PNG y SVG (`ref.toDataURL()`, `ref.toSVG()`).
- **`SplitPane`**: dos paneles con separador que se arrastra o se mueve con teclado. Se pliega con doble clic o Intro, respeta los mínimos y recuerda el tamaño (`storageKey`).
- **`ScrollArea`**: scroll con las barras del tema y sombras en los bordes donde queda contenido. `autoHide` las oculta hasta pasar el ratón.
- **`VirtualList`**: miles de filas pintando solo las visibles, con altura fija o variable (medida). Incluye `scrollToIndex` y `onEndReached` para la carga infinita.
- **`TreeView`**: árbol accesible (flechas, Inicio y Fin, y búsqueda tecleando), con ramas animadas, casillas en tres estados, carga perezosa (`loadChildren`) y `filter`.
- **`BottomSheet`**: hoja inferior con **puntos de anclaje** (`snapPoints={[0.3, 0.6, 1]}`, o `'auto'` para ajustarse a su contenido). Al soltarla sin lanzar va al anclaje más cercano. Un lanzamiento avanza un solo anclaje en su sentido y, hacia abajo desde el primero, la cierra. Solo uno muy fuerte (2,5 px/ms o más) va directo al más alto o la cierra. Con `modal={false}` convive con la página.
  - **Es la hoja de toda la librería en móvil**: `Modal` (presentación `sheet`, la de por defecto), `Drawer` con `mobilePresentation="sheet"` y todos los menús y selectores que se adaptan al móvil (`DropdownMenu`, `Select`, `SearchableSelect`, `DatePicker`, `NavMenu`, menús de `Table`, `FilterBar`…) la usan, con anclaje `'auto'`. La presentación `fullscreen` sigue siendo un diálogo a pantalla completa.

### Fechas, galería, guías y vitrina

- **Fechas y horas:**
  - `DateRangePicker`: dos meses, atajos («Últimos 7 días», «Este trimestre»…; los tuyos con `presets`), vista previa al pasar y teclado; en móvil, en la hoja.
  - `TimePicker`: lista de horas y escritura libre; entiende «930», «9:30» y «21h».
  - `HeatmapCalendar`: actividad por días al estilo GitHub, con los tonos del acento.
  - `Countdown`: cuenta atrás con cifras que ruedan, en seis estilos:
    - `blocks`: tarjetas.
    - `flip`: fichas partidas.
    - `ring`: anillos que se vacían.
    - `display`: cifras grandes de portada.
    - `pill`: pastilla con reloj y texto delante.
    - `inline`: texto en línea.
    
    Además admite tres tamaños, tono de acento y `urgentBelow`, que la pone en rojo y la hace latir al final.
- **Galería:**
  - `Carousel`: arrastre físico con inercia y muelle, teclado, puntos y reproducción automática.
  - `Lightbox`: zoom con rueda, pellizco y doble clic; deslizar para pasar de imagen.
  - `CompareSlider`: antes y después.
  - `Marquee`: cinta infinita que se para al pasar el ratón.
- **Guías:**
  - `Tour`: recorrido con foco que viaja de elemento en elemento; marca los destinos con `data-tour` y usa `tourTarget('nombre')`.
  - `Coachmark`: faro que late junto a algo nuevo; se recuerda que ya se vio.
  - `Banner`: anuncios que se pliegan al cerrarlos, con `storageKey` para no repetirlos.
  - `OnboardingChecklist`: primeros pasos con progreso.
- **Vitrina:**
  - `Dock`: aumento al pasar el puntero, como en macOS.
  - `TiltCard`: inclinación 3D con brillo.
  - `BentoGrid` y `BentoItem`: rejilla de bloques.
  - `SwipeCards`: tarjetas que se lanzan a izquierda o derecha para aprobar o descartar, también con botones y flechas.

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

## Centro de notificaciones

Para la campana de avisos, `NotificationCenter` (entrada principal) reutiliza
`NotificationList`: contador sin leer, lectura individual o en bloque, descarte
y activación. En escritorio abre un panel anclado; en móvil ocupa la pantalla.

```tsx
<NotificationCenter items={notifications}
  onActivate={openNotification}
  onReadChange={(item, read) => updateRead(item.id, read)}
  onMarkAllRead={markRead}
  onDismiss={item => removeNotification(item.id)} />
```

Los datos siguen siendo controlados: abrir una notificación no altera su lectura
automáticamente. `open` y `onOpenChange` permiten controlar también la apertura;
`trigger` sustituye el icono interior de la campana. En Ladle:
**Notification Center → Basico**.

## Botón flotante de acciones

`FloatingActionButton` recibe las acciones de la aplicación, sin opciones
predefinidas. Móntalo en la raíz de la pantalla para anclarlo al viewport.

```tsx
<FloatingActionButton label="Crear" actions={[
  { id: 'invoice', label: 'Nueva factura', icon: <InvoiceIcon />, onClick: openInvoice },
  { id: 'message', label: 'Enviar mensaje', icon: <MessageIcon />, onClick: openChat },
]} />
```

Cada acción admite `disabled` y un callback síncrono o asíncrono. Mientras se
ejecuta, se evitan duplicados; un error se muestra en el menú para poder
reintentarlo. `position="bottom-left"` cambia de lado, `style` ajusta los
márgenes y `open`/`onOpenChange` permiten controlar la apertura. Se cierra al
elegir una acción, tocar fuera o pulsar Escape. Incluye navegación con flechas,
áreas táctiles de 48 px, zona segura del móvil y movimiento reducido.
En Ladle: **Floating Action Button → Basico**.
