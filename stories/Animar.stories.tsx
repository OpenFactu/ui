import * as React from 'react';
import type { Story } from '@ladle/react';
import { Motion, Presence, animate, motionTemplate, useAnimate, useMotionPresets, useMotionValue, usePointerValue, usePresence, useScroll, useSpringValue, useTransform, type AnimationControls } from '../src/motion';
import { Button } from '../src/components/Button';

const box = 'flex h-16 w-16 items-center justify-center text-center rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] text-xs text-[var(--fg-default,#0a1628)]';
const hint = 'text-xs text-[var(--fg-muted,#52606f)]';
const section = 'flex flex-col gap-3';

/** `useAnimate`: selectores dentro de su raíz, y al desmontar se detiene lo suyo. */
const Acotado: React.FC<{ onResult: (text: string) => void }> = ({ onResult }) => {
  const [scope, run] = useAnimate<HTMLDivElement>();
  const away = React.useRef(false);
  const start = () => {
    away.current = !away.current;
    const controls = run('.dentro', { x: away.current ? 64 : 0 }, { timing: { duration: 1500, ease: 'linear' } });
    void controls.finished.then((result) => onResult(result.finished ? 'terminó' : 'se detuvo'));
  };
  return (
    <div ref={scope} className="flex items-center gap-3">
      <Button size="sm" variant="secondary" onClick={start} data-testid="acotado-mover">Mover la de dentro</Button>
      <div className={`dentro ${box}`} data-testid="dentro">Dentro</div>
    </div>
  );
};

/** Sin React ni estados: una función, cualquier destino y el muelle del tema. */
export const Funcion: Story = () => {
  const spring = React.useRef<HTMLDivElement>(null);
  const a = React.useRef<HTMLDivElement>(null);
  const b = React.useRef<HTMLDivElement>(null);
  const c = React.useRef<HTMLDivElement>(null);
  const [total, setTotal] = React.useState(0);
  const [mounted, setMounted] = React.useState(true);
  const [result, setResult] = React.useState('');
  const last = React.useRef<AnimationControls | null>(null);
  const moved = React.useRef(false);
  const lowered = React.useRef(false);
  const painted = React.useRef(false);

  const move = () => {
    moved.current = !moved.current;
    last.current = animate(spring.current!, { x: moved.current ? 160 : 0, rotate: moved.current ? 8 : 0 }, { spring: 'bouncy' });
  };
  const stagger = () => {
    lowered.current = !lowered.current;
    animate([a.current!, b.current!, c.current!], { y: lowered.current ? 16 : 0 }, { stagger: 60 });
  };
  const paint = () => {
    painted.current = !painted.current;
    animate(b.current!, { backgroundColor: painted.current ? 'var(--k-danger, #dc2626)' : 'var(--bg-card, #ffffff)' });
  };
  const count = () => animate(0, 12500, { spring: 'gentle', onUpdate: (value: number) => setTotal(Math.round(value)) });

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <section className={section}>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={move}>Mover con rebote</Button>
          <Button size="sm" variant="secondary" onClick={stagger}>Uno tras otro</Button>
          <Button size="sm" variant="secondary" onClick={paint}>Cambiar de color</Button>
          <Button size="sm" variant="secondary" onClick={count}>Contar</Button>
        </div>
        <div ref={spring} className={box}>Rebota</div>
        <div className="flex gap-3 pb-6">
          <div ref={a} className={box}>A</div>
          <div ref={b} className={box}>B</div>
          <div ref={c} className={box}>C</div>
        </div>
        <p className="font-display text-2xl tabular-nums text-[var(--fg-default,#0a1628)]">{total.toLocaleString('es-ES')}</p>
        <p className={hint}>Pulsa otra vez a mitad de camino: sigue con la velocidad que llevaba, sin saltos.</p>
      </section>

      <section className={section}>
        <h3 className="font-display text-base text-[var(--fg-default,#0a1628)]">Con useAnimate</h3>
        <p className={hint}>Busca los selectores dentro de su raíz: «Fuera» tiene la misma clase y no se mueve. Al desmontar a mitad, lo suyo se detiene.</p>
        {mounted && <Acotado onResult={setResult} />}
        <div className={`dentro ${box}`} data-testid="fuera">Fuera</div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setMounted((v) => !v)} data-testid="acotado-montar">{mounted ? 'Desmontar' : 'Montar'}</Button>
          {result && <span className={hint}>La última animación <span data-testid="acotado-resultado">{result}</span>.</span>}
        </div>
      </section>
    </div>
  );
};
Funcion.storyName = 'Función';

const Tarjeta: React.FC<React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }> = (props) => <div {...props} className={box} />;
const MiTarjeta = Motion.create(Tarjeta);

const ContadorDeReposo: React.FC = () => {
  const [rests, setRests] = React.useState(0);
  return (
    <Motion.div className={box} data-testid="estricto" initial={{ opacity: 0 }} animate={{ opacity: 1 }} spring={{ duration: 0.2 }} onRest={() => setRests((value) => value + 1)}>
      {rests}
    </Motion.div>
  );
};

/** Pasar, pulsar, enfocar y aparecer en pantalla: cada uno con su prop, y al acabar vuelve solo. */
export const Estados: Story = () => {
  const [tick, setTick] = React.useState(0);
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Motion.button type="button" data-testid="boton" className={box} whileHover={{ scale: 1.2 }} whileTap={{ scale: 0.96 }} whileFocus={{ rotate: 3 }} spring={{ duration: 0.1 }}>Pulsa</Motion.button>
        <MiTarjeta data-testid="propio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} spring={{ duration: 0.15 }}>Propio</MiTarjeta>
      </div>
      <p className={hint}>Pasa por encima, pulsa o llega con el tabulador. En móvil, pasar por encima no existe: no se queda pegado.</p>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" data-testid="rerender" onClick={() => setTick((value) => value + 1)}>Repintar el padre ({tick})</Button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Motion.div className={box} data-testid="con-style" style={{ opacity: 0.5 - tick * 0.01 }} animate={{ opacity: 1 }} spring={{ duration: 0.2 }}>Se aclara</Motion.div>
        <Motion.div className={box} data-testid="literal" animate={{ x: 120 }} spring={{ duration: 2 }}>Se mueve</Motion.div>
      </div>
      <p className={hint}>Repintar con un objeto nuevo y lo mismo dentro no reinicia nada.</p>
      <div className="h-[1400px]" />
      <Motion.div className={box} data-testid="vista" initial={{ opacity: 0, y: 24 }} inView={{ opacity: 1, y: 0 }} spring={{ duration: 0.2 }}>Hola</Motion.div>
    </div>
  );
};

const FILAS = { oculto: { opacity: 0, x: -12 }, visible: { opacity: 1, x: 0 } };

/** Un hijo que cambia por su cuenta, sin que su padre se repinte. */
const HijoSuelto: React.FC = () => {
  const [on, setOn] = React.useState(false);
  return <Motion.button type="button" data-testid="hijo-suelto" className={box} animate={{ x: on ? 40 : 0 }} spring={{ duration: 0.1 }} onClick={() => setOn((value) => !value)}>Suelto</Motion.button>;
};

/** Estados con nombre: los hijos heredan el nombre y `stagger` los escalona. */
export const Variantes: Story = () => {
  const [shown, setShown] = React.useState(true);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <div><Button size="sm" variant="secondary" data-testid="variantes-cambiar" onClick={() => setShown((value) => !value)}>{shown ? 'Ocultar' : 'Mostrar'}</Button></div>
      <Motion.ul data-testid="padre" className="flex flex-col gap-2" initial="oculto" animate={shown ? 'visible' : 'oculto'} variants={FILAS} stagger={70} spring={{ duration: 0.3 }}>
        {[0, 1, 2].map((i) => (
          <Motion.li key={i} data-testid={`hijo-${i}`} variants={FILAS} spring={{ duration: 0.3 }} className={`${box} w-full`}>Fila {i + 1}</Motion.li>
        ))}
      </Motion.ul>
    </div>
  );
};

/** Los efectos con nombre del registro. Los tuyos se añaden con `registerMotionPreset`. */
export const Efectos: Story = () => {
  const presets = useMotionPresets();
  const [round, setRound] = React.useState(0);
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div><Button size="sm" variant="secondary" onClick={() => setRound((value) => value + 1)}>Otra vez</Button></div>
      <div className="flex flex-wrap gap-3">
        {presets.map(({ name }) => <Motion.div key={`${name}-${round}`} className={`${box} w-24`} animate={name}>{name}</Motion.div>)}
      </div>
    </div>
  );
};

/** Doscientos elementos animando: React solo se entera del cambio, no de cada fotograma. */
export const Muchos: Story = () => {
  const [on, setOn] = React.useState(false);
  const commits = React.useRef(0);
  const output = React.useRef<HTMLSpanElement>(null);
  const items = React.useMemo(() => Array.from({ length: 200 }, (_, i) => i), []);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button size="sm" variant="secondary" data-testid="muchos-animar" onClick={() => setOn((value) => !value)}>Animar</Button>
        <span className={hint}>Commits de React: <span ref={output} data-testid="commits">0</span></span>
      </div>
      <React.Profiler id="muchos" onRender={() => { commits.current += 1; if (output.current) output.current.textContent = String(commits.current); }}>
        <div className="flex flex-wrap gap-1">
          {items.map((i) => <Motion.div key={i} data-testid={i === 0 ? 'muchos-0' : undefined} className="h-3 w-3 rounded-[var(--k-radius-xs,2px)] bg-[var(--fg-muted,#52606f)]" animate={{ y: on ? 12 : 0, rotate: on ? 45 : 0 }} spring={{ duration: 0.6, bounce: 0.2 }} />)}
        </div>
      </React.Profiler>
    </div>
  );
};

/** Una pieza propia que decide cuándo puede irse. */
const Retardada: React.FC = () => {
  const { isPresent, done } = usePresence();
  React.useEffect(() => {
    if (isPresent) return undefined;
    const timer = setTimeout(done, 400);
    return () => clearTimeout(timer);
  }, [isPresent, done]);
  return <div className={box} data-testid="retardada">{isPresent ? 'Aquí' : 'Yéndose'}</div>;
};

/** Salidas al desmontar: basta con quitarlo. `Presence` lo mantiene hasta que termina de irse. */
export const Salidas: Story = () => {
  const [open, setOpen] = React.useState(true);
  const [plain, setPlain] = React.useState(true);
  const [which, setWhich] = React.useState('a');
  const [late, setLate] = React.useState(true);
  const [completed, setCompleted] = React.useState(0);
  const [slow, setSlow] = React.useState(true);
  const [already, setAlready] = React.useState(true);
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" data-testid="abrir" onClick={() => setOpen((value) => !value)}>{open ? 'Quitar' : 'Poner'}</Button>
        <span className={hint}>Salidas terminadas: <span data-testid="completas">{completed}</span></span>
      </div>
      <div className="h-16">
        <Presence onExitComplete={() => setCompleted((value) => value + 1)}>
          {open && <Motion.div key="panel" data-testid="panel" className={box} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} spring={{ duration: 0.3 }}><button type="button" data-testid="panel-boton">Hola</button></Motion.div>}
        </Presence>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" data-testid="cambiar" onClick={() => setWhich((value) => (value === 'a' ? 'b' : 'a'))}>Cambiar (espera a que salga)</Button>
        <div className="h-16 w-16">
          <Presence mode="wait">
            <Motion.div key={which} data-testid={`espera-${which}`} className={box} animate="fade-up" exit={{ opacity: 0 }} spring={{ duration: 0.3 }}>{which}</Motion.div>
          </Presence>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" data-testid="sin-exit-quitar" onClick={() => setPlain((value) => !value)}>Sin salida</Button>
        <Presence>{plain && <Motion.div key="simple" data-testid="sin-exit" className={box} animate={{ opacity: 1 }}>Simple</Motion.div>}</Presence>
        <Button size="sm" variant="secondary" data-testid="ya-quitar" onClick={() => setAlready((value) => !value)}>Quitar y poner</Button>
        <Presence initial={false}>{already && <Motion.div key="ya" data-testid="ya-estaba" className={box} initial={{ opacity: 0 }} animate={{ opacity: 1 }} spring={{ duration: 2 }}>Ya estaba</Motion.div>}</Presence>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button size="sm" variant="secondary" data-testid="retardada-quitar" onClick={() => setLate((value) => !value)}>Con usePresence</Button>
        <Presence>{late && <Retardada key="r" />}</Presence>
        <Button size="sm" variant="secondary" data-testid="lento-quitar" onClick={() => setSlow((value) => !value)}>Salida lenta</Button>
        <Presence>{slow && <Motion.div key="l" data-testid="lento" className={box} initial={{ x: 0 }} animate={{ x: 0 }} exit={{ x: 200 }} spring={{ duration: 1.2 }}>Lento</Motion.div>}</Presence>
      </div>
    </div>
  );
};

/** Valores que cambian sin pasar por React: un botón, el puntero o una animación los escriben y los estilos los siguen. */
export const Valores: Story = () => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0, 100], [0.15, 1, 0.15]);
  const hue = useTransform(x, [-100, 100], [160, 320]);
  const background = motionTemplate`hsl(${hue} 70% 50%)`;
  const smooth = useSpringValue(x, { spring: { duration: 0.5, bounce: 0.3 } });
  const pointer = usePointerValue();
  const commits = React.useRef(0);
  const output = React.useRef<HTMLSpanElement>(null);
  return (
    <React.Profiler id="valores" onRender={() => { commits.current += 1; if (output.current) output.current.textContent = String(commits.current); }}>
      <div className="flex max-w-2xl flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="secondary" data-testid="valor-izquierda" onClick={() => x.set(-100)}>−100</Button>
          <Button size="sm" variant="secondary" data-testid="valor-cero" onClick={() => x.set(0)}>0</Button>
          <Button size="sm" variant="secondary" data-testid="valor-derecha" onClick={() => x.set(100)}>+100</Button>
          <Button size="sm" variant="secondary" onClick={() => animate(x, x.get() > 0 ? -100 : 100, { spring: 'bouncy' })}>Con muelle</Button>
          <span className={hint}>Commits de React: <span ref={output} data-testid="valores-commits">0</span></span>
        </div>
        <div className="ms-28 flex flex-col gap-3 pb-2">
          <Motion.div className={box} data-testid="valor-x" style={{ x, opacity, background }}>Manda</Motion.div>
          <Motion.div className={box} data-testid="valor-suave" style={{ x: smooth }}>Le sigue</Motion.div>
        </div>
        <p className={hint}>El de abajo sigue al de arriba con un muelle. El punto va con el puntero.</p>
        <Motion.div aria-hidden="true" data-testid="puntero" className="pointer-events-none fixed start-0 top-0 h-3 w-3 rounded-[var(--k-radius-full,9999px)] bg-[var(--fg-muted,#52606f)]" style={{ x: pointer.x, y: pointer.y }} />
      </div>
    </React.Profiler>
  );
};

/** La barra sigue a la página y el cuadro a su paso por el contenedor. Con movimiento reducido, lo decides tú con `useReducedMotion`. */
export const Scroll: Story = () => {
  const page = useScroll();
  const container = React.useRef<HTMLDivElement>(null);
  const target = React.useRef<HTMLDivElement>(null);
  const local = useScroll({ container, target, offset: ['start end', 'end start'] });
  const rotate = useTransform(local.progress, [0, 1], [-20, 20]);
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <Motion.div data-testid="barra" className="fixed start-0 top-0 h-1 w-full origin-left bg-[var(--fg-muted,#52606f)]" style={{ scaleX: page.progress }} />
      <p className={hint}>Baja por la página o dentro del recuadro.</p>
      <div ref={container} data-testid="contenedor" tabIndex={0} className="relative h-64 overflow-y-auto rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)]">
        <div className="h-96" />
        <Motion.div ref={target} data-testid="objetivo" className={`${box} mx-auto`} style={{ rotate, '--paso': local.progress }}>Gira</Motion.div>
        <div className="h-96" />
      </div>
      <div className="h-[1800px]" />
    </div>
  );
};

/** Arrastrar con límites: al soltar sigue con la velocidad que llevaba y vuelve con el muelle del tema. */
export const Arrastre: Story = () => {
  const speed = React.useRef<HTMLSpanElement>(null);
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <div className="ms-32 flex flex-col gap-3">
        <Motion.div data-testid="arrastre-x" className={`${box} cursor-grab`} drag="x" dragConstraints={{ left: -100, right: 100 }} dragElastic={0.3} spring={{ duration: 0.4, bounce: 0.2 }} onDragEnd={(info) => { if (speed.current) speed.current.textContent = String(Math.round(info.vx)); }}>Límites</Motion.div>
        <Motion.div data-testid="arrastre-libre" className={`${box} cursor-grab`} drag>Libre</Motion.div>
        <Motion.div data-testid="arrastre-fijo" className={`${box} w-24 cursor-grab`} drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.5} spring={{ duration: 0.4 }}>Tira y vuelve</Motion.div>
      </div>
      <p className={hint}>Velocidad al soltar: <span ref={speed} data-testid="arrastre-velocidad">0</span> px/s. En móvil, el scroll vertical sigue funcionando sobre el primero.</p>
      <div className="h-[1400px]" />
    </div>
  );
};

/** Lo que cambia de sitio tras un render llega con el muelle `move`. */
export const CambiosDeSitio: Story = () => {
  const [items, setItems] = React.useState(['Uno', 'Dos', 'Tres', 'Cuatro']);
  return (
    <div className="flex max-w-md flex-col gap-3">
      <div><Button size="sm" variant="secondary" data-testid="sitio-invertir" onClick={() => setItems((list) => [...list].reverse())}>Invertir</Button></div>
      <ul className="flex flex-col gap-2">
        {items.map((item) => <Motion.li key={item} layout data-testid={`sitio-${item}`} className={`${box} w-full`} spring={{ duration: 0.5 }} style={item === 'Dos' ? { x: 20 } : undefined}>{item}</Motion.li>)}
      </ul>
    </div>
  );
};
CambiosDeSitio.storyName = 'Cambios de sitio';

/** Arrastrar un valor de movimiento: lo que se enlaza con él sigue el gesto, también en la vuelta. */
const ArrastreConValor: React.FC = () => {
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-100, 0], [1, 0]);
  return (
    <div className="flex items-center gap-3 ps-32">
      <Motion.div data-testid="valor-arrastre" className={box} drag="x" dragConstraints={{ left: -100, right: 0 }} dragElastic={0} style={{ x }} onDragEnd={() => animate(x, 0, { spring: { duration: 0.2 } })}>valor</Motion.div>
      <Motion.div data-testid="valor-revelado" className={box} style={{ opacity }}>detrás</Motion.div>
    </div>
  );
};

/** No es una demo: lo que necesitan `scripts/probe-motion-api.cjs` y no enseña nada por sí mismo. */
export const Pruebas: Story = () => (
  <div className="flex flex-col gap-4">
    <p className={hint}>Piezas para las comprobaciones automáticas. Aquí no hay nada que ver.</p>
    <div className="flex flex-wrap gap-3">
      <div className={box} data-testid="caja">caja</div>
      <div className={`${box} -translate-x-1/2`} data-testid="caja-tw">tw</div>
      <div className={box} data-testid="caja-var">var</div>
      <div className="hidden" data-testid="caja-oculta" />
      <div className={box} data-testid="caja-a">a</div>
      <div className={box} data-testid="caja-b">b</div>
      <div className={box} data-testid="caja-c">c</div>
      <div dir="rtl"><div className={box} data-testid="caja-rtl">rtl</div></div>
      <div className={box} data-testid="caja-ltr">ltr</div>
      <svg width="80" height="80" viewBox="0 0 80 80" aria-hidden="true">
        <path data-testid="trazo" d="M4 40 H76" fill="none" stroke="currentColor" strokeWidth="2" />
        <circle data-testid="circulo" cx="40" cy="40" r="10" fill="none" stroke="currentColor" />
      </svg>
    </div>
    <div className="flex flex-wrap items-center gap-3">
      <Motion.div data-testid="vuelta" className={`${box} w-24`} style={{ color: 'var(--prueba-color, rgb(0, 0, 255))' }} whileHover={{ color: 'rgb(255, 0, 0)', width: 200 }} spring={{ duration: 0.1 }}>vuelta</Motion.div>
      <svg width="80" height="80" aria-hidden="true"><Motion.circle data-testid="circulo-motion" cx="40" cy="40" fill="currentColor" initial={{ r: 0 }} animate={{ r: 30 }} spring={{ duration: 0.15 }} /></svg>
      <Motion.div data-testid="asentado" className={box} initial={{ y: 12, rotate: 5, scale: 0.9 }} animate={{ y: 0, rotate: 0, scale: 1 }} spring={{ duration: 0.15 }}>0</Motion.div>
      <React.StrictMode><ContadorDeReposo /></React.StrictMode>
      <Motion.div stagger={100}><HijoSuelto /></Motion.div>
    </div>
    <ArrastreConValor />
    <div className="flex flex-wrap gap-3">
      <Motion.div className={box} data-testid="explicito" animate="fade-up" initial={{ y: 30 }} spring={{ duration: 3 }}>y</Motion.div>
      <Motion.div className={box} data-testid="ltr-lento" animate="fade-start" spring={{ duration: 3 }}>ltr</Motion.div>
      <div dir="rtl"><Motion.div className={box} data-testid="rtl-lento" animate="fade-start" spring={{ duration: 3 }}>rtl</Motion.div></div>
      <Motion.div className={box} data-testid="desconocido" animate="no-existe">?</Motion.div>
    </div>
  </div>
);

export default { title: 'Animar' };
