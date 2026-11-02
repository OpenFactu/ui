import * as React from 'react';
import type { Story } from '@ladle/react';
import { Prose, ReadingProgress, ReadingTime, SectionIntro } from '../src/components/Prose';
import { Paragraph, Quote } from '../src/components/Typography';
import { Button } from '../src/components/Button';

const TEXTO = 'Una factura bien hecha no se nota: llega a tiempo, cuadra a la primera y nadie tiene que llamar para preguntar qué significa aquella línea. Conseguirlo no depende de una gran herramienta, sino de muchas decisiones pequeñas tomadas siempre igual. Por eso conviene que la herramienta las recuerde por ti.';

export const Articulo: Story = () => {
  const article = React.useRef<HTMLElement>(null);
  return (
    <>
      <ReadingProgress target={article} />
      <Prose lead dropCap as="article">
        <h1>Cómo cerrar el mes sin perder la tarde</h1>
        <p><ReadingTime text={TEXTO.repeat(6)} /></p>
        <p>El cierre de mes no tiene por qué ser una carrera. Con tres hábitos sencillos, la mayor parte del trabajo ya está hecha cuando llega el día 30.</p>
        <p>{TEXTO}</p>
        <h2>Lo que se revisa cada semana</h2>
        <p>Una revisión corta los viernes evita la montaña de fin de mes. Basta con <strong>tres comprobaciones</strong> y <a href="#plantilla">una plantilla</a> que no cambie.</p>
        <ul>
          <li>Facturas emitidas que aún no se han cobrado.</li>
          <li>Gastos sin justificante, antes de que se pierda.</li>
          <li>Movimientos del banco sin conciliar.</li>
        </ul>
        <blockquote>Lo que se revisa cada semana no se convierte nunca en un problema de fin de mes.</blockquote>
        <h3>Y lo que se automatiza</h3>
        <ol>
          <li>Los recordatorios de cobro, a los 7 y a los 15 días.</li>
          <li>La importación de movimientos con <code>conciliar --auto</code>.</li>
        </ol>
        <pre><code>{'cierre --mes 2026-10\nrevisar --solo pendientes'}</code></pre>
        <table>
          <thead><tr><th>Tarea</th><th>Cuándo</th><th>Tiempo</th></tr></thead>
          <tbody>
            <tr><td>Revisar cobros</td><td>Viernes</td><td>10 min</td></tr>
            <tr><td>Conciliar banco</td><td>Viernes</td><td>15 min</td></tr>
            <tr><td>Cierre</td><td>Día 30</td><td>30 min</td></tr>
          </tbody>
        </table>
        <hr />
        <p>Y si algo se tuerce, <mark>el historial lo guarda todo</mark>: siempre se puede volver atrás.</p>
      </Prose>
    </>
  );
};

export const Parrafos: Story = () => (
  <div className="flex max-w-2xl flex-col gap-8">
    <Paragraph variant="lead" balance>Una entradilla que reparte sus líneas por igual y abre el texto con calma.</Paragraph>
    <Paragraph dropCap="accent" measure>{TEXTO}</Paragraph>
    <Paragraph firstLine measure>{TEXTO}</Paragraph>
    <Paragraph columns={2} justify>{TEXTO} {TEXTO}</Paragraph>
    <Paragraph clamp={2}>{TEXTO} {TEXTO}</Paragraph>
  </div>
);

export const ParrafosQueEntran: Story = () => (
  <div className="flex max-w-2xl flex-col gap-10">
    <Paragraph reveal measure>{TEXTO}</Paragraph>
    <Paragraph reveal="words" variant="lead">{TEXTO}</Paragraph>
    <Paragraph reveal dropCap measure>{TEXTO}</Paragraph>
  </div>
);

export const Citas: Story = () => (
  <div className="flex max-w-2xl flex-col gap-10">
    <Quote author="Marta Ruiz" source="Directora financiera">Pasamos de cerrar en tres días a cerrar en una mañana.</Quote>
    <Quote variant="pull" author="Marta Ruiz" source="Directora financiera">Lo que se revisa cada semana no se convierte nunca en un problema de fin de mes.</Quote>
    <Quote variant="pull" align="center">Haz que lo correcto sea lo más fácil.</Quote>
    <Quote variant="card" author="Luis Romero">Lo mejor es que nadie pregunta ya dónde está la factura.</Quote>
  </div>
);

export const AperturaDeSeccion: Story = () => (
  <div className="flex flex-col gap-14">
    <SectionIntro eyebrow="Novedades" title="Todo lo del cierre, en un sitio" lead="Facturas, cobros y conciliación en una sola vista, sin saltar entre pantallas." actions={<><Button>Empezar</Button><Button variant="secondary">Ver cómo funciona</Button></>} />
    <SectionIntro align="center" level={1} size="display" eyebrow="Para equipos pequeños" title="Menos papeleo, más negocio" lead="Lo justo para que el trabajo salga solo." />
  </div>
);
