# API de animación: animar cualquier cosa fácilmente

## Por qué

Quien usa `@openfactu/ui` debe poder animar cualquier elemento o valor **en una línea**, sin escribir CSS ni montar hooks, al estilo de Framer Motion (lo pidió así el dueño de la librería: «que se pueda animar cualquier cosa fácilmente»).

La base ya es buena: muelles exactos (`spring.ts`), papeles del tema, velocidad y «sin movimiento». Lo que falta es la capa sencilla de encima:

- `useSpring` mueve un solo número y hay que escribir el estilo a mano.
- `useAnimatedPresence` mantiene montado el elemento, pero el CSS de la animación lo pones tú.
- `Reveal`, `Transition` y `PageTransition` resuelven casos cerrados, no el caso general.
- No hay nada para colores, varias propiedades a la vez, scroll enlazado ni salidas al desmontar sin gestionar estados.

## Objetivos

1. `Motion.div` y compañía: animar con props (`initial`, `animate`, `exit`, `whileHover`, `whileTap`, `whileFocus`, `inView`).
2. `Presence`: salidas animadas al desmontar, sin estados propios.
3. `animate()`: lo mismo fuera de React, para elementos, variables CSS, colores, números y valores de movimiento.
4. Valores de movimiento: enlazar scroll, arrastre o puntero con estilos, sin rerenderizar.
5. Efectos con nombre en un registro abierto (`animate="fade-up"`, `registerMotionPreset`).
6. Todo sigue al tema por defecto: cambiar de tema cambia cómo se mueve todo lo animado con esta API.

## Lo que no entra

- Migrar los componentes actuales (`Modal`, `Reveal`, `useFlip`…): siguen como están. Sus clases CSS son más baratas para abrir y cerrar.
- Cambiar la API pública de `useSpring`, `useFlip`, `useAnimatedPresence`, `pop` o `flyTo`.
- Línea de tiempo tipo GSAP, `layoutId` (elemento compartido entre vistas), 3D y `skew`.
- Adoptarlo en `D:\dev\platform`: eso lo lleva otra persona.

## Sería un fracaso aunque funcione si…

- Añade una dependencia.
- Rerenderiza React en cada fotograma.
- Una animación ignora el tema, `--k-motion`, `data-motion="off"` o `prefers-reduced-motion`.
- Pisa los `transform` de las clases de Tailwind.
- Quien no use `Motion` paga algo por ello: ningún componente de la librería puede importarlo en esta fase.
- Da saltos al interrumpir una animación a medias.

## Restricciones del proyecto

- Sin dependencias; `src/motion` sigue sin importar nada de fuera salvo React.
- Se exporta desde la entrada principal, por el `export * from './motion'` actual.
- Comentarios, documentación e historias en español. Esta API no tiene texto visible, así que no toca el catálogo de traducciones.
- No hay tokens nuevos: `styles/tokens.css` y `check-tokens` no cambian.
- Tienen que pasar `npm run typecheck`, `npm test` y `npm run check`.

## La API

### `Motion`

```tsx
<Motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} />
<Motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} spring="pop" />
<Motion.section initial={{ opacity: 0 }} inView={{ opacity: 1 }} viewport={{ once: true, threshold: 0.2 }} />
<Motion.div animate="fade-up" />
const MiTarjeta = Motion.create(Tarjeta);   // componentes propios; deben pasar `ref` y `style`
```

- `Motion.<etiqueta>` admite cualquier etiqueta HTML o SVG, con los tipos de esa etiqueta. Las props de movimiento no llegan al DOM.
- Props:
  - `initial`: estado de partida, u `false` para empezar ya en `animate` sin animar.
  - `animate`: objeto, nombre de variante local o nombre de efecto del registro.
  - `exit`: solo tiene efecto dentro de `Presence`.
  - `whileHover`, `whileTap`, `whileFocus`, `inView`, y `viewport` (`once`, `threshold`, `rootMargin`).
  - `variants`, `spring`, `timing`, `delay`, `stagger`, `onRest`.
  - `style`, que además acepta valores de movimiento.
- **El prop se llama `spring` y no `role`** porque `role` es de ARIA.
- Sin `initial`, la animación parte del valor que tenga el elemento en ese momento (estilo calculado).
- Cuando cambia `animate`, se anima hacia el nuevo destino. La comparación es por contenido, de modo que un objeto literal nuevo con los mismos valores no vuelve a lanzar nada.
- **Prioridad de estados:** `whileTap` > `whileHover` > `whileFocus` > `inView` > `animate`. Al acabar un estado, cada propiedad vuelve a lo que diga el siguiente activo; si ninguno la nombra, a su valor de antes.
- `inView`: hasta entrar en pantalla se ve `initial`. `viewport.once` vale `true` por defecto, como `useInView`; con `false`, al salir de pantalla vuelve al estado anterior.
- `whileHover` solo actúa con `(hover: hover)`, para que no se quede pegado en móvil.
- `whileTap` responde al puntero, y a Intro y Espacio en elementos activables.
- **Variantes:** `variants={{ oculto: {…}, visible: {…} }}` con `initial="oculto" animate="visible"`. Los `Motion` descendientes sin `animate` propio heredan el nombre, y `stagger` en el padre retrasa a cada hijo directo de movimiento.
- Un nombre se busca primero en `variants` y luego en el registro de efectos. Un nombre desconocido avisa en desarrollo y no anima.

### `Presence`

```tsx
<Presence>{open && <Motion.div key="panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: 8 }} />}</Presence>
```

- Sigue a sus hijos directos por `key` y conserva los que desaparecen hasta que terminan su salida. Si un hijo no tiene `exit` (ni él ni sus descendientes `Motion`), se va al momento.
- Props: `mode` (`sync` por defecto, `wait` para esperar a que salga antes de entrar), `initial={false}` (no animar lo que ya estaba al montar) y `onExitComplete`.
- Si la misma `key` vuelve durante la salida, invierte el movimiento desde donde esté, con su velocidad.
- Lo que está saliendo lleva `inert`: no recibe foco ni clics.
- `usePresence()` permite a un componente propio retrasar su desmontaje con otra técnica (`{ isPresent, done }`).

### `animate()`

```ts
animate(el, { x: 100, '--progreso': 1, color: 'var(--k-danger)' }, { spring: 'move' });
animate([a, b, c], { opacity: 1 }, { stagger: 40 });
animate(0, total, { onUpdate: setCifra });
animate(valorDeMovimiento, 1, { spring: 'gesture', velocity: 800 });
const c = animate(el, { x: [0, 100, 50] }, { timing: { duration: 600, ease: 'ease-out' }, repeat: Infinity, repeatType: 'reverse' });
await c.finished;   // { finished: boolean }; nunca rechaza
c.stop();           // se queda donde esté
```

- **Destinos:** `Element`, lista de elementos, número, o valor de movimiento. Los selectores solo existen en `useAnimate`, que los busca dentro de su raíz.
- **Opciones:** `spring`, `timing`, `delay`, `stagger`, `velocity`, `repeat`, `repeatType`, `onUpdate`, `onRest`.
- **Unidades de tiempo:** `delay`, `stagger` y `timing.duration` en ms, como el resto de la librería. `{ bounce, duration }` de `spring` en segundos, como ya es `SpringFeel`.
- **`spring` y `timing` juntos:** gana `timing`. `repeat` vale con ambos; con muelle, cada vuelta arranca en reposo.
- **Devuelve:** `{ finished, stop(), animating }`. `finished` se resuelve con `{ finished: false }` si otra animación la interrumpe o se detiene.
- `useAnimate()` devuelve `[scope, animate]`: la misma función, con selectores dentro de `scope`, que detiene todo al desmontar.

### Qué se puede animar

| Valor | Cómo se escribe | Detalles |
|---|---|---|
| `x`, `y`, `z`, `inlineX` | propiedad `translate` | Número = px; también `'50%'`, `'2rem'`. `inlineX` invierte el signo con `direction: rtl`; `x` es físico |
| `scale`, `scaleX`, `scaleY` | propiedad `scale` | |
| `rotate` | propiedad `rotate` | Número = grados |
| `opacity` y cualquier propiedad numérica CSS | estilo en línea | Con su unidad. `opacity` se limita a 0-1 aunque el muelle se pase |
| Colores | estilo en línea | Valen `var(--x)`, `oklch()`, `color-mix()`: se resuelven al arrancar con el estilo calculado. Se interpola en OKLab, con el progreso limitado a 0-1 |
| `--variable` | `setProperty` | Numérica, o color si lo parece |
| `width` / `height` hacia o desde `auto` | se mide el valor real al arrancar | Al terminar se restaura `auto` |
| Atributos SVG numéricos y `pathLength` | atributo; `pathLength` usa `stroke-dasharray` | Para dibujar trazos |
| Valor no interpolable (`display`, `visibility`…) | se aplica al empezar o al terminar | Al empezar si deja ver el elemento; al terminar si lo oculta |

- **Unidades distintas:** `0` adopta la unidad del destino. Para el resto, se mide en px con `getComputedStyle` y se anima en px.
- **Formas no interpolables:** dos valores que no se pueden interpolar saltan al final y avisan en desarrollo.
- **Fotogramas:** un array es una secuencia de fotogramas. `null` en la primera posición significa «el valor actual». Con muelle, cada tramo sale del anterior; con `timing`, los tramos se reparten por igual salvo que se indique `times`.

### Valores de movimiento

```tsx
const x = useMotionValue(0);
const opacity = useTransform(x, [-100, 0, 100], [0, 1, 0]);    // también colores y unidades; admite una función
const suave = useSpringValue(x, { spring: 'gesture' });         // sigue a otro valor con muelle
const { progress, x: sx, y: sy } = useScroll({ target, container, offset: ['start end', 'end start'] });
const { x: px, y: py } = usePointerValue();                     // puntero, sobre la ventana o un elemento
<Motion.div style={{ x, opacity, background: motionTemplate`hsl(${tono} 80% 50%)` }} />
```

- Un valor tiene `get()`, `set()`, `velocity()` y `on('change', fn)`. Fuera de React son `createMotionValue(0)`.
- Al usarlos en `style`, `Motion` se suscribe y escribe directamente en el elemento, sin rerenderizar.
- `useReducedMotion()` dice, de forma reactiva, si hay que saltarse el movimiento.

### Arrastre y cambios de sitio

```tsx
<Motion.div drag="x" dragConstraints={{ left: -100, right: 100 }} dragElastic={0.2} onDragEnd={…} />
<Motion.li layout />   // al moverse tras un render, llega a su sitio con el muelle `move`
```

- `drag` reutiliza `velocity.ts` (`createVelocityTracker`, `rubberband`, `projectRelease`) y `pointerDrag.ts`. Al soltar sigue con la velocidad del gesto y el muelle `gesture`. Por defecto arrastra con cualquier puntero, porque arrastrar es el fin explícito del elemento.
- `layout` anima solo la **posición**, con FLIP sobre `translate`, como `useFlip`. Los cambios de tamaño saltan: corregir la escala de los hijos queda fuera.

### Efectos con nombre

```ts
registerMotionPreset('mi-entrada', { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0 }, spring: 'enter' }, { source: 'mi-app' });
```

- **De serie:** `fade`, `fade-up`, `fade-down`, `fade-start`, `fade-end`, `scale`, `pop`, `blur`.
  - `scale` y `blur` usan `--k-enter-scale` y `--k-enter-blur`, que ya emite el tema.
  - `fade-start` y `fade-end` usan `inlineX`, de modo que se reflejan en RTL.
- Un efecto trae su propio `initial`, `animate` y `exit`; las props explícitas de `Motion` ganan propiedad a propiedad.
- Es un registro como los de temas e iconos: `registerMotionPreset` devuelve la función que lo quita, también hay `unregisterMotionSource` y `useMotionPresets`, y valida al registrar (avisa, no rompe).

### Qué muelle se usa por defecto

| Quién anima | Papel del tema |
|---|---|
| `animate`, `inView`, `initial` → `animate` | `enter` |
| `exit` | `exit` |
| `whileHover`, `whileTap`, `whileFocus` y su vuelta | `pop` |
| `animate()` suelto, `animate` que cambia de valor, `layout` | `move` |
| `drag` al soltar, `useSpringValue` | `gesture` |

- `spring` acepta un papel, un preset (`'snappy'`, `'bouncy'`…), `{ bounce, duration }` o `{ stiffness, damping, mass }`. Los nombres de papeles y presets no se solapan, así que no hace falta distinguirlos.
- El muelle del tema se lee al arrancar con `readSpringConfig(role, el)`, del propio elemento, de modo que un subárbol con otro tema se mueve con el suyo. Sin hoja de estilos, cae al carácter sobrio, como hoy.
- La velocidad del tema alarga o acorta el movimiento, igual que en `useSpring`. `delay`, `stagger` y `timing` también se escalan con ella.

### Sin movimiento

Con `motionDisabled(el)` verdadero, todo va al estado final en el acto:

- `finished` y `onRest` se cumplen enseguida.
- `repeat` no se repite.
- `Presence` desmonta sin esperar.
- `drag` sigue funcionando porque lo mueve la persona, pero al soltar va al destino sin muelle.
- `useScroll` sigue actualizándose: los efectos enlazados al scroll los decide quien los escribe, con `useReducedMotion`.

## Cómo funciona por dentro

- **Un solo bucle** `requestAnimationFrame`, compartido por todas las animaciones, que se apaga cuando no queda ninguna. Cada fotograma calcula valores y escribe: nunca lee el layout. Las lecturas (estilo calculado, medidas) se hacen solo al arrancar.
- **Muelle analítico**, con `springAt`: la posición sale del tiempo transcurrido, de modo que una pestaña en segundo plano no acumula error.
- **Un dueño por propiedad y elemento** (`WeakMap`): una animación nueva sobre la misma propiedad interrumpe a la anterior solo en esa propiedad, y hereda su valor y su velocidad si la unidad coincide. Los colores no heredan velocidad, solo el color actual.
- **React:** `initial` se escribe en el `style` del primer render, y por eso funciona en servidor sin destello. Después el motor escribe directamente en el DOM. En cada render, las propiedades que controla el motor se quitan del `style` que recibe React, para que no las pise.
- **StrictMode y desmontaje:** montar dos veces no duplica animaciones, y desmontar detiene todo lo del elemento.
- **Transiciones CSS del mismo elemento:** una clase `transition-*` sobre una propiedad animada pelearía con el motor. No se corrige por dentro: se documenta y, en desarrollo, se avisa una vez.

## Pruebas y documentación

- **Unidad**, en `scripts/motion-api.test.cjs` (la lógica pura va en archivos sin DOM):
  - lectura de valores, unidades y colores;
  - interpolación y `useTransform`;
  - fotogramas y traspaso de velocidad al interrumpir;
  - registro de efectos;
  - marcado en servidor de `initial`.
- **Navegador**, en `scripts/probe-motion-api.cjs`, añadida al grupo `browser` de `test-browser.cjs`:
  - llega al destino y `finished` se cumple;
  - interrumpir no da saltos;
  - `Presence` sale, y la misma `key` que vuelve invierte el movimiento;
  - prioridad de estados y hover que no se queda pegado en táctil;
  - no pisa un `transform` de Tailwind;
  - movimiento reducido, `data-motion="off"` y velocidad 0;
  - cambiar de carácter de tema cambia el movimiento;
  - **200 `Motion` animando sin rerenders de React por fotograma**, con un contador de renders;
  - sin errores de página.
- **Historia:** `stories/Animar.stories.tsx`, con un caso por sección de este documento.
- **Documentos:** `docs/movimiento.md` (esta API va primero y explica cuándo usar `Reveal` o `Transition` en su lugar), `CHANGELOG.md` y `CLAUDE.md`.

## Orden de construcción

1. Valores, bucle y `animate()`.
2. `Motion`, variantes y efectos con nombre.
3. `Presence`.
4. Valores de movimiento y `useScroll`.
5. `drag` y `layout`.

Cada paso deja la librería publicable.

## Lo que se deja a quien lo construya

- La división exacta en archivos dentro de `src/motion`.
- Cómo se implementan los tipos de `Motion.<etiqueta>`, siempre que el autocompletado de cada etiqueta funcione.
- El umbral de reposo de cada tipo de valor.
- El contenido exacto de los efectos de serie, con el tema como referencia.
- El texto de los avisos de desarrollo.

## Decisiones de quien escribe este documento, no del dueño

El dueño aprobó la idea general: `Motion`, `Presence`, `animate`, valores enlazados, muelle del tema, interrupción sin saltos, «sin movimiento», `translate`/`scale`/`rotate` por separado, ningún paquete nuevo y un registro de efectos.

Estas decisiones las tomó quien escribe y están por confirmar:

- Fuera: `layoutId`, migrar componentes existentes y línea de tiempo.
- `layout` solo mueve la posición, no anima el tamaño.
- Bucle con `requestAnimationFrame` y no API de animaciones web: da traspaso exacto de velocidad a cambio de ir por el hilo principal.
- Exportarlo desde la entrada principal y no en `@openfactu/ui/motion`.
- `x` físico, e `inlineX` para lo que deba reflejarse en RTL.
- Papel por defecto de cada tipo de animación (la tabla de arriba).
- Interpolar colores en OKLab.
- `whileHover`, `whileTap` y `whileFocus` con el papel `pop`, y `viewport.once` activado por defecto.
