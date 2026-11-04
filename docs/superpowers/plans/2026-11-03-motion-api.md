# API de animación: plan de construcción

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cualquier elemento o valor se anime en una línea (`Motion`, `Presence`, `animate()`, valores de movimiento), siguiendo al tema por defecto.

**Architecture:** Lógica pura en archivos sin DOM (valores, conductores, estados), probada con `node:test`. Encima, un motor con un solo bucle `requestAnimationFrame` y un dueño por propiedad y elemento. Encima, la capa de React, que nunca rerenderiza por fotograma.

**Tech Stack:** React 19, TypeScript, `node:test` con `scripts/test-support.cjs`, sondas con `scripts/probe-kit.cjs`, Ladle.

**Spec:** `docs/superpowers/specs/2026-11-03-motion-api-design.md`. Léelo antes de empezar: las tablas de valores y de muelles por defecto no se repiten aquí.

## Global Constraints

- Sin dependencias nuevas; `src/motion` no importa nada de fuera salvo React.
- Ningún componente de `src/components`, `src/ai` ni `src/chat` importa `Motion`, `Presence` ni `animate`.
- Se exporta desde `src/motion/index.ts`, que ya re-exporta `src/index.ts`.
- La API pública actual (`useSpring`, `useFlip`, `useAnimatedPresence`, `pop`, `flyTo`) no cambia.
- Comentarios, historias y documentos en español. Sin colores literales fuera de un fallback de `var()`.
- Tiempos: `delay`, `stagger` y `timing.duration` en ms; `{ bounce, duration }` de `spring` en segundos.
- Toda animación pasa por `motionDisabled(el)` y escala con `readMotionSpeed(el)`.
- **No confirmes en git ni subas nada:** el dueño lo pide cuando quiere. Cada tarea acaba en verificación, no en commit.
- Reinicia Ladle tras crear `stories/Animar.stories.tsx`.

Verificación común al final de cada tarea (salida esperada: sin errores):

```bash
npm run typecheck
npm test
npm run check
```

## Review Focus

Casos que el documento implica sin nombrarlos; cada uno tiene su prueba en la tarea indicada.

1. Abrir y cerrar `Presence` muy deprisa: sin copias duplicadas ni elementos atascados, y al final el estado coincide con el último valor (Tarea 6).
2. Desmontar o quitar un elemento del DOM a mitad de animación: sin errores y `finished` se resuelve con `{ finished: false }` (Tarea 3).
3. Cambiar de tema o de modo oscuro después de animar a `var(--x)`: el elemento sigue a la variable, porque el valor final se escribe tal como se pidió (Tarea 3).
4. El padre rerenderiza a mitad de animación, con objetos literales nuevos o con `style` que nombra la misma propiedad: la animación no se reinicia ni salta (Tarea 5).
5. Elemento oculto o de tamaño 0 (`display: none`, padre plegado) al animar hacia `auto` o `%`: nunca escribe `NaN` y llega al destino (Tarea 3).

---

## Archivos

| Archivo (`src/motion/`) | Responsabilidad |
|---|---|
| `values.ts` | Puro: leer, convertir e interpolar números, unidades y colores |
| `drivers.ts` | Puro: muelle, tiempo, fotogramas y repetición como funciones del tiempo |
| `frameloop.ts` | El único bucle `requestAnimationFrame` |
| `springInput.ts` | De `spring` (papel, preset, forma perceptiva o física) a física concreta |
| `elementWriter.ts` | Leer y escribir en un elemento: canales de `translate`, `scale`, `rotate`, estilos, variables, SVG |
| `animate.ts` | `animate()`, dueños por propiedad, interrupción, `AnimationControls` |
| `motionValue.ts` | `MotionValue`, `createMotionValue`, `mapRange`, `motionTemplate` |
| `motionHooks.ts` | `useAnimate`, `useReducedMotion`, `useMotionValue`, `useTransform`, `useSpringValue`, `usePointerValue` |
| `useScroll.ts` | `useScroll` y su cálculo puro `scrollProgress` |
| `motionPresets.ts` | Registro de efectos con nombre |
| `motionState.ts` | Puro: estado activo, destino efectivo, `initial` a CSS, clave de contenido |
| `Motion.tsx` | `Motion`, `Motion.create`, gestos de estado, variantes |
| `Presence.tsx` | `Presence`, `usePresence` |
| `drag.ts` | Puro y hook interno: límites, elasticidad y soltar |
| `layout.ts` | Hook interno de `layout` |

Pruebas: `scripts/motion-api.test.cjs` y `scripts/probe-motion-api.cjs` (a añadir al grupo `browser` de `scripts/test-browser.cjs`). Historia: `stories/Animar.stories.tsx`.

Las sondas pueden importar el módulo dentro de la página, como hace `scripts/probe-focus-inputs.cjs`: `import('/@fs/<ruta absoluta>/src/motion/index.ts')`.

---

### Task 1: Valores

**Files:** Create `src/motion/values.ts`; Test `scripts/motion-api.test.cjs`

**Interfaces — Produces:**

```ts
export type ParsedValue =
  | { kind: 'number'; value: number; unit: string }
  | { kind: 'color'; oklab: [number, number, number, number] }  // L, a, b, alfa
  | { kind: 'discrete'; text: string };
export function parseValue(raw: string | number): ParsedValue;
export function formatValue(value: ParsedValue): string;
export function interpolate(from: ParsedValue, to: ParsedValue, progress: number): string;
export function rgbaToOklab(rgba: [number, number, number, number]): [number, number, number, number];
export function alignUnits(from: ParsedValue, to: ParsedValue): [ParsedValue, ParsedValue] | null;
export function clampFor(property: string, value: number): number;
```

- [ ] **Step 1: Escribe las pruebas que fallan**

```js
test('parseValue: unidades', () => {
  assert.deepEqual(parseValue(12), { kind: 'number', value: 12, unit: '' });
  assert.deepEqual(parseValue('-50%'), { kind: 'number', value: -50, unit: '%' });
  assert.deepEqual(parseValue('2.5rem'), { kind: 'number', value: 2.5, unit: 'rem' });
  assert.equal(parseValue('block').kind, 'discrete');
});
test('parseValue: colores', () => {
  for (const c of ['#ff0000', 'rgb(255 0 0)', 'rgba(255, 0, 0, 1)', 'color(srgb 1 0 0)']) close(parseValue(c).oklab[0], 0.628, 0.002, c);
  close(parseValue('oklch(0.628 0.2577 29.23)').oklab[1], 0.2249, 0.002);
  close(parseValue('rgb(0 0 0 / 0.5)').oklab[3], 0.5, 1e-6);
});
test('interpolate', () => {
  assert.equal(interpolate(parseValue('0px'), parseValue('10px'), 0.5), '5px');
  assert.equal(interpolate(parseValue('block'), parseValue('none'), 0.5), 'block');   // discreto: cambia al final
  assert.equal(interpolate(parseValue('block'), parseValue('none'), 1), 'none');
  assert.match(interpolate(parseValue('#000'), parseValue('#fff'), 0.5), /^oklab\(0\.5\b/);
  assert.equal(interpolate(parseValue('#000'), parseValue('#fff'), 1.3), interpolate(parseValue('#000'), parseValue('#fff'), 1)); // el color no se pasa
});
test('alignUnits: 0 adopta la unidad; distintas devuelven null para medir', () => {
  assert.deepEqual(alignUnits(parseValue(0), parseValue('50%'))[0], { kind: 'number', value: 0, unit: '%' });
  assert.equal(alignUnits(parseValue('10px'), parseValue('50%')), null);
});
test('clampFor', () => {
  assert.equal(clampFor('opacity', 1.2), 1); assert.equal(clampFor('opacity', -0.1), 0);
  assert.equal(clampFor('width', -3), 0); assert.equal(clampFor('x', -3), -3);
});
```

- [ ] **Step 2: Comprueba que fallan**

Run: `node --test scripts/motion-api.test.cjs`. Expected: FAIL porque falta el módulo.

- [ ] **Step 3: Implementa `values.ts`**

Convierte sRGB → sRGB lineal → OKLab con las matrices de Björn Ottosson. Admite hexadecimal de 3, 4, 6 y 8 cifras, `rgb()`/`rgba()` con comas o espacios, `color(srgb …)`, `oklab()` y `oklch()`. Lo demás es `discrete`. Salida de color: `oklab(L a b / alfa)`. Discreto: devuelve `from` hasta `progress >= 1`.

- [ ] **Step 4: Comprueba que pasan** con el mismo comando. Expected: PASS.

---

### Task 2: Conductores, bucle y muelle

**Files:** Create `src/motion/drivers.ts`, `src/motion/frameloop.ts`, `src/motion/springInput.ts`; Test `scripts/motion-api.test.cjs`

**Interfaces — Consumes:** `springAt`, `resolveSpring`, `readSpringConfig`, `MotionRole`, `SpringInput`. **Produces:**

```ts
export interface DriverState { value: number; velocity: number; done: boolean }
export type Driver = (elapsedSeconds: number) => DriverState;
export type EaseInput = 'linear' | 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | [number, number, number, number] | ((t: number) => number);
export function springDriver(o: { from: number; to: number; velocity?: number; config: SpringConfig; restDelta?: number; restSpeed?: number }): Driver;
export function timingDriver(o: { from: number; to: number; duration: number; ease?: EaseInput }): Driver; // duration en s
export function keyframesDriver(values: number[], make: (from: number, to: number, velocity: number, index: number) => Driver): Driver;
export function repeatDriver(driver: Driver, o: { repeat: number; repeatType: 'loop' | 'reverse'; from: number; to: number }): Driver;

export function addFrameTask(task: (now: number) => boolean): () => void; // true = sigue

export type MotionSpring = MotionRole | SpringInput;
export function isMotionRole(value: unknown): value is MotionRole;
export function resolveMotionSpring(input: MotionSpring | undefined, fallback: MotionRole, el?: Element | null): Required<SpringConfig>;
```

- [ ] **Step 1: Escribe las pruebas que fallan**

```js
test('springDriver llega, conserva velocidad y termina', () => {
  const d = springDriver({ from: 0, to: 100, velocity: 500, config: spring({ duration: 0.4, bounce: 0 }) });
  close(d(0).value, 0, 1e-6); close(d(0).velocity, 500, 1e-6);
  const end = d(5); assert.equal(end.done, true); assert.equal(end.value, 100); assert.equal(end.velocity, 0);
});
test('timingDriver con duración y curva', () => {
  const d = timingDriver({ from: 0, to: 10, duration: 1, ease: 'linear' });
  close(d(0.5).value, 5, 1e-6); assert.equal(d(1).done, true);
  close(timingDriver({ from: 0, to: 1, duration: 1, ease: [0, 0, 1, 1] })(0.25).value, 0.25, 1e-3);
});
test('keyframesDriver encadena tramos', () => {
  const d = keyframesDriver([0, 100, 50], (from, to) => timingDriver({ from, to, duration: 1, ease: 'linear' }));
  close(d(0.5).value, 50, 1e-6); close(d(1.5).value, 75, 1e-6); assert.equal(d(2).done, true);
});
test('repeatDriver: reverse vuelve y termina en el sitio correcto', () => {
  const d = repeatDriver(timingDriver({ from: 0, to: 10, duration: 1, ease: 'linear' }), { repeat: 1, repeatType: 'reverse', from: 0, to: 10 });
  close(d(1.5).value, 5, 1e-6); assert.equal(d(2).value, 0); assert.equal(d(2).done, true);
  const inf = repeatDriver(timingDriver({ from: 0, to: 10, duration: 1, ease: 'linear' }), { repeat: Infinity, repeatType: 'loop', from: 0, to: 10 });
  assert.equal(inf(100.5).done, false);
});
test('resolveMotionSpring', () => {
  assert.deepEqual(resolveMotionSpring({ stiffness: 100, damping: 10 }, 'move'), { stiffness: 100, damping: 10, mass: 1 });
  assert.deepEqual(resolveMotionSpring('snappy', 'move'), resolveSpring('snappy'));
  assert.deepEqual(resolveMotionSpring(undefined, 'enter'), resolveSpring(MOTION_CHARACTERS.sober.springs.enter));
});
```

- [ ] **Step 2: Comprueba que fallan.** Run: `node --test scripts/motion-api.test.cjs`. Expected: FAIL.

- [ ] **Step 3: Implementa los tres archivos**

`frameloop.ts`: un `Set` de tareas y un único `requestAnimationFrame`, que no se reprograma con el `Set` vacío; una tarea que lanza se quita y no detiene a las demás. `resolveMotionSpring`: si `isMotionRole(input)` o no hay `input`, usa `readSpringConfig(input ?? fallback, el)`; si no, `resolveSpring(input)`.

- [ ] **Step 4: Comprueba que pasan.** Expected: PASS.

---

### Task 3: `animate()` y escritura en elementos

**Files:** Create `src/motion/elementWriter.ts`, `src/motion/animate.ts`, `src/motion/motionValue.ts`, `src/motion/motionHooks.ts`, `stories/Animar.stories.tsx`, `scripts/probe-motion-api.cjs`; Modify `src/motion/index.ts`, `scripts/test-browser.cjs`; Test `scripts/motion-api.test.cjs`

**Interfaces — Consumes:** Tareas 1 y 2, `motionDisabled`, `readMotionSpeed`. **Produces:**

```ts
// motionValue.ts
export interface MotionValue<T = number | string> {
  get(): T; set(value: T): void; velocity(): number;
  on(event: 'change', listener: (value: T) => void): () => void;
}
export function createMotionValue<T extends number | string>(initial: T): MotionValue<T>;
export function isMotionValue(value: unknown): value is MotionValue;

// animate.ts
export type MotionKeyframes = Record<string, string | number | (string | number | null)[]>;
export interface AnimateOptions {
  spring?: MotionSpring;
  timing?: { duration: number; ease?: EaseInput; times?: number[] };
  delay?: number; stagger?: number; velocity?: number;
  repeat?: number; repeatType?: 'loop' | 'reverse';
  onUpdate?: (value: any) => void; onRest?: () => void;
}
export interface AnimationControls { readonly finished: Promise<{ finished: boolean }>; stop(): void; readonly animating: boolean }
export function animate(target: Element | Iterable<Element>, values: MotionKeyframes, options?: AnimateOptions): AnimationControls;
export function animate(from: number, to: number, options?: AnimateOptions): AnimationControls;
export function animate<T extends number | string>(value: MotionValue<T>, to: T | T[], options?: AnimateOptions): AnimationControls;
/** Solo interno: lo usan Motion, drag y layout. */
export function runAnimation(target: Element, values: MotionKeyframes, options: AnimateOptions, defaultRole: MotionRole): AnimationControls;
export function stopAnimations(target: Element, properties?: string[]): void;

// elementWriter.ts
export function readValue(el: Element, key: string): string;
export function writeValue(el: Element, key: string, value: string): void;
export function flushWrites(el: Element): void; // compone los canales x, y, z, inlineX, layoutX, layoutY en `translate`
export function resolveAgainst(el: Element, key: string, raw: string): string; // var(), color-mix(), auto

// motionHooks.ts
export function useAnimate<T extends Element = HTMLElement>(): [React.RefObject<T | null>, typeof animate & ((selector: string, values: MotionKeyframes, options?: AnimateOptions) => AnimationControls)];
export function useReducedMotion(): boolean;
```

Reglas: número en `x`/`y`/`z` = px, en `rotate` = grados; `inlineX` invierte el signo según `direction` leída al arrancar. Sin destino físico, `animate()` usa `move` por defecto. La lectura de colores usa un elemento de sonda `display: none` añadido un instante al padre del elemento, para que `var()` resuelva en su ámbito. **El último fotograma escribe el valor tal como se pidió** (`var(--k-danger)`, `auto`), no el calculado. Una clase con `transition` sobre una propiedad animada avisa una vez por elemento en desarrollo.

- [ ] **Step 1: Escribe las pruebas de unidad que fallan**

```js
test('animate(número): sin DOM va al destino al instante', async () => {
  const seen = []; const c = animate(0, 10, { onUpdate: (v) => seen.push(v) });
  assert.deepEqual(await c.finished, { finished: true }); assert.equal(seen.at(-1), 10);
});
test('createMotionValue avisa y se puede animar', async () => {
  const v = createMotionValue(0); const seen = []; const off = v.on('change', (x) => seen.push(x));
  v.set(3); off(); v.set(4); assert.deepEqual(seen, [3]);
  await animate(v, 8).finished; assert.equal(v.get(), 8);
});
```

- [ ] **Step 2: Escribe la historia y la sonda que falla**

Historia `Función` (id `animar--funcion`): cuatro cajas con `data-testid` (`caja`, `caja-oculta`, `caja-tw` con la clase `-translate-x-1/2`, y `caja-var`). Sonda, con `run` de `probe-kit`:

```js
check('llega al destino y finished se cumple', r.finished === true && r.translate === '100px');
check('interrumpir no salta: la distancia entre fotogramas no se dispara al cambiar de destino', maxStep < 3 * previousMaxStep);
check('colores en var(): el valor final es la variable', r.styleColor === 'var(--k-danger)');
check('tras cambiar a oscuro, el color sigue a la variable', colorDark !== colorLight);           // Review Focus 3
check('no pisa el transform de Tailwind', r.transform === before.transform && r.translate === '40px');
check('quitarlo a mitad no da error y finished es false', r.removed.finished === false && errors.length === 0); // Review Focus 2
check('oculto hacia auto y %: nunca escribe NaN y llega', !/NaN/.test(styleLog.join()) && r.hiddenDone);   // Review Focus 5
check('stagger: cada elemento arranca después', starts[1] - starts[0] >= 30);
check('width a auto: se restaura auto', r.autoStyle === 'auto');
check('pathLength dibuja el trazo', r.dash.length > 0);
check('atributo SVG numérico', r.circleR === '40');
check('fotogramas con null parten del valor actual, y timing.times reparte los tramos', r.nullStart === before.x && r.timesOk);
check('display: se aplica al empezar si muestra y al terminar si oculta', r.shownAtStart && r.hiddenAtEnd);
check('formas no interpolables saltan al final y avisan', r.jumped && r.warned);
check('clase transition sobre la misma propiedad avisa una vez', r.transitionWarnings === 1);
check('inlineX invierte el signo en RTL; x no', r.inlineRtl === -r.inlineLtr && r.xRtl === r.xLtr);
check('useAnimate: selectores dentro de su raíz, y detiene al desmontar', r.scopedOnly && r.stoppedOnUnmount);
check('repeat: Infinity con movimiento reducido no se repite', r.reducedRepeatDone);
for (const modo of ['reducedMotion', 'data-motion=off', 'velocidad 0']) check(`${modo}: destino al instante`, resultados[modo].ms < 50);
check('sin errores de página', errors.length === 0);
```

- [ ] **Step 3: Comprueba que fallan.** Run: `node --test scripts/motion-api.test.cjs`, y con Ladle reiniciado `node scripts/probe-motion-api.cjs`. Expected: FAIL.

- [ ] **Step 4: Implementa los archivos, exporta desde `index.ts` y añade `probe-motion-api.cjs` al grupo `browser`**

El dueño por propiedad es `WeakMap<Element, Map<string, Run>>`. Una animación nueva toma de la anterior el valor y, si la unidad coincide, la velocidad. Por fotograma: calcula, escribe y luego `flushWrites`; nunca lee el layout. `useAnimate` detiene todo lo suyo al desmontar. `useReducedMotion` combina `matchMedia` con `useSyncExternalStore` y lee `motionDisabled` al cambiar.

- [ ] **Step 5: Comprueba que pasan,** y además la verificación común. Expected: PASS y «Todo bien».

---

### Task 4: Efectos con nombre

**Files:** Create `src/motion/motionPresets.ts`; Modify `src/motion/index.ts`; Test `scripts/motion-api.test.cjs`

**Interfaces — Consumes:** `MotionSpring`, `MotionKeyframes`. **Produces:**

```ts
export interface MotionPreset { initial?: MotionKeyframes; animate: MotionKeyframes; exit?: MotionKeyframes; spring?: MotionSpring; timing?: AnimateOptions['timing'] }
export function registerMotionPreset(name: string, preset: MotionPreset, options?: { source?: string }): () => void;
export function unregisterMotionSource(source: string): void;
export function getMotionPreset(name: string): MotionPreset | undefined;
export function useMotionPresets(): ReadonlyArray<{ name: string; source: string; preset: MotionPreset }>;
```

- [ ] **Step 1: Escribe las pruebas que fallan**

```js
test('efectos de serie', () => {
  for (const n of ['fade', 'fade-up', 'fade-down', 'fade-start', 'fade-end', 'scale', 'pop', 'blur']) assert.ok(getMotionPreset(n), n);
  assert.ok('inlineX' in getMotionPreset('fade-start').initial);
  assert.match(String(getMotionPreset('scale').initial.scale), /--k-enter-scale/);
});
test('registrar, reemplazar y quitar', () => {
  const baja = registerMotionPreset('mio', { animate: { opacity: 1 } }, { source: 'app' });
  assert.ok(getMotionPreset('mio')); baja(); assert.equal(getMotionPreset('mio'), undefined);
  registerMotionPreset('otro', { animate: { opacity: 1 } }, { source: 'app' });
  unregisterMotionSource('app'); assert.equal(getMotionPreset('otro'), undefined);
});
test('valida al registrar: avisa y no rompe', (t) => {
  const warn = t.mock.method(console, 'warn', () => {});
  registerMotionPreset('vacio', {}); assert.equal(warn.mock.callCount(), 1);
});
```

- [ ] **Step 2: Comprueba que fallan.** Expected: FAIL.

- [ ] **Step 3: Implementa** copiando el patrón de `src/theme/registry.ts`: `Map`, oyentes, instantánea en caché para `useSyncExternalStore`, `source: 'builtin'` para los de serie. Valores de `var()` en `scale` y `filter`: Task 3 ya los resuelve.

- [ ] **Step 4: Comprueba que pasan.** Expected: PASS.

---

### Task 5: `Motion`

**Files:** Create `src/motion/motionState.ts`, `src/motion/Motion.tsx`; Modify `src/motion/index.ts`, `stories/Animar.stories.tsx`, `scripts/probe-motion-api.cjs`; Test `scripts/motion-api.test.cjs`

**Interfaces — Consumes:** `runAnimation`, `stopAnimations`, `getMotionPreset`, `useInView` (o su `IntersectionObserver` con `viewport`). **Produces:**

```ts
// motionState.ts
export type MotionState = 'tap' | 'hover' | 'focus' | 'inView' | 'animate';
export type MotionTarget = MotionKeyframes | string;
export function targetFor(active: Set<MotionState>, targets: Partial<Record<MotionState, MotionKeyframes>>): MotionKeyframes;
export function initialToStyle(initial: MotionKeyframes): React.CSSProperties;
export function contentKey(value: unknown): string; // estable ante el orden de claves

// Motion.tsx
export interface MotionProps {
  initial?: MotionTarget | false; animate?: MotionTarget; exit?: MotionTarget;
  whileHover?: MotionTarget; whileTap?: MotionTarget; whileFocus?: MotionTarget; inView?: MotionTarget;
  viewport?: { once?: boolean; threshold?: number; rootMargin?: string };
  variants?: Record<string, MotionKeyframes>;
  spring?: MotionSpring; timing?: AnimateOptions['timing']; delay?: number; stagger?: number | boolean;
  onRest?: () => void;
}
export const Motion: { [K in keyof React.JSX.IntrinsicElements]: React.FC<React.JSX.IntrinsicElements[K] & MotionProps> } & {
  create<P>(component: React.ComponentType<P>): React.FC<P & MotionProps>;
};
```

Reglas: `Motion` es un `Proxy` con caché por etiqueta. `stagger={true}` usa `--k-stagger`. Muelles por defecto según la tabla del documento; la vuelta de un estado `while*` usa `pop`. Prioridad y vuelta a lo anterior según el documento: al apagarse un estado, una propiedad que ya nadie nombra vuelve al valor que tenía antes del primer estado.

- [ ] **Step 1: Escribe las pruebas de unidad que fallan**

```js
test('targetFor: prioridad por propiedad', () => {
  const t = { animate: { opacity: 1, y: 0 }, hover: { y: -2 }, tap: { y: 2, scale: 0.9 } };
  assert.deepEqual(targetFor(new Set(['animate']), t), { opacity: 1, y: 0 });
  assert.deepEqual(targetFor(new Set(['animate', 'hover']), t), { opacity: 1, y: -2 });
  assert.deepEqual(targetFor(new Set(['animate', 'hover', 'tap']), t), { opacity: 1, y: 2, scale: 0.9 });
});
test('initialToStyle compone los canales', () => {
  assert.deepEqual(initialToStyle({ opacity: 0, x: 10, y: '50%', rotate: 5, scale: 0.9 }), { opacity: 0, translate: '10px 50%', rotate: '5deg', scale: '0.9' });
});
test('contentKey ignora el orden', () => assert.equal(contentKey({ a: 1, b: 2 }), contentKey({ b: 2, a: 1 })));
test('Motion en servidor: pinta initial y no pasa props al DOM', () => {
  const html = render(React.createElement(Motion.div, { initial: { opacity: 0, y: 12 }, animate: { opacity: 1 }, whileTap: { scale: 0.9 }, spring: 'pop' }));
  assert.match(html, /opacity:0/); assert.match(html, /translate:0(px)? 12px/);
  assert.doesNotMatch(html, /whileTap|spring=|animate=/);
  const off = render(React.createElement(Motion.div, { initial: false, animate: { opacity: 1 } }));
  assert.match(off, /opacity:1/);
});
```

- [ ] **Step 2: Añade la historia y las comprobaciones que fallan**

Historias `Estados`, `Variantes`, `Efectos` y `Muchos` (200 `Motion` dentro de un `React.Profiler` que escribe los commits en `data-testid="commits"`).

```js
check('hover anima y vuelve', scaleHover > 1 && scaleOut === 1);
check('en táctil el hover no se queda pegado', scaleAfterTouch === 1);
check('Intro y Espacio activan whileTap en un botón', keyTap);
check('prioridad: pulsar gana a pasar', pressed === 0.96);
check('rerender del padre no reinicia ni salta', noJump && !restarted);                       // Review Focus 4
check('style con la misma propiedad no pisa lo animado', opacityFinal === '1');              // Review Focus 4
check('inView: hasta entrar se ve initial', before === '0' && after === '1');
check('variantes: los hijos heredan y stagger los escalona', childStarts[1] > childStarts[0]);
check('efecto con nombre y prop explícita que gana', r.presetOpacity === '1' && r.y === '30px');
check('efecto en RTL: fade-start se refleja', xRtl === -xLtr);
check('nombre desconocido avisa y no anima', warned && !moved);
check('cambiar el carácter del tema cambia el movimiento', sober !== playful);
check('StrictMode no duplica animaciones', runs === 1);
check('200 Motion: commits de React por fotograma = 0', commitsDuring === 0, `${commitsDuring}`);
check('Motion.create con un componente propio', r.custom === '1');
```

- [ ] **Step 3: Comprueba que fallan.** Expected: FAIL.

- [ ] **Step 4: Implementa `motionState.ts` y `Motion.tsx`**

Escribe `initialToStyle` en el `style` del primer render y, después, quita del `style` las propiedades que controla el motor. Lanza las animaciones en `useLayoutEffect`, comparando `contentKey`. Los manejadores de puntero, foco y teclado se componen con los del usuario, que se siguen llamando. `whileHover` comprueba `matchMedia('(hover: hover)')`.

- [ ] **Step 5: Comprueba que pasan,** y además la verificación común. Expected: PASS.

---

### Task 6: `Presence`

**Files:** Create `src/motion/Presence.tsx`; Modify `src/motion/Motion.tsx`, `src/motion/index.ts`, `stories/Animar.stories.tsx`, `scripts/probe-motion-api.cjs`; Test `scripts/motion-api.test.cjs`

**Interfaces — Consumes:** `MotionProps.exit`, `runAnimation`. **Produces:**

```ts
export interface PresenceProps { children?: React.ReactNode; mode?: 'sync' | 'wait'; initial?: false; onExitComplete?: () => void }
export const Presence: React.FC<PresenceProps>;
export function usePresence(): { isPresent: boolean; done: () => void };
```

Reglas: `usePresence` fuera de `Presence` devuelve `{ isPresent: true, done: noop }`. Cada hijo saliente espera a todos los `Motion` con `exit` que tenga dentro. Lo que sale lleva `inert`.

- [ ] **Step 1: Escribe la prueba de unidad que falla**

```js
test('Presence en servidor pinta sus hijos e initial={false} los deja en animate', () => {
  const el = React.createElement(Presence, { initial: false }, React.createElement(Motion.div, { key: 'a', initial: { opacity: 0 }, animate: { opacity: 1 } }));
  assert.match(render(el), /opacity:1/);
});
```

- [ ] **Step 2: Añade la historia `Salidas` y las comprobaciones que fallan**

```js
check('sale con animación y se desmonta', stillDuring && goneAfter);
check('sin exit se va al momento', goneNow);
check('lo que sale es inert', inertDuring);
check('la misma key que vuelve invierte desde donde está', noJump && mounted === 1);
check('abrir y cerrar 12 veces en 300 ms: una sola copia y estado final correcto', copies === 1 && r.finalOpacity === '1'); // Review Focus 1
check('mode="wait" espera a que salga', order.join() === 'sale,entra');
check('initial={false} no anima lo que ya estaba', !movedOnMount);
check('onExitComplete se llama una vez', exitCalls === 1);
check('usePresence retrasa el desmontaje', delayedUntilDone);
check('reducedMotion desmonta sin esperar', ms < 50);
```

- [ ] **Step 3: Comprueba que fallan.** Expected: FAIL.

- [ ] **Step 4: Implementa `Presence.tsx`** y conéctalo a `Motion` con un contexto de presencia. Fusiona los hijos actuales y los salientes conservando su orden, sin `setState` por fotograma.

- [ ] **Step 5: Comprueba que pasan,** y además la verificación común. Expected: PASS.

---

### Task 7: Valores de movimiento y scroll

**Files:** Create `src/motion/useScroll.ts`; Modify `src/motion/motionValue.ts`, `src/motion/motionHooks.ts`, `src/motion/Motion.tsx`, `src/motion/index.ts`, `stories/Animar.stories.tsx`, `scripts/probe-motion-api.cjs`; Test `scripts/motion-api.test.cjs`

**Interfaces — Consumes:** `createMotionValue`, `animate`, `addFrameTask`, `interpolate`. **Produces:**

```ts
// motionValue.ts
export function mapRange(input: number, from: number[], to: (number | string)[], options?: { clamp?: boolean }): number | string;
export function motionTemplate(strings: TemplateStringsArray, ...values: (MotionValue | string | number)[]): MotionValue<string>;
// motionHooks.ts
export function useMotionValue<T extends number | string>(initial: T): MotionValue<T>;
export function useTransform<T>(value: MotionValue<number>, from: number[], to: T[], options?: { clamp?: boolean }): MotionValue<T>;
export function useTransform<S, T>(value: MotionValue<S>, map: (value: S) => T): MotionValue<T>;
export function useSpringValue(value: MotionValue<number>, options?: { spring?: MotionSpring }): MotionValue<number>;
export function usePointerValue(target?: React.RefObject<Element | null>): { x: MotionValue<number>; y: MotionValue<number> };
// useScroll.ts
export type ScrollOffset = [string, string];
export function scrollProgress(m: { scroll: number; viewport: number; targetStart: number; targetSize: number }, offset: ScrollOffset): number;
export function useScroll(o?: { target?: React.RefObject<Element | null>; container?: React.RefObject<Element | null>; offset?: ScrollOffset }): { x: MotionValue<number>; y: MotionValue<number>; progress: MotionValue<number>; progressX: MotionValue<number> };
```

`MotionProps.style` pasa a aceptar `MotionValue` en cualquier clave y `Motion` se suscribe y escribe con `writeValue`/`flushWrites`, sin rerenderizar. `useSpringValue` usa `gesture` por defecto.

- [ ] **Step 1: Escribe las pruebas de unidad que fallan**

```js
test('mapRange', () => {
  assert.equal(mapRange(50, [0, 100], [0, 1]), 0.5);
  assert.equal(mapRange(200, [0, 100], [0, 1]), 1);
  assert.equal(mapRange(200, [0, 100], [0, 1], { clamp: false }), 2);
  assert.equal(mapRange(50, [0, 100], ['0px', '10px']), '5px');
  assert.match(mapRange(50, [0, 100], ['#000', '#fff']), /^oklab\(/);
  assert.equal(mapRange(50, [0, 25, 100], [0, 1, 0]), mapRange(50, [25, 100], [1, 0]));
});
test('motionTemplate recompone al cambiar', () => {
  const v = createMotionValue(10); const t = motionTemplate`hsl(${v} 80% 50%)`;
  assert.equal(t.get(), 'hsl(10 80% 50%)'); v.set(20); assert.equal(t.get(), 'hsl(20 80% 50%)');
});
test('scrollProgress', () => {
  const m = { scroll: 500, viewport: 1000, targetStart: 1000, targetSize: 200 };
  assert.equal(scrollProgress({ ...m, scroll: 600 }, ['start end', 'end start']), 0.5);
  assert.equal(scrollProgress({ ...m, scroll: 0 }, ['start end', 'end start']), 0);
  assert.equal(scrollProgress({ ...m, scroll: 1200 }, ['start end', 'end start']), 1);
  assert.equal(scrollProgress({ ...m, scroll: 9999 }, ['start end', 'end start']), 1);
  assert.equal(scrollProgress({ ...m, viewport: 0, targetSize: 0, targetStart: 0 }, ['start end', 'end start']), 0); // sin división por cero
});
```

- [ ] **Step 2: Añade las historias `Valores` y `Scroll` y las comprobaciones que fallan**

```js
check('style con MotionValue escribe sin rerender', changed && commits === 0);
check('useTransform enlaza opacidad con x', opacityAt100 === '0');
check('useSpringValue sigue con muelle', overTime.at(-1) === 100 && overTime[1] < 100);
check('useScroll: progress de 0 a 1', first === 0 && last === 1);
check('useScroll con container y target', targetProgress > 0 && targetProgress < 1);
check('usePointerValue sigue al puntero', px === 200);
check('useScroll sigue con movimiento reducido', reducedProgress > 0);
```

- [ ] **Step 3: Comprueba que fallan.** Expected: FAIL.

- [ ] **Step 4: Implementa** con listeners pasivos, recálculo una vez por fotograma con `addFrameTask` y `useResizeObserver` para los cambios de tamaño. En `useTransform`, las suscripciones se limpian al desmontar.

- [ ] **Step 5: Comprueba que pasan,** y además la verificación común. Expected: PASS.

---

### Task 8: `drag` y `layout`

**Files:** Create `src/motion/drag.ts`, `src/motion/layout.ts`; Modify `src/motion/Motion.tsx`, `stories/Animar.stories.tsx`, `scripts/probe-motion-api.cjs`; Test `scripts/motion-api.test.cjs`

**Interfaces — Consumes:** `createVelocityTracker`, `rubberband`, `projectRelease`, `startPointerDrag`, `runAnimation`, canales `layoutX`/`layoutY` de `writeValue`. **Produces:**

```ts
// drag.ts
export interface DragConstraints { left?: number; right?: number; top?: number; bottom?: number }
export function constrainDrag(value: number, min: number | undefined, max: number | undefined, elastic: number): number;
export function releaseTarget(value: number, velocity: number, min?: number, max?: number): number;
// MotionProps añade
drag?: boolean | 'x' | 'y'; dragConstraints?: DragConstraints; dragElastic?: number;
onDragStart?: (info: DragInfo) => void; onDrag?: (info: DragInfo) => void; onDragEnd?: (info: DragInfo) => void;
layout?: boolean;
// DragInfo: { x, y, vx, vy, offsetX, offsetY }
```

`dragElastic` por defecto `0.2`. `touch-action`: `pan-y` con `x`, `pan-x` con `y`, `none` con ambos. `drag` acepta cualquier puntero. `layout` solo mueve la posición y ajusta los canales `layoutX`/`layoutY`, sin tocar `x`/`y` del usuario.

- [ ] **Step 1: Escribe las pruebas de unidad que fallan**

```js
test('constrainDrag: dentro no cambia; fuera, con goma', () => {
  assert.equal(constrainDrag(50, -100, 100, 0.2), 50);
  const over = constrainDrag(150, -100, 100, 0.2); assert.ok(over > 100 && over < 150);
  assert.equal(constrainDrag(150, -100, 100, 0), 100);
  assert.equal(constrainDrag(500, undefined, undefined, 0.2), 500);
});
test('releaseTarget: proyecta y respeta los límites', () => {
  assert.equal(releaseTarget(150, 0, -100, 100), 100);
  assert.ok(releaseTarget(0, 1000) > 100);
  assert.equal(releaseTarget(0, 5000, -100, 100), 100);
});
```

- [ ] **Step 2: Añade las historias `Arrastre` y `Cambios de sitio` y las comprobaciones que fallan**

```js
check('arrastra en x y no en y', moved.x > 50 && moved.y === 0);
check('soltar fuera del límite vuelve con muelle', settled === 100 && overshootSeen);
check('el scroll vertical sigue con drag="x" en táctil', scrolled);
check('onDragEnd da la velocidad', info.vx !== 0);
check('layout: al reordenar llega sin saltar', noJump && finalTranslate === 'none');
check('layout no pisa la x del usuario', r.x === '20px' && !jumped);
check('sin movimiento: drag sigue a mano y al soltar va directo', followed && ms < 50);
```

- [ ] **Step 3: Comprueba que fallan.** Expected: FAIL.

- [ ] **Step 4: Implementa `drag.ts` y `layout.ts`** y conéctalos en `Motion.tsx`. `layout` mide en `useLayoutEffect`, descontando el `translate` actual, como `useFlip`.

- [ ] **Step 5: Comprueba que pasan,** y además la verificación común. Expected: PASS.

---

### Task 9: Documentación y cierre

**Files:** Modify `docs/movimiento.md`, `CHANGELOG.md`, `CLAUDE.md`, `stories/Animar.stories.tsx`

- [ ] **Step 1: Comprueba que la historia cubre el documento:** `Función`, `Estados`, `Variantes`, `Efectos`, `Muchos`, `Salidas`, `Valores`, `Scroll`, `Arrastre`, `Cambios de sitio`. Añade lo que falte.

- [ ] **Step 2: Reescribe el principio de `docs/movimiento.md`** con esta API primero, un ejemplo por sección, cuándo usar `Reveal` o `Transition`, y el aviso sobre las clases `transition-*`.

- [ ] **Step 3: Añade la entrada en `CHANGELOG.md` y un párrafo en «Physical motion» de `CLAUDE.md`** con el mapa de archivos, la regla de un dueño por propiedad, y `probe-motion-api.cjs`.

- [ ] **Step 4: Verificación final**

```bash
npm run typecheck
npm test
npm run check
npm run build
node scripts/probe-motion-api.cjs
node scripts/probe-motion.cjs
node scripts/probe-rtl.cjs
```

Expected: todo pasa. Además, `grep -rlE "from '.*motion/(Motion|Presence|animate)'" src --include=*.ts* --exclude-dir=motion` no devuelve nada.

- [ ] **Step 5: Comprueba que las historias nuevas no añaden problemas:** `npm run check:a11y` y `node scripts/probe-i18n.cjs`. Expected: sin problemas nuevos respecto a `scripts/a11y-baseline.json`.
