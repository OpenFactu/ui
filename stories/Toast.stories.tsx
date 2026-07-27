import * as React from 'react';
import type { Story } from '@ladle/react';
import { ToastProvider, useToast, type ToastPosition } from '../src/context/ToastContext';
import type { ToastAnimation, ToastVariant } from '../src/components/Toast';
import { Button } from '../src/components/Button';
import { Select } from '../src/components/Select';

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
            { value: 'accent', label: 'Accent — banda de color' },
            { value: 'soft', label: 'Soft — fondo teñido' },
            { value: 'solid', label: 'Solid — relleno' },
            { value: 'outline', label: 'Outline — solo contorno' },
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
