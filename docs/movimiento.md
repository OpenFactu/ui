# Movimiento, gestos y microinteracciones

Muelles, gestos táctiles, efectos de texto y microinteracciones.

## Animar cualquier cosa

Una línea, sin CSS ni estados, con el muelle del tema por defecto. Sin dependencias. Stories: **Animar**, una por pieza, y **Animar ejemplos**, casos de uso que combinan varias: bandeja con deslizar y deshacer, cesta con vuelo hasta el carrito, asistente por pasos, informe enlazado al scroll y efectos con el puntero.

```tsx
import { Motion, Presence, animate, useScroll, useTransform } from '@openfactu/ui';

// Cualquier elemento
<Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} />

// Al pasar, pulsar, enfocar o entrar en pantalla; al acabar vuelve solo
<Motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} spring="pop" />
<Motion.section initial={{ opacity: 0 }} inView={{ opacity: 1 }} viewport={{ once: true, threshold: 0.2 }} />

// Efectos con nombre: traen su entrada y su salida
<Motion.div animate="fade-up" />

// Salidas al desmontar, sin gestionar estados
<Presence>{open && <Motion.div key="panel" animate="fade" exit={{ opacity: 0, y: 8 }} />}</Presence>

// Fuera de React: elementos, variables CSS, colores, números
animate(el, { x: 100, '--progreso': 1, color: 'var(--k-danger)' }, { spring: 'move' });
animate([a, b, c], { opacity: 1 }, { stagger: 40 });
animate(0, total, { onUpdate: setCifra });

// Enlazado al scroll, sin rerenderizar
const { progress } = useScroll();
<Motion.div style={{ scaleX: progress, opacity: useTransform(progress, [0, 1], [1, 0.4]) }} />
```

### `Motion`

`Motion.<etiqueta>` vale para cualquier etiqueta HTML o SVG, con sus props y sus tipos. `Motion.create(Componente)` envuelve uno tuyo, que tiene que pasar `ref` y `style` a su elemento.

- **Estado de partida:** `initial` se pinta en el primer render, también en servidor, sin destello. `initial={false}` empieza ya en `animate`. Sin `initial`, parte de lo que tenga el elemento.
- **Estados:** `whileTap` > `whileHover` > `whileFocus` > `inView` > `animate`, propiedad a propiedad. `whileHover` no actúa en táctil, para que no se quede pegado; `whileTap` responde también a Intro y Espacio en lo activable.
- **Variantes:** `variants={{ oculto: {…}, visible: {…} }}` con `initial="oculto" animate="visible"`. Los `Motion` de dentro con esa variante heredan el nombre, y `stagger` en el padre escalona a sus hijos directos (`stagger` a secas: lo que diga el tema).
- **Arrastrar:** `drag`, `drag="x"` o `drag="y"`, con `dragConstraints`, `dragElastic`, `onDragStart`, `onDrag` y `onDragEnd`. Al soltar sigue con la velocidad que llevaba y el muelle `gesture`. Con un solo eje, el otro sigue siendo del navegador, así que el scroll funciona. Los botones, enlaces y campos de dentro conservan su clic. Con un valor de movimiento en `style` (`style={{ x }}`), el arrastre lo mueve a él, y lo enlazado con ese valor sigue el gesto y la vuelta.
- **Cambios de sitio:** `layout` lleva a su sitio lo que se mueva tras un render, con el muelle `move`. Solo anima la posición: si cambia de tamaño, salta.

### Qué se puede animar

| Valor | Detalles |
|---|---|
| `x`, `y`, `z` | Número = px; también `'50%'`, `'2rem'`. Van en la propiedad `translate`, así que **no pisan los `transform` de Tailwind** |
| `inlineX` | Como `x`, pero se refleja de derecha a izquierda. `x` es físico |
| `scale`, `scaleX`, `scaleY`, `rotate` | También propiedades separadas. `rotate`: número = grados |
| `opacity` y cualquier propiedad numérica | Con su unidad. El rebote no deja una opacidad de 1,2 ni un ancho negativo |
| Colores | Valen `var(--x)`, `oklch()`, `color-mix()`. Se interpolan en OKLab. El valor final se escribe como lo pediste: un `var()` sigue al tema después |
| `--variable` | Numérica o color |
| `width` / `height` hacia `auto` | Se mide, se anima y se restaura `auto` |
| `filter`, sombras | Si la forma coincide (`blur(0px)` a `blur(8px)`, también desde `none`) |
| Atributos SVG y `pathLength` | `r`, `cx`, `cy`…; `pathLength` dibuja el trazo |
| `display`, `visibility`… | Se aplica al empezar si deja ver el elemento; al terminar si lo oculta |

Un array es una secuencia de fotogramas, y `null` al principio significa «donde esté»: `{ x: [null, 100, 50] }`. Dos valores que no se pueden interpolar cambian al final y avisan en desarrollo.

### El muelle

`spring` acepta un papel del tema (`enter`, `exit`, `pop`, `move`, `gesture`), un preset (`snappy`, `bouncy`…), `{ bounce, duration }` en segundos o `{ stiffness, damping, mass }`. Si no dices nada, usa el papel que toca, así que cambiar de tema cambia cómo se mueve todo:

| Quién anima | Papel |
|---|---|
| `animate` al montar, `inView` | `enter` |
| `exit` | `exit` |
| `whileHover`, `whileTap`, `whileFocus` y su vuelta | `pop` |
| `animate()` suelto, `animate` que cambia, `layout` | `move` |
| Soltar un arrastre, `useSpringValue` | `gesture` |

`timing={{ duration, ease, times }}` usa una curva fija, en ms. `delay` y `stagger` también van en ms. Todo se escala con la velocidad del tema.

Interrumpir a mitad nunca da un salto: la animación nueva sigue desde donde estaba y con la velocidad que llevaba. Con movimiento reducido, `data-motion="off"` o velocidad 0 va al estado final en el acto, `Presence` desmonta sin esperar y `repeat` no se repite. El arrastre sigue funcionando porque lo mueve la persona, y `useScroll` sigue actualizándose: los efectos enlazados al scroll los decides tú con `useReducedMotion`.

**Una clase `transition-*` sobre la misma propiedad pelea con la animación:** cada fotograma arrancaría otra transición. En desarrollo avisa una vez; quítala de esa propiedad.

### `Presence`

Sigue a sus hijos directos por `key` y conserva los que desaparecen hasta que terminan de irse. Quien no tiene `exit` se va al momento, y lo que sale lleva `inert`. Si la misma `key` vuelve a mitad, invierte desde donde esté.

- `mode="wait"` espera a que salga antes de que entre lo nuevo.
- `initial={false}`: lo que ya estaba al montar no anima su entrada.
- `onExitComplete` avisa cuando ya no queda nada saliendo.
- `usePresence()` da `{ isPresent, done }` a un componente propio que se va a su manera.

### `animate()`

`animate(destino, valores, opciones)` devuelve `{ finished, stop(), animating }`. `finished` nunca rechaza: da `{ finished: false }` si otra animación la interrumpe o se detiene. Opciones: `spring`, `timing`, `delay`, `stagger`, `velocity`, `repeat`, `repeatType` (`loop`, `reverse`), `onUpdate` y `onRest`.

`useAnimate()` devuelve `[scope, animate]`: la misma función, con selectores que se buscan dentro de `scope`, y detiene lo suyo al desmontar.

### Valores de movimiento

Cambian sin pasar por React y, en el `style` de un `Motion`, se escriben directamente en el elemento.

- `useMotionValue(0)` (fuera de React, `createMotionValue`): `get()`, `set()`, `velocity()`, `on('change', fn)`.
- `useTransform(valor, [0, 100], [0, 1])` lleva unos tramos a otros, también a colores y unidades; o `useTransform(valor, (v) => v * 2)`.
- `useSpringValue(valor)` sigue a otro valor con un muelle.
- `useScroll({ target, container, offset })` da `x`, `y`, `progress` y `progressX`. `offset` son dos momentos, cada uno «borde del objetivo, borde de la vista»: por defecto `['start end', 'end start']`.
- `usePointerValue(target?)` da `x` e `y` del puntero.
- ``motionTemplate`hsl(${tono} 80% 50%)` `` compone un texto con valores dentro.
- `useReducedMotion()` dice, de forma reactiva, si hay que saltarse el movimiento.

### Efectos con nombre

`fade`, `fade-up`, `fade-down`, `fade-start`, `fade-end`, `scale`, `pop` y `blur` vienen de serie. Las props de `Motion` ganan propiedad a propiedad. `scale` y `blur` usan `--k-enter-scale` y `--k-enter-blur` del tema; `fade-start` y `fade-end` se reflejan de derecha a izquierda.

```ts
const baja = registerMotionPreset('mi-entrada', { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, spring: 'enter' }, { source: 'mi-app' });
baja();                                   // o unregisterMotionSource('mi-app')
```

`useMotionPresets()` da el catálogo, reactivo.

### Cuándo usar otra cosa

`Reveal`, `Transition`, `PageTransition`, `AnimatedList` y `useFlip` siguen siendo la opción directa si hacen justo lo que necesitas, y sus clases CSS son más baratas para abrir y cerrar. `Motion` es para lo demás.

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
