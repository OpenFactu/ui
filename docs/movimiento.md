# Movimiento, gestos y microinteracciones

Muelles, gestos táctiles, efectos de texto y microinteracciones.

## Movimiento físico

Lo que se abre y se cierra se mueve con **muelles** y no con curvas fijas: un oscilador amortiguado resuelto de forma exacta (sin dependencias) que da entradas fluidas, rebote cuando el tema lo pide y gestos con inercia. El carácter lo decide el **tema**.

```ts
const theme = { motion: { character: 'expressive' } };          // sober (por defecto) · smooth · expressive · playful
const custom = { motion: { character: 'smooth', springs: { enter: { bounce: 0.35, duration: 0.5 } }, stagger: 20 } };
```

- **Papeles:** `enter`, `exit`, `pop` (menús y popovers), `move` (indicadores y pila de avisos), `gesture` (soltar tras arrastrar). Cada uno es un muelle: un preset (`'snappy'`, `'bouncy'`…), `{ bounce, duration }` o `{ stiffness, damping, mass }`.
- **Extras del carácter:** `stagger` (ms entre elementos de una lista), `enterScale` y `enterBlur` (desde dónde crece lo que aparece).
- **Variables CSS** que emite el tema: `--k-spring-<papel>` (curva `linear()`), `--k-spring-<papel>-duration`, `--k-stagger`, `--k-enter-scale`, `--k-enter-blur`. Con Tailwind: `ease-spring-pop duration-spring-pop`.
- **En componentes:** `Modal`, `Drawer`, menús, selects, tooltips y avisos entran y salen con su muelle (`data-state="open|closed"` + clases `k-appear`, `k-sheet`, `k-scrim` de `styles/motion.css`). En móvil la hoja del `Modal` y el `Drawer` se arrastran para cerrar, y los avisos se descartan con un lanzamiento; `Tabs`, `SegmentedControl` y `BottomNavigation` llevan un indicador que viaja.
- **Respeta** `prefers-reduced-motion`, `data-motion="off"` y `motion.speed` (0 = sin movimiento).

Para tus propios componentes: `useAnimatedPresence`, `useSpring`, `useDragDismiss`, `useIndicator` y las funciones puras `spring`, `springAt`, `springToLinear` están en la entrada principal. `stories/Motion.stories.tsx` compara los caracteres y `ThemeEditor` los edita en vivo.

### Gestos táctiles

Una sola API para los gestos del móvil, sin dependencias y sin pasar por el estado de React: **toque, doble toque, mantener pulsado, deslizar, arrastrar y pellizcar**. Se activa lo que tenga manejador; el resto (el scroll del eje contrario, por ejemplo) se deja al navegador con el `touch-action` que devuelve.

```tsx
import { useGestures, useSwipeAction } from '@openfactu/ui';

// Cualquier elemento: un manejador por gesto.
const g = useGestures({
  axis: 'x',                                   // deslizar y arrastrar en horizontal; el scroll vertical sigue siendo del navegador
  onSwipe: s => s.direction === 'left' && archive(row.id),
  onLongPress: p => openMenu(p.point),         // vibra un instante donde el dispositivo pueda
  onDoubleTap: () => toggleZoom(),
  onPinch: p => p.phase === 'move' && setScale(p.scale),   // también `rotation`, `center`, `dx`, `dy`
  onPan: p => { /* start · move · end · cancel, con dx, dy, vx, vy */ },
});
<li {...g.bind} style={g.style} />            // mientras hay gesto: data-gesture="pressing|held|pan|pinch"

// Deslizar un elemento para hacer algo y que vuelva solo (responder, archivar, completar).
const swipe = useSwipeAction({ direction: 'left', distance: 72, onTrigger: () => archive(row.id), onLongPress: openMenu });
<div ref={swipe.ref} {...swipe.bind} style={swipe.style} />   // escribe --k-swipe (0-1) y data-swipe="active|armed" para el indicador
```

- **Por defecto solo dedo y lápiz** (`pointerTypes: ['touch', 'pen']`): con ratón ya están el hover, el clic derecho y la selección de texto. Añade `'mouse'` para probarlo en escritorio.
- Dentro de enlaces, botones, campos y reproductores no hay gesto (`ignore`, un selector).
- Ajustes: `slop`, `longPressMs`, `doubleTapMs`, `swipeDistance`, `swipeVelocity` (un lanzamiento corto pero rápido también cuenta; un lanzamiento hacia atrás lo anula).
- `useSwipeAction` sigue al dedo escribiendo `translate`, pone goma pasada la distancia, vibra al armarse y vuelve con el muelle `gesture` del tema arrancando con la velocidad del dedo.
- El reconocedor es puro (`createGestureRecognizer`, `scripts/gestures.test.cjs`): recibe punteros y emite gestos, así que se prueba sin navegador y sirve fuera de React.
- Lo usan el chat (mantener pulsado y deslizar para responder) y, para cerrar hojas y avisos, `useDragDismiss`. Story: **Gestos**.

### Texto, lectura y microinteracciones

Piezas sueltas, sin contenido propio y con el tema: colores, muelles y `--k-motion`. Con movimiento reducido o velocidad 0 queda el estado final. Stories: **Efectos de texto**, **Prosa** y **Microinteracciones**.

- **Efectos de texto:** `WaveText` (ola de letras al pasar, en bucle o una vez), `TextRotate` (una palabra de la frase se turna y el hueco se ajusta), `TextMorph` (las letras comunes viajan a su sitio nuevo), `ScrollText` (el párrafo se enciende al bajar) y `TextLink` (subrayado dibujado; para el `Link` de tu router, la clase `k-underline`).
- **Párrafos:** `Paragraph` gana `reveal` (`lines`, `words`), `firstLine` y `dropCap="accent"`. `Quote` gana `variant` (`pull`, `card`) y `align`.
- **Texto largo:** `Prose` da forma a cualquier HTML (títulos, listas, citas, código, tablas) con `size`, `lead` y `dropCap`, también si viene de un editor o de Markdown. `SectionIntro` abre una sección. `ReadingProgress`, `ReadingTime` y `readingMinutes` cuentan la lectura.
- **Microinteracciones:** `BurstToggle` (favorito con estallido), `HoldToConfirm` (mantener para confirmar, también con teclado), `IconSwap`, `CountBadge`, `Magnetic` y `Reveal` (entrar al aparecer, con `stagger`). Funciones: `pop(el)`, `flyTo(desde, hasta)` y `usePopOnChange(valor)`. Clases: `k-press`, `k-lift`, `k-attention`. `Button` ya se hunde al pulsar.
- **Listas que se reordenan:** `useFlip(raiz, { selector, watch })` anima los cambios de sitio con el muelle del tema, y `useInView` dice cuándo algo entra en pantalla.

### Loaders y texto en movimiento

Todo con CSS y el acento del tema; respeta `motion.speed`, `prefers-reduced-motion` y `data-motion="off"`.

- **Cargas:** `<Spinner variant="ring|dual|pulse|orbit|dots|bars|grid" size tone label />`, `<Thinking>` (texto con brillo para asistentes), `<Progress indeterminate | striped | glow />` y `<Skeleton animation="shimmer" />`.
- **Efectos de texto:** `ShimmerText`, `GradientText` (`animated`), `Typewriter` (una o varias frases), `TextReveal` (por palabras o letras, con el muelle `enter`), `Highlight` (`marker | block | underline`, se dibuja al entrar en pantalla) y `CountUp` (cuenta con muelle y recuenta al cambiar).
- **Párrafos:** `Heading`, `Paragraph` (`lead`, `small`, `caption`, `measure`, `balance`, `columns`, `dropCap`, `clamp` con «Ver más»), `Quote`, `Kbd`, `InlineCode`.
- **Formatos de dato** (`Intl`, `es-ES` por defecto): `Currency`, `NumberValue`, `Delta`, `RelativeTime`, `FileSize`, `Truncate` (también por el centro para nombres de archivo).

Mira `stories/Loaders.stories.tsx` y `stories/Texto.stories.tsx`.

### Microinteracciones, listas, fondos y mapa

- **Microinteracciones:** `<Ripple />` (onda táctil dentro de un botón `relative overflow-hidden`), `StatusMark` (círculo y signo que se dibujan), `shake(el)`, `fireConfetti({ x, y })`, `TextScramble`, `RollingNumber` (cifras que ruedan) y `SwapText`. Spinners extra: `blades` y `ripple`.
- **Transiciones:** `PageTransition` (`transitionKey`, `rise | slide | fade`), `AnimatedList` (entra, sale y se reordena con FLIP y el muelle `move`), `SortableList` (arrastrar con física; teclado con Alt + ↑/↓), `Collapse` y `Accordion` con altura animada.
- **Fondos:** `AuroraBackground`, `MeshBackground`, `PatternBackground` (`dots | grid | lines`), `NoiseOverlay`, `Spotlight` (sigue al puntero), `Particles` (canvas) y `GlowBorder`. Van detrás del contenido, con los colores del tema.
- **Mapa** (`TileMap`): teselas sin dependencias, con arrastre inercial, pellizco, rueda con zoom en el puntero (`scrollZoom="ctrl"` para no secuestrar el scroll), doble clic, teclado y vuelo con el muelle `move` (`ref.flyTo`, `ref.fitBounds`, `ref.reset`). Es extensible por todas partes:
  - **Estilos** (`mapStyle`): `standard`, `light`, `dark`, `mono` (blanco y negro), `mono-dark` (negro) y `auto` (sigue al tema). Todos salen de OpenStreetMap con filtros, sin clave. Los tuyos se añaden con `registerMapStyle({ id, label, tileUrl, attribution, filter? })` y aparecen en el selector. **Para producción usa tu proveedor**: la política de OSM no admite uso intensivo.
  - **Buscador** (`geocoder`): `nominatimGeocoder()`, `localGeocoder(tusDatos, describir)`, `combineGeocoders(...)` o cualquier `(texto, signal) => Promise<GeocodeResult[]>`.
  - **Controles integrados** (`controls`): `zoom`, `locate`, `fullscreen`, `reset`, `measure` (medir distancias) y `styles` (selector).
  - **Tus acciones**: `<MapControl position="bottom-left"><MapButton>…</MapButton></MapControl>` en cualquier esquina, y `onMapClick` / `onMapContextMenu` con las coordenadas.
  - **Capas**: `Marker` (con popup), `MarkerCluster`, `MapPath` (rutas y zonas), `MapCircle` (radio en metros), `MapPopup` y `useMap()` para las tuyas.
  - La geometría (`mapGeo.project`, `distance`, `clusterPoints`, `fitBounds`) es pura y está probada.
