import * as React from 'react';
import type { Story } from '@ladle/react';
import { Archive, Bell, Calendar, FileText, Home, Mail, Minus, Plus, Search, Settings, ShoppingCart } from 'lucide-react';
import {
  MOTION_CHARACTERS, Motion, Presence, animate, motionTemplate, resolveSpring, springAt, useMotionValue, usePointerValue, useScroll, useSpringValue, useTransform,
  type MotionCharacter, type MotionValue,
} from '../src/motion';
import { resolveTheme, themeToCssVars } from '../src/theme';
import { useInView } from '../src/hooks/useInView';
import { Button } from '../src/components/Button';
import { Input } from '../src/components/Input';
import { SegmentedControl } from '../src/components/SegmentedControl';

const hint = 'text-xs text-[var(--fg-muted,#52606f)]';
const card = 'rounded-[var(--k-radius-md,8px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)]';
const title = 'font-display text-base text-[var(--fg-default,#0a1628)]';
const body = 'text-sm text-[var(--fg-default,#0a1628)]';

const CHARACTERS = Object.entries(MOTION_CHARACTERS).map(([value, item]) => ({ value: value as MotionCharacter, label: item.label }));

/** Solo el movimiento del carácter elegido: los colores siguen siendo los del tema de alrededor. */
function motionVars(character: MotionCharacter): React.CSSProperties {
  const vars = themeToCssVars(resolveTheme({ motion: { character } }));
  return Object.fromEntries(Object.entries(vars).filter(([key]) => /^--k-(spring|stagger|enter)/.test(key))) as React.CSSProperties;
}

/** Cada ejemplo: qué es, el propio ejemplo con el carácter a elegir, y la idea en código. */
const Ejemplo: React.FC<{ description: string; code: string; children: React.ReactNode }> = ({ description, code, children }) => {
  const [character, setCharacter] = React.useState<MotionCharacter>('expressive');
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className={body}>{description}</p>
      <div className="flex flex-wrap items-center gap-2">
        <span className={hint}>Movimiento del tema:</span>
        <SegmentedControl size="sm" variant="raised" aria-label="Movimiento del tema" options={CHARACTERS} value={character} onChange={setCharacter} />
      </div>
      <div style={motionVars(character)}>{children}</div>
      <details className={hint}>
        <summary className="cursor-pointer">La idea en código</summary>
        <pre className={`${card} mt-2 overflow-x-auto p-3 font-mono text-xs text-[var(--fg-default,#0a1628)]`}>{code}</pre>
      </details>
    </div>
  );
};

/* ----------------------------------------------------------------- Comparar ------------------------------------------------------------------ */

/** La curva de un muelle: de 0 a 1, y lo que se pase de 1 es el rebote. */
function curvaDe(character: MotionCharacter) {
  const config = resolveSpring(MOTION_CHARACTERS[character].springs.move);
  const samples = Array.from({ length: 141 }, (_, i) => 1 + springAt(i / 100, config, -1, 0).value);
  const reposo = samples.length - [...samples].reverse().findIndex((value) => Math.abs(value - 1) > 0.002);
  return {
    path: samples.map((value, i) => `${i === 0 ? 'M' : 'L'}${(i * 240) / 140} ${64 - value * 44}`).join(' '),
    rebote: Math.round((Math.max(...samples) - 1) * 100),
    reposo: reposo / 100,
  };
}

const FilaModo: React.FC<{ character: MotionCharacter; on: boolean; round: number }> = ({ character, on, round }) => {
  const { label, description, stagger } = MOTION_CHARACTERS[character];
  const curva = React.useMemo(() => curvaDe(character), [character]);
  return (
    <section data-testid={`modo-${character}`} style={motionVars(character)} className={`${card} flex flex-col gap-3 p-3`}>
      <div>
        <p className={title}>{label}</p>
        <p className={hint}>{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <svg width="240" height="72" viewBox="0 0 240 72" role="img" aria-label={`Curva de ${label}: se pasa un ${curva.rebote} %`} className="max-w-full">
          <line x1="0" x2="240" y1="20" y2="20" stroke="var(--border-default, #e2e8f0)" strokeDasharray="4 3" />
          <path d={curva.path} fill="none" stroke="var(--color-accent, #0d9488)" strokeWidth="2" />
        </svg>
        <p className={hint}>Se pasa un <strong>{curva.rebote} %</strong> del recorrido<br />Quieto en {curva.reposo.toLocaleString('es-ES')} s · Escalonado de {stagger} ms</p>
      </div>
      <div className="h-6 overflow-hidden">
        <Motion.div data-testid={`bola-${character}`} className="h-6 w-6 rounded-[var(--k-radius-full,9999px)] bg-[var(--color-accent,#0d9488)]" animate={{ x: on ? 200 : 0 }} />
      </div>
      <Motion.div key={round} className="flex gap-2" initial="oculto" animate="visible" stagger>
        {[0, 1, 2, 3].map((i) => <Motion.div key={i} className={`${card} h-10 flex-1`} variants={{ oculto: { opacity: 0, scale: 0.5 }, visible: { opacity: 1, scale: 1 } }} spring="pop" />)}
      </Motion.div>
    </section>
  );
};

/** Los cuatro modos a la vez, con el mismo movimiento: la curva dice lo que se ve. */
export const Comparar: Story = () => {
  const [on, setOn] = React.useState(false);
  const [round, setRound] = React.useState(0);
  const play = () => { setOn((value) => !value); setRound((value) => value + 1); };
  React.useEffect(() => { const timer = setTimeout(() => setOn(true), 500); return () => clearTimeout(timer); }, []);
  return (
    <div className="flex max-w-2xl flex-col gap-4">
      <p className={body}>El mismo movimiento con los cuatro modos a la vez. La línea de puntos es el destino: lo que sube por encima es el rebote.</p>
      <div><Button size="sm" data-testid="comparar-otra" onClick={play}>Otra vez</Button></div>
      {CHARACTERS.map(({ value }) => <FilaModo key={value} character={value} on={on} round={round} />)}
    </div>
  );
};

/* ------------------------------------------------------------------ Bandeja ------------------------------------------------------------------ */

interface Mensaje { id: string; de: string; asunto: string; hora: string }

const MENSAJES: Mensaje[] = [
  { id: 'a', de: 'Laura Gómez', asunto: 'Factura de octubre lista para revisar', hora: '9:41' },
  { id: 'b', de: 'Contabilidad', asunto: 'Cierre del trimestre: faltan dos recibos', hora: '9:12' },
  { id: 'c', de: 'Marcos Ruiz', asunto: 'Presupuesto aprobado por el cliente', hora: 'Ayer' },
  { id: 'd', de: 'Soporte', asunto: 'Tu solicitud se ha resuelto', hora: 'Ayer' },
];

const UMBRAL = 96;

const FilaMensaje: React.FC<{ mensaje: Mensaje; onArchivar: () => void }> = ({ mensaje, onArchivar }) => {
  const x = useMotionValue(0);
  // Lo que hay detrás aparece con el gesto, y crece al pasar el punto en el que soltar ya archiva.
  const opacity = useTransform(x, [-UMBRAL, -24], [1, 0]);
  const scale = useTransform(x, [-UMBRAL - 20, -UMBRAL, -24], [1.15, 1, 0.6]);
  const archivar = () => {
    animate(x, -480, { spring: 'exit' });
    onArchivar();
  };
  return (
    <Motion.li
      data-testid={`mensaje-${mensaje.id}`}
      className={`${card} relative overflow-hidden`}
      initial={{ opacity: 0, height: 0, marginBottom: 0, scale: 'var(--k-enter-scale, 0.96)' }}
      animate={{ opacity: 1, height: 'auto', marginBottom: 8, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
    >
      <div className="absolute inset-y-0 end-0 flex w-28 items-center justify-center bg-[var(--color-accent,#0d9488)] text-[var(--color-accent-fg,#ffffff)]">
        <Motion.span className="flex" style={{ opacity, scale }}><Archive size={20} aria-hidden="true" /></Motion.span>
      </div>
      <Motion.div
        data-testid={`fila-${mensaje.id}`}
        className="relative flex cursor-grab items-center gap-3 bg-[var(--bg-card,#ffffff)] p-3"
        drag="x"
        dragConstraints={{ left: -UMBRAL - 40, right: 0 }}
        dragElastic={0.15}
        style={{ x }}
        spring="gesture"
        onDragEnd={(info) => {
          if (info.offsetX < -UMBRAL || info.vx < -700) archivar();
          else animate(x, 0, { spring: 'gesture', velocity: info.vx });
        }}
      >
        <div className="min-w-0 flex-1">
          <p className={`${body} truncate font-medium`}>{mensaje.de}</p>
          <p className={`${hint} truncate`}>{mensaje.asunto}</p>
        </div>
        <span className={hint}>{mensaje.hora}</span>
        <Button size="sm" variant="secondary" aria-label={`Archivar el mensaje de ${mensaje.de}`} onClick={archivar}><Archive size={14} aria-hidden="true" /></Button>
      </Motion.div>
    </Motion.li>
  );
};

/** Desliza para archivar, con deshacer: `drag`, un valor de movimiento y `Presence` trabajando juntos. */
export const Bandeja: Story = () => {
  const [archivados, setArchivados] = React.useState<string[]>([]);
  const [ultimo, setUltimo] = React.useState<Mensaje | null>(null);
  const visibles = MENSAJES.filter((mensaje) => !archivados.includes(mensaje.id));

  React.useEffect(() => {
    if (!ultimo) return undefined;
    const timer = setTimeout(() => setUltimo(null), 6000);
    return () => clearTimeout(timer);
  }, [ultimo]);

  return (
    <Ejemplo
      description="Desliza una fila hacia la izquierda para archivarla, o usa su botón. Las demás suben a ocupar su sitio, y puedes deshacerlo: vuelve donde estaba."
      code={`const x = useMotionValue(0);
const opacity = useTransform(x, [-96, -24], [1, 0]);    // lo de detrás sigue al gesto

<Presence initial={false}>
  {visibles.map((m) => (
    <Motion.li key={m.id}
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}          // mide, anima y restaura auto
      exit={{ opacity: 0, height: 0 }}>                 // las demás suben solas
      <Motion.span style={{ opacity }}><Archive /></Motion.span>
      <Motion.div drag="x" style={{ x }} dragConstraints={{ left: -136, right: 0 }}
        onDragEnd={(info) => {
          if (info.offsetX < -96 || info.vx < -700) archivar();
          else animate(x, 0, { spring: 'gesture', velocity: info.vx });   // sigue con su velocidad
        }} />
    </Motion.li>
  ))}
</Presence>`}
    >
      <div className="relative min-h-[360px]">
        <ul data-testid="bandeja">
          <Presence initial={false}>
            {visibles.map((mensaje) => (
              <FilaMensaje key={mensaje.id} mensaje={mensaje} onArchivar={() => { setArchivados((list) => [...list, mensaje.id]); setUltimo(mensaje); }} />
            ))}
          </Presence>
        </ul>
        <Presence>
          {!visibles.length && (
            <Motion.div key="vacia" data-testid="bandeja-vacia" className="flex flex-col items-center gap-2 py-10 text-center" animate="fade-up" exit={{ opacity: 0 }} delay={200}>
              <p className={title}>Bandeja al día</p>
              <Button size="sm" variant="secondary" onClick={() => { setArchivados([]); setUltimo(null); }}>Recuperar todo</Button>
            </Motion.div>
          )}
        </Presence>
        <Presence>
          {ultimo && (
            <Motion.div key={ultimo.id} data-testid="deshacer-barra" role="status" className={`${card} absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-3 shadow-lg`} initial={{ opacity: 0, y: 48 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 48 }} spring="pop">
              <span className={`${body} truncate`}>Archivado: {ultimo.asunto}</span>
              <Button size="sm" variant="secondary" data-testid="deshacer" onClick={() => { setArchivados((list) => list.filter((id) => id !== ultimo.id)); setUltimo(null); }}>Deshacer</Button>
            </Motion.div>
          )}
        </Presence>
      </div>
    </Ejemplo>
  );
};

/* ------------------------------------------------------------------- Cesta ------------------------------------------------------------------- */

interface Producto { id: string; nombre: string; precio: number }

const PRODUCTOS: Producto[] = [
  { id: 'plan', nombre: 'Plan anual', precio: 240 },
  { id: 'usuarios', nombre: 'Cinco usuarios más', precio: 75 },
  { id: 'soporte', nombre: 'Soporte prioritario', precio: 120 },
];

const euros = (value: number) => value.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/** Lo que vuela hasta la cesta: en horizontal va recto y en vertical hace el arco, cada eje con su propia curva. */
const Vuelo: React.FC<{ from: DOMRect; to: DOMRect; onLlega: () => void }> = ({ from, to, onLlega }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const llega = React.useRef(onLlega);
  llega.current = onLlega;
  React.useLayoutEffect(() => {
    const el = ref.current!;
    const dx = to.left + to.width / 2 - (from.left + from.width / 2);
    const dy = to.top + to.height / 2 - (from.top + from.height / 2);
    const recto = animate(el, { x: [0, dx] }, { timing: { duration: 600, ease: 'linear' } });
    const arco = animate(el, { y: [0, Math.min(dy, 0) - 70, dy], scale: [1, 0.8, 0.3] }, { timing: { duration: 600, ease: 'ease-in-out' } });
    void Promise.all([recto.finished, arco.finished]).then(() => llega.current());
    return () => { recto.stop(); arco.stop(); };
  }, [from, to]);
  return (
    <div ref={ref} aria-hidden="true" data-testid="vuelo" className="pointer-events-none fixed z-50 flex items-center justify-center rounded-[var(--k-radius-sm,4px)] bg-[var(--color-accent,#0d9488)] text-[var(--color-accent-fg,#ffffff)]" style={{ left: from.left, top: from.top, width: from.width, height: from.height }}>
      <Plus size={14} />
    </div>
  );
};

/** Añadir a la cesta: lo añadido vuela hasta ella, la cesta lo acusa y el total cuenta hasta su cifra. */
export const Cesta: Story = () => {
  const [lineas, setLineas] = React.useState<Record<string, number>>({});
  const [vuelos, setVuelos] = React.useState<{ key: number; producto: string; from: DOMRect; to: DOMRect }[]>([]);
  const cesta = React.useRef<HTMLDivElement>(null);
  const insignia = React.useRef<HTMLSpanElement>(null);
  const texto = React.useRef<HTMLSpanElement>(null);
  const siguiente = React.useRef(0);
  const total = useMotionValue(0);

  const unidades = Object.values(lineas).reduce((sum, value) => sum + value, 0);
  const importe = PRODUCTOS.reduce((sum, producto) => sum + producto.precio * (lineas[producto.id] ?? 0), 0);

  React.useEffect(() => total.on('change', (value) => { if (texto.current) texto.current.textContent = euros(Math.round(value)); }), [total]);
  // El dinero no rebota: por eso esta curva es fija y no sale del tema.
  React.useEffect(() => { animate(total, importe, { timing: { duration: 450, ease: 'ease-out' } }); }, [importe, total]);

  const anteriores = React.useRef(0);
  React.useEffect(() => {
    if (unidades > anteriores.current) {
      // Un empujón: parte de donde está con una velocidad, y lo que rebote lo decide el muelle del tema.
      if (insignia.current) animate(insignia.current, { scale: 1 }, { spring: 'pop', velocity: 10 });
      if (cesta.current) animate(cesta.current, { y: 0, rotate: 0 }, { spring: 'pop', velocity: -220 });
    }
    anteriores.current = unidades;
  }, [unidades]);

  const cambiar = (id: string, cantidad: number) => setLineas((prev) => {
    const next = { ...prev, [id]: (prev[id] ?? 0) + cantidad };
    if (next[id] <= 0) delete next[id];
    return next;
  });
  const anadir = (producto: Producto, event: React.MouseEvent<HTMLElement>) => {
    if (!cesta.current) return;
    siguiente.current += 1;
    const vuelo = { key: siguiente.current, producto: producto.id, from: event.currentTarget.getBoundingClientRect(), to: cesta.current.getBoundingClientRect() };
    setVuelos((list) => [...list, vuelo]);
  };

  return (
    <Ejemplo
      description="Pulsa «Añadir» varias veces seguidas. Cada vuelo sale de su botón, y lo de la cesta cambia al llegar, no antes."
      code={`// Cada eje con su curva: recto en horizontal, arco en vertical
const recto = animate(el, { x: [0, dx] }, { timing: { duration: 600, ease: 'linear' } });
const arco = animate(el, { y: [0, -70, dy], scale: [1, 0.8, 0.3] }, { timing: { duration: 600, ease: 'ease-in-out' } });
await Promise.all([recto.finished, arco.finished]);

// El total es un valor de movimiento: cuenta sin rerenderizar. El dinero no rebota: curva fija
const total = useMotionValue(0);
total.on('change', (v) => { texto.textContent = euros(Math.round(v)); });
animate(total, importe, { timing: { duration: 450, ease: 'ease-out' } });

// La cesta lo acusa con un empujón: lo que rebote lo decide el tema
animate(insignia, { scale: 1 }, { spring: 'pop', velocity: 10 });
animate(cesta, { y: 0, rotate: 0 }, { spring: 'pop', velocity: -220 });`}
    >
      <div className="flex flex-col gap-4">
        <div className={`${card} flex items-center justify-between gap-3 p-3`}>
          <Motion.div ref={cesta} data-testid="cesta" className="relative flex h-10 w-10 items-center justify-center text-[var(--fg-default,#0a1628)]">
            <ShoppingCart size={22} aria-hidden="true" />
            <span ref={insignia} data-testid="cesta-unidades" className="absolute -end-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-[var(--k-radius-full,9999px)] bg-[var(--color-accent,#0d9488)] px-1 text-xs text-[var(--color-accent-fg,#ffffff)]">{unidades}</span>
          </Motion.div>
          <span className={title}><span ref={texto} data-testid="cesta-total">{euros(0)}</span></span>
        </div>
        <ul className="flex flex-col gap-2">
          {PRODUCTOS.map((producto) => (
            <li key={producto.id} className={`${card} flex items-center justify-between gap-3 p-3`}>
              <div className="min-w-0">
                <p className={`${body} font-medium`}>{producto.nombre}</p>
                <p className={hint}>{euros(producto.precio)}</p>
              </div>
              <Button size="sm" variant="secondary" data-testid={`anadir-${producto.id}`} onClick={(event) => anadir(producto, event)}>Añadir</Button>
            </li>
          ))}
        </ul>
        <ul data-testid="cesta-lineas">
          <Presence initial={false}>
            {PRODUCTOS.filter((producto) => lineas[producto.id]).map((producto) => (
              <Motion.li key={producto.id} data-testid={`linea-${producto.id}`} className="overflow-hidden" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
                <div className="flex items-center justify-between gap-3 py-2">
                  <span className={`${body} min-w-0 truncate`}>{producto.nombre}</span>
                  <span className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" aria-label={`Quitar una unidad de ${producto.nombre}`} data-testid={`menos-${producto.id}`} onClick={() => cambiar(producto.id, -1)}><Minus size={14} aria-hidden="true" /></Button>
                    {/* Una `key` nueva basta para que el número entre otra vez. */}
                    <Motion.span key={lineas[producto.id]} className={`${body} inline-block w-5 text-center tabular-nums`} initial={{ opacity: 0, y: -14 }} animate={{ opacity: 1, y: 0 }} spring="pop">{lineas[producto.id]}</Motion.span>
                    <Button size="sm" variant="ghost" aria-label={`Añadir una unidad de ${producto.nombre}`} onClick={() => cambiar(producto.id, 1)}><Plus size={14} aria-hidden="true" /></Button>
                  </span>
                </div>
              </Motion.li>
            ))}
          </Presence>
        </ul>
        {vuelos.map((vuelo) => (
          <Vuelo key={vuelo.key} from={vuelo.from} to={vuelo.to} onLlega={() => { setVuelos((list) => list.filter((item) => item.key !== vuelo.key)); cambiar(vuelo.producto, 1); }} />
        ))}
      </div>
    </Ejemplo>
  );
};

/* ----------------------------------------------------------------- Asistente ----------------------------------------------------------------- */

const PASOS = ['Tu empresa', 'Plan', 'Confirmar'];
const PLANES = [
  { id: 'base', nombre: 'Base', detalle: 'Facturas y clientes' },
  { id: 'equipo', nombre: 'Equipo', detalle: 'Varios usuarios y permisos' },
  { id: 'total', nombre: 'Total', detalle: 'Todo, con soporte prioritario' },
];
const CAMPO = { oculto: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

/** La marca de hecho: se dibuja el círculo y, después, la señal. */
const Hecho: React.FC = () => (
  <svg width="72" height="72" viewBox="0 0 72 72" aria-hidden="true" data-testid="hecho" fill="none" stroke="var(--color-accent, #0d9488)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
    <Motion.circle cx="36" cy="36" r="30" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} spring="enter" />
    <Motion.path d="M24 37 L33 46 L49 28" initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} delay={350} spring="pop" />
  </svg>
);

/** Un asistente por pasos: entra por el lado al que vas, se adapta a la altura de cada paso y el error se nota. */
export const Asistente: Story = () => {
  const [paso, setPaso] = React.useState(0);
  const [direccion, setDireccion] = React.useState(1);
  const [empresa, setEmpresa] = React.useState('');
  const [error, setError] = React.useState('');
  const [plan, setPlan] = React.useState('equipo');
  const [hecho, setHecho] = React.useState(false);
  const [altura, setAltura] = React.useState<number | null>(null);
  const campo = React.useRef<HTMLDivElement>(null);
  const contenido = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const el = contenido.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(() => setAltura(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const ir = (destino: number) => {
    setDireccion(destino > paso ? 1 : -1);
    setPaso(destino);
  };
  const seguir = () => {
    if (paso === 0 && !empresa.trim()) {
      setError('Escribe el nombre de tu empresa.');
      if (campo.current) animate(campo.current, { x: [0, -8, 8, -5, 5, 0] }, { timing: { duration: 320, ease: 'linear' } });
      return;
    }
    setError('');
    if (paso < PASOS.length - 1) ir(paso + 1); else setHecho(true);
  };

  return (
    <Ejemplo
      description="Prueba a seguir sin escribir nada, avanza y vuelve atrás. Cada paso entra por el lado al que vas, sus campos llegan uno tras otro, y el panel se adapta a su altura."
      code={`<Motion.div animate={{ height: altura }} className="overflow-hidden">
  <div ref={contenido}>
    <Presence mode="wait">
      <Motion.div key={paso}                 // otra key: sale el paso y entra el siguiente
        variants={{ oculto: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } }}
        initial={{ opacity: 0, inlineX: direccion * 56, scale: 'var(--k-enter-scale, 0.96)' }}
        animate={{ opacity: 1, inlineX: 0, scale: 1 }}
        exit={{ opacity: 0 }}
        spring="enter"
        stagger>                             // con el retardo que diga el tema
        <Motion.div initial="oculto" animate="visible" variants={...}>{campo}</Motion.div>
      </Motion.div>
    </Presence>
  </div>
</Motion.div>

// El error se nota, también sin color
animate(campo, { x: [0, -8, 8, -5, 5, 0] }, { timing: { duration: 320, ease: 'linear' } });

// Dibujar la marca al terminar
<Motion.path d="…" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} delay={350} />`}
    >
      <div className={`${card} flex flex-col gap-4 p-4`}>
        <div className="flex flex-col gap-2">
          <p className={hint} data-testid="asistente-paso">{hecho ? 'Listo' : `Paso ${paso + 1} de ${PASOS.length}: ${PASOS[paso]}`}</p>
          <div className="h-1 overflow-hidden rounded-[var(--k-radius-full,9999px)] bg-[var(--bg-muted,#fafbfc)]">
            <Motion.div data-testid="asistente-progreso" className="h-full w-full origin-left bg-[var(--color-accent,#0d9488)]" initial={false} animate={{ scaleX: hecho ? 1 : (paso + 1) / PASOS.length }} />
          </div>
        </div>
        <Motion.div className="overflow-hidden" animate={altura === null ? {} : { height: altura }} initial={false}>
          <div ref={contenido} className="p-1">
            <Presence mode="wait" initial={false}>
              <Motion.div key={hecho ? 'hecho' : paso} data-testid="asistente-contenido" initial={{ opacity: 0, inlineX: direccion * 56, scale: 'var(--k-enter-scale, 0.96)' }} animate={{ opacity: 1, inlineX: 0, scale: 1 }} exit={{ opacity: 0 }} spring="enter" stagger>
                {hecho && (
                  <div className="flex flex-col items-center gap-3 py-6 text-center">
                    <Hecho />
                    <p className={title}>Todo listo, {empresa}</p>
                    <p className={hint}>Plan {PLANES.find((item) => item.id === plan)?.nombre}.</p>
                  </div>
                )}
                {!hecho && paso === 0 && (
                  <Motion.div initial="oculto" animate="visible" variants={CAMPO}>
                    <div ref={campo}><Input label="Nombre de la empresa" data-testid="asistente-empresa" value={empresa} error={error || undefined} onChange={(event) => { setEmpresa(event.target.value); setError(''); }} /></div>
                  </Motion.div>
                )}
                {!hecho && paso === 1 && PLANES.map((item) => (
                  <Motion.button key={item.id} type="button" data-testid={`plan-${item.id}`} aria-pressed={plan === item.id} className={`${card} mb-2 block w-full p-3 text-start`} initial="oculto" animate="visible" variants={CAMPO} whileTap={{ scale: 0.98 }} onClick={() => setPlan(item.id)} style={{ borderColor: plan === item.id ? 'var(--color-accent, #0d9488)' : undefined }}>
                    <span className={`${body} block font-medium`}>{item.nombre}</span>
                    <span className={`${hint} block`}>{item.detalle}</span>
                  </Motion.button>
                ))}
                {!hecho && paso === 2 && (
                  <>
                    <Motion.p className={`${body} mb-1`} initial="oculto" animate="visible" variants={CAMPO}>Empresa: {empresa}</Motion.p>
                    <Motion.p className={body} initial="oculto" animate="visible" variants={CAMPO}>Plan: {PLANES.find((item) => item.id === plan)?.nombre}</Motion.p>
                  </>
                )}
              </Motion.div>
            </Presence>
          </div>
        </Motion.div>
        {hecho ? (
          <div><Button size="sm" variant="secondary" onClick={() => { setHecho(false); setDireccion(-1); setPaso(0); }}>Empezar otra vez</Button></div>
        ) : (
          <div className="flex justify-between gap-2">
            <Button size="sm" variant="secondary" disabled={paso === 0} data-testid="asistente-atras" onClick={() => ir(paso - 1)}>Atrás</Button>
            <Button size="sm" data-testid="asistente-seguir" onClick={seguir}>{paso === PASOS.length - 1 ? 'Crear cuenta' : 'Seguir'}</Button>
          </div>
        )}
      </div>
    </Ejemplo>
  );
};

/* ------------------------------------------------------------------ Informe ------------------------------------------------------------------ */

const MESES = [
  { mes: 'Julio', valor: 42 }, { mes: 'Agosto', valor: 31 }, { mes: 'Septiembre', valor: 58 },
  { mes: 'Octubre', valor: 73 }, { mes: 'Noviembre', valor: 66 }, { mes: 'Diciembre', valor: 91 },
];

/** Cuenta hasta su cifra la primera vez que se ve. */
const Cifra: React.FC<{ etiqueta: string; valor: number; testId?: string }> = ({ etiqueta, valor, testId }) => {
  const { ref, seen } = useInView<HTMLDivElement>({ threshold: 0.6 });
  const texto = React.useRef<HTMLParagraphElement>(null);
  React.useEffect(() => {
    if (!seen) return undefined;
    const controls = animate(0, valor, { spring: { duration: 1.2 }, onUpdate: (value: number) => { if (texto.current) texto.current.textContent = euros(Math.round(value)); } });
    return () => controls.stop();
  }, [seen, valor]);
  return (
    <div ref={ref} className={`${card} flex-1 p-3`}>
      <p className={hint}>{etiqueta}</p>
      <p ref={texto} data-testid={testId} className="font-display text-xl tabular-nums text-[var(--fg-default,#0a1628)]">{euros(0)}</p>
    </div>
  );
};

/** Un informe enlazado al scroll: la cabecera se encoge, la barra dice por dónde vas y lo de abajo entra al llegar. */
export const Informe: Story = () => {
  const contenedor = React.useRef<HTMLDivElement>(null);
  const { y, progress } = useScroll({ container: contenedor });
  const height = useTransform(y, [0, 140], [150, 64]);
  const scale = useTransform(y, [0, 140], [1, 0.72]);
  const subtitulo = useTransform(y, [0, 70], [1, 0]);
  const fondo = useTransform(y, [0, 400], [0, -60]);

  return (
    <Ejemplo
      description="Baja dentro del recuadro. La cabecera va enlazada al scroll, sin rerenderizar nada, así que no cambia con el modo: la mueve tu dedo. Las barras sí, al crecer la primera vez que se ven. Las cifras cuentan con una curva fija, porque el dinero no rebota."
      code={`const { y, progress } = useScroll({ container });
const height = useTransform(y, [0, 140], [150, 64]);     // enlazado al scroll, no al tiempo
const scale = useTransform(y, [0, 140], [1, 0.72]);

// Fuera del flujo: encogerla no mueve el contenido ni pelea con el scroll
<Motion.header className="absolute" style={{ height }}>
  <Motion.h2 style={{ scale }}>Resultados del año</Motion.h2>
  <Motion.div style={{ scaleX: progress }} />            // por dónde vas
</Motion.header>

// Lo de abajo entra al llegar, una sola vez
<Motion.div initial={{ scaleX: 0 }} inView={{ scaleX: 1 }} delay={i * 60} />

// Y una cifra cuenta hasta su valor
animate(0, valor, { spring: { duration: 1.2 }, onUpdate: pintar });`}
    >
      <div ref={contenedor} data-testid="informe" tabIndex={0} aria-label="Informe de resultados" className={`${card} relative h-[480px] overflow-y-auto`}>
        {/* No ocupa sitio en el flujo: si lo ocupara, encogerla movería el contenido y el navegador corregiría el scroll. */}
        <div className="sticky top-0 z-10 h-0">
        <Motion.header data-testid="informe-cabecera" className="absolute inset-x-0 top-0 flex flex-col justify-end overflow-hidden border-b border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] px-4 pb-3" style={{ height }}>
          <Motion.div aria-hidden="true" className="absolute -end-8 -top-8 h-32 w-32 rounded-[var(--k-radius-full,9999px)] bg-[var(--color-accent,#0d9488)] opacity-10" style={{ y: fondo }} />
          <Motion.h2 className="origin-left font-display text-2xl text-[var(--fg-default,#0a1628)]" style={{ scale }}>Resultados del año</Motion.h2>
          <Motion.p className={hint} style={{ opacity: subtitulo }}>Segundo semestre</Motion.p>
          <Motion.div data-testid="informe-progreso" className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-[var(--color-accent,#0d9488)]" style={{ scaleX: progress }} />
        </Motion.header>
        </div>
        <div className="flex flex-col gap-6 p-4 pt-[166px]">
          <p className={body}>Este semestre ha ido de menos a más. Agosto fue el mes más flojo y diciembre, el mejor de toda la serie. El cierre deja margen para el siguiente trimestre.</p>
          <div className="flex flex-wrap gap-3 pt-64">
            <Cifra etiqueta="Ingresos" valor={361000} testId="informe-ingresos" />
            <Cifra etiqueta="Beneficio" valor={84500} />
          </div>
          <div className="flex flex-col gap-2 pb-40 pt-40">
            <p className={title}>Por mes</p>
            {MESES.map((item, i) => (
              <div key={item.mes} className="flex items-center gap-3">
                <span className={`${hint} w-20 shrink-0`}>{item.mes}</span>
                <div className="h-3 flex-1">
                  <Motion.div data-testid={`barra-${i}`} className="h-full origin-left rounded-[var(--k-radius-xs,2px)] bg-[var(--color-accent,#0d9488)]" style={{ width: `${item.valor}%` }} initial={{ scaleX: 0 }} inView={{ scaleX: 1 }} viewport={{ threshold: 0.9 }} delay={i * 60} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Ejemplo>
  );
};

/* ------------------------------------------------------------------ Puntero ------------------------------------------------------------------ */

const DOCK = [
  { nombre: 'Inicio', icono: Home }, { nombre: 'Correo', icono: Mail }, { nombre: 'Agenda', icono: Calendar },
  { nombre: 'Documentos', icono: FileText }, { nombre: 'Buscar', icono: Search }, { nombre: 'Avisos', icono: Bell }, { nombre: 'Ajustes', icono: Settings },
];

/** Crece según lo cerca que esté el puntero. El valor sale de la distancia y el muelle lo suaviza. */
const IconoDock: React.FC<{ nombre: string; icono: typeof Home; puntero: MotionValue<number> }> = ({ nombre, icono: Icono, puntero }) => {
  const ref = React.useRef<HTMLButtonElement>(null);
  const cerca = useTransform(puntero, (value: number) => {
    const el = ref.current;
    if (!el) return 1;
    const distancia = Math.abs(value - (el.offsetLeft + el.offsetWidth / 2));
    return 1 + 0.6 * Math.max(0, 1 - distancia / 100);
  });
  const scale = useSpringValue(cerca, { spring: 'pop' });
  return (
    <Motion.button ref={ref} type="button" aria-label={nombre} data-testid={`dock-${nombre}`} className={`${card} flex h-10 w-10 shrink-0 origin-bottom items-center justify-center text-[var(--fg-default,#0a1628)]`} style={{ scale }}>
      <Icono size={18} aria-hidden="true" />
    </Motion.button>
  );
};

/** Una tarjeta con un foco de luz que sigue al puntero. El degradado se compone con `motionTemplate`, sin rerenderizar. */
const TarjetaConFoco: React.FC<{ titulo: string; detalle: string; testId?: string }> = ({ titulo, detalle, testId }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { x, y } = usePointerValue(ref);
  const opacity = useMotionValue(0);
  const background = motionTemplate`radial-gradient(180px at ${x}px ${y}px, color-mix(in oklab, var(--color-accent, #0d9488) 22%, transparent), transparent 70%)`;
  return (
    <div ref={ref} className={`${card} relative flex-1 overflow-hidden p-4`} style={{ minWidth: 150 }} onPointerEnter={() => { animate(opacity, 1, { spring: 'enter' }); }} onPointerLeave={() => { animate(opacity, 0, { spring: 'exit' }); }}>
      <Motion.div aria-hidden="true" data-testid={testId} className="pointer-events-none absolute inset-0" style={{ background, opacity }} />
      <p className={`${title} relative`}>{titulo}</p>
      <p className={`${hint} relative`}>{detalle}</p>
    </div>
  );
};

/** Todo enlazado al puntero, sin ningún render por movimiento: una barra de iconos que reacciona a la distancia y tarjetas con foco. */
export const Puntero: Story = () => {
  // Solo mientras el puntero está en la barra: fuera no hay distancia que valga.
  const x = useMotionValue(-9999);
  return (
    <Ejemplo
      description="Pasa el puntero por la barra de iconos y por las tarjetas. Todo sale de un mismo valor, calculado en cada movimiento, y ningún componente se rerenderiza."
      code={`const x = useMotionValue(-9999);
<div onPointerMove={(e) => x.set(e.clientX - e.currentTarget.getBoundingClientRect().left)}
     onPointerLeave={() => x.set(-9999)} />

// Del puntero a la distancia, y de ahí a la escala, con un muelle encima
const cerca = useTransform(x, (v) => 1 + 0.6 * Math.max(0, 1 - Math.abs(v - centro) / 100));
const scale = useSpringValue(cerca, { spring: 'pop' });   // con el rebote del tema
<Motion.button style={{ scale }} />

// Un degradado que sigue al puntero
const background = motionTemplate\`radial-gradient(180px at \${x}px \${y}px, …)\`;
<Motion.div style={{ background, opacity }} />`}
    >
      <div className="flex flex-col gap-6">
        <div data-testid="dock" className="relative flex items-end gap-1 overflow-x-auto pt-8" onPointerMove={(event) => x.set(event.clientX - event.currentTarget.getBoundingClientRect().left + event.currentTarget.scrollLeft)} onPointerLeave={() => x.set(-9999)}>
          {DOCK.map((item) => <IconoDock key={item.nombre} nombre={item.nombre} icono={item.icono} puntero={x} />)}
        </div>
        <div className="flex flex-wrap gap-3">
          <TarjetaConFoco titulo="Facturas" detalle="24 este mes" testId="foco" />
          <TarjetaConFoco titulo="Clientes" detalle="3 nuevos" />
          <TarjetaConFoco titulo="Cobros" detalle="Al día" />
        </div>
      </div>
    </Ejemplo>
  );
};

export default { title: 'Animar ejemplos' };
