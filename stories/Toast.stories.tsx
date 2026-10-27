import * as React from 'react';
import type { Story } from '@ladle/react';
import { ToastProvider, useToast, type ToastPosition } from '../src/context/ToastContext';
import type { ToastAnimation, ToastVariant } from '../src/components/Toast';
import { Button } from '../src/components/Button';
import { Select } from '../src/components/Select';
import { Icon } from '../src/icons';

/**
 * Las stories montan su propio proveedor para poder cambiarle la posición y el
 * máximo; en una aplicación normal basta con el que ya envuelve la raíz.
 */

const Botonera: React.FC = () => {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="primary" onClick={() => toast.success('Factura guardada')}>
        Éxito
      </Button>
      <Button variant="danger" onClick={() => toast.error('No se pudo conectar con la AEAT')}>
        Error
      </Button>
      <Button variant="secondary" onClick={() => toast.info('Sincronización en curso')}>
        Info
      </Button>
      <Button variant="outline" onClick={() => toast.warning('Quedan 3 días de prueba')}>
        Aviso
      </Button>
    </div>
  );
};

export const LosCuatroTipos: Story = () => (
  <ToastProvider>
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        La firma de siempre: <code>toast.success('mensaje')</code>. Pasa el ratón por encima de un
        aviso y la cuenta atrás se detiene.
      </p>
      <Botonera />
    </div>
  </ToastProvider>
);

const ConTitulo: React.FC = () => {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          toast.error('El NIF B12345678 no consta en el censo.', {
            title: 'Validación fallida',
          })
        }
      >
        Con encabezado
      </Button>
      <Button
        variant="secondary"
        onClick={() =>
          toast.success('Factura FAC/2026/0042 eliminada', {
            title: 'Eliminada',
            action: { label: 'Deshacer', onClick: () => toast.info('Restaurada') },
          })
        }
      >
        Con acción
      </Button>
      <Button
        variant="outline"
        onClick={() =>
          toast.warning('Revisa los datos antes de enviar.', { duration: 0 })
        }
      >
        Fijo (sin cuenta atrás)
      </Button>
    </div>
  );
};

export const TituloAccionYFijo: Story = () => (
  <ToastProvider>
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        <code>title</code>, <code>action</code> y <code>duration: 0</code> para el que espera una
        decisión.
      </p>
      <ConTitulo />
    </div>
  </ToastProvider>
);

const ConPromesa: React.FC = () => {
  const toast = useToast();
  const guardar = (fallar: boolean) =>
    new Promise((resolve, reject) =>
      setTimeout(() => (fallar ? reject(new Error('tiempo de espera agotado')) : resolve(null)), 1600),
    );

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() =>
          toast.promise(guardar(false), {
            loading: 'Enviando a la AEAT…',
            success: 'Enviada correctamente',
            error: 'No se pudo enviar',
          })
        }
      >
        Promesa que va bien
      </Button>
      <Button
        variant="danger"
        onClick={() =>
          toast
            .promise(guardar(true), {
              loading: 'Enviando a la AEAT…',
              success: 'Enviada correctamente',
              error: (e: Error) => `No se pudo enviar: ${e.message}`,
            })
            .catch(() => {})
        }
      >
        Promesa que falla
      </Button>
      <Button variant="ghost" onClick={() => toast.dismiss()}>
        Cerrar todos
      </Button>
    </div>
  );
};

export const Promesa: Story = () => (
  <ToastProvider>
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Un solo aviso pasa de «cargando» al resultado, sin apilar dos.
      </p>
      <ConPromesa />
    </div>
  </ToastProvider>
);

const Lanzador: React.FC<{ total: number }> = ({ total }) => {
  const toast = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        onClick={() => {
          for (let i = 1; i <= total; i += 1) toast.info(`Línea ${i} procesada`);
        }}
      >
        Lanzar {total} de golpe
      </Button>
      <Button
        variant="secondary"
        onClick={() => toast.error('El servidor no responde', { id: 'red' })}
      >
        Repetir el mismo (id fijo)
      </Button>
    </div>
  );
};

export const ColaYDeduplicado: Story = () => (
  <ToastProvider max={3}>
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Con <code>max=3</code> el resto espera turno. Repetir un <code>id</code> sustituye el aviso
        en lugar de apilar diez iguales — el caso de un bucle que falla en cada vuelta.
      </p>
      <Lanzador total={7} />
    </div>
  </ToastProvider>
);

export const Posiciones: Story = () => {
  const [position, setPosition] = React.useState<ToastPosition>('top-right');
  return (
    <ToastProvider key={position} position={position}>
      <div className="max-w-xs space-y-3">
        <Select
          label="Posición"
          value={position}
          onChange={(v) => setPosition(v as ToastPosition)}
          options={[
            { value: 'top-right', label: 'Arriba derecha' },
            { value: 'top-left', label: 'Arriba izquierda' },
            { value: 'top-center', label: 'Arriba centro' },
            { value: 'bottom-right', label: 'Abajo derecha' },
            { value: 'bottom-left', label: 'Abajo izquierda' },
            { value: 'bottom-center', label: 'Abajo centro' },
          ]}
        />
        <Botonera />
      </div>
    </ToastProvider>
  );
};


export const Formas: Story = () => {
  const [variant, setVariant] = React.useState<ToastVariant>('accent');
  return (
    <ToastProvider key={variant} variant={variant}>
      <div className="max-w-xs space-y-3">
        <Select
          label="Forma"
          value={variant}
          onChange={(v) => setVariant(v as ToastVariant)}
          options={[
            { value: 'accent', label: 'Accent — tarjeta neutra' },
            { value: 'soft', label: 'Soft — fondo teñido' },
            { value: 'solid', label: 'Solid — relleno' },
            { value: 'outline', label: 'Outline — solo contorno' },
            { value: 'minimal', label: 'Minimal — sobrio, como Sonner' },
            { value: 'glass', label: 'Glass — translúcido' },
            { value: 'invert', label: 'Invert — oscuro sobre claro' },
          ]}
        />
        <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
          En <code>solid</code> el texto usa <code>--k-*-on</code>, el tono que de verdad contrasta
          con el relleno: sobre el ámbar sale oscuro y sobre el rojo, blanco.
        </p>
        <Botonera />
      </div>
    </ToastProvider>
  );
};

export const AnimacionesDeSalida: Story = () => {
  const [animation, setAnimation] = React.useState<ToastAnimation>('slide');
  return (
    <ToastProvider key={animation} animation={animation}>
      <div className="max-w-xs space-y-3">
        <Select
          label="Animación"
          value={animation}
          onChange={(v) => setAnimation(v as ToastAnimation)}
          options={[
            { value: 'slide', label: 'Slide — sale por el lado' },
            { value: 'fade', label: 'Fade — solo se desvanece' },
            { value: 'scale', label: 'Scale — se encoge' },
            { value: 'lift', label: 'Lift — sube y se encoge' },
          ]}
        />
        <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
          La entrada es la misma transición al revés. Con «reducir movimiento» activado en el
          sistema, el cambio es instantáneo.
        </p>
        <Botonera />
      </div>
    </ToastProvider>
  );
};

/** En pantalla estrecha la pila ocupa el ancho y se descarta deslizando. */
export const Movil: Story = () => (
  <ToastProvider position="bottom-center">
    <div className="space-y-3">
      <p className="text-[13px] text-[var(--fg-muted,#52606f)]">
        Estrecha la ventana por debajo de 640 px: la pila pasa a ocupar el ancho con un margen a
        cada lado. Con el dedo se descarta deslizando en horizontal.
      </p>
      <Botonera />
    </div>
  </ToastProvider>
);

/** El mismo fondo con color para que se vea el cristal. */
const Colorful: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="fixed inset-0 p-6"
    style={{ background: 'radial-gradient(60% 80% at 15% 20%, #6d5dfc 0%, transparent 60%), radial-gradient(50% 70% at 85% 30%, #14b8a6 0%, transparent 60%), radial-gradient(60% 80% at 60% 100%, #f472b6 0%, transparent 60%), #1e1b4b' }}
  >
    {children}
  </div>
);

/** La pila: las capas viejas asoman detrás y se abren al pasar el ratón (o con un toque). */
export const Pila: Story = () => {
  const [position, setPosition] = React.useState<ToastPosition>('bottom-right');
  const [layout, setLayout] = React.useState<'stacked' | 'list'>('stacked');
  const [expand, setExpand] = React.useState(false);
  const Controles: React.FC = () => {
    const toast = useToast();
    const n = React.useRef(0);
    const add = (kind: 'message' | 'success' | 'error' | 'info' | 'warning') => {
      n.current += 1;
      toast[kind](`Evento ${n.current}`, { description: 'La pila se abre al pasar el ratón por encima.', duration: 20000 });
    };
    return (
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => add('message')}>Añadir aviso</Button>
        <Button variant="secondary" onClick={() => add('success')}>Éxito</Button>
        <Button variant="secondary" onClick={() => add('error')}>Error</Button>
        <Button variant="outline" onClick={() => { for (let i = 0; i < 5; i++) add(i % 2 ? 'info' : 'warning'); }}>Cinco de golpe</Button>
        <Button variant="ghost" onClick={() => toast.dismiss()}>Cerrar todos</Button>
      </div>
    );
  };
  return (
    <ToastProvider key={`${position}-${layout}-${expand}`} position={position} layout={layout} expand={expand} max={6}>
      <div className="max-w-md space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <Select label="Posición" value={position} onChange={(v) => setPosition(v as ToastPosition)} options={['top-right', 'top-left', 'top-center', 'bottom-right', 'bottom-left', 'bottom-center'].map((value) => ({ value, label: value }))} />
          <Select label="Disposición" value={layout} onChange={(v) => setLayout(v as 'stacked' | 'list')} options={[{ value: 'stacked', label: 'Apilada (Sonner)' }, { value: 'list', label: 'Lista' }]} />
        </div>
        <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={expand} onChange={(e) => setExpand(e.target.checked)} /> Siempre abierta (<code>expand</code>)</label>
        <Controles />
      </div>
    </ToastProvider>
  );
};

/** Las siete formas con los cinco tipos, para compararlas. */
export const Variantes: Story = () => {
  const [variant, setVariant] = React.useState<ToastVariant>('minimal');
  const Todos: React.FC = () => {
    const toast = useToast();
    const fire = () => {
      toast.message('Evento creado', { description: 'Domingo, 3 de agosto a las 10:00' });
      toast.success('Factura guardada', { description: 'FAC/2026/0042' });
      toast.error('No se pudo conectar', { description: 'Reintenta en unos minutos.' });
      toast.warning('Quedan 3 días de prueba');
      toast.loading('Sincronizando…');
    };
    return <Button variant="primary" onClick={fire}>Lanzar los cinco tipos</Button>;
  };
  return (
    <ToastProvider key={variant} variant={variant} layout="list" position="top-right" max={5}>
      <Colorful>
        <div className="max-w-xs space-y-3">
          <Select label="Forma" value={variant} onChange={(v) => setVariant(v as ToastVariant)} options={['accent', 'soft', 'solid', 'outline', 'minimal', 'glass', 'invert'].map((value) => ({ value, label: value }))} />
          <Todos />
        </div>
      </Colorful>
    </ToastProvider>
  );
};

/** Lo que trae Sonner: descripción, cancelar, icono propio, cierre en la esquina, contenido propio y avisos que avisan al cerrarse. */
export const OpcionesTipoSonner: Story = () => {
  const Botones: React.FC = () => {
    const toast = useToast();
    const [log, setLog] = React.useState('');
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => toast.message('Evento creado', { description: 'Domingo, 3 de agosto a las 10:00' })}>Descripción</Button>
          <Button variant="secondary" onClick={() => toast.success('Archivo eliminado', { description: 'factura-0042.pdf', action: { label: 'Deshacer', onClick: () => setLog('Deshecho') }, cancel: { label: 'Ahora no', onClick: () => setLog('Cancelado') }, duration: 15000 })}>Acción y cancelar</Button>
          <Button variant="secondary" onClick={() => toast.message('Nueva versión disponible', { icon: <Icon name="Sparkles" size={18} />, description: 'Recarga para actualizar.', closeStyle: 'corner', duration: 15000 })}>Icono propio y cierre en la esquina</Button>
          <Button variant="secondary" onClick={() => toast.show('Sin icono ni descripción', { type: 'success', icon: false })}>Sin icono</Button>
          <Button variant="secondary" onClick={() => toast.message('Se avisa al cerrarse', { duration: 2500, onDismiss: (t) => setLog(`onDismiss: ${t.id}`) })}>onDismiss</Button>
          <Button variant="secondary" onClick={() => toast.promise(new Promise((resolve) => setTimeout(() => resolve('ok'), 1800)), { loading: 'Guardando…', success: 'Guardado', error: 'Falló' })}>Promesa</Button>
          <Button variant="primary" onClick={() => toast.custom((id) => (
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--bg-hover)] text-[13px] font-semibold">AB</span>
              <div className="min-w-0 flex-1"><p className="text-[13px] font-semibold">Ana te ha mencionado</p><p className="text-[12px] text-[var(--fg-muted)]">«Revisa la factura de Acme cuando puedas»</p></div>
              <Button size="sm" variant="secondary" onClick={() => toast.dismiss(id)}>Ver</Button>
            </div>
          ), { duration: 15000 })}>Contenido propio</Button>
        </div>
        {log && <p role="status" className="text-[13px] text-[var(--fg-muted)]">{log}</p>}
      </div>
    );
  };
  return <ToastProvider variant="minimal" position="bottom-right" max={6}><Botones /></ToastProvider>;
};
