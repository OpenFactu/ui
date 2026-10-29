import * as React from 'react';
import type { Story } from '@ladle/react';
import { CountUp, GradientText, Highlight, ShimmerText, TextReveal, Typewriter } from '../src/components/TextEffects';
import { Heading, InlineCode, Kbd, Paragraph, Quote } from '../src/components/Typography';
import { Currency, Delta, FileSize, NumberValue, RelativeTime, Truncate } from '../src/components/Formatted';
import { Button } from '../src/components/Button';

const LOREM = 'La facturación electrónica obliga a conservar cada documento con su huella, su fecha y su estado de envío. Un buen sistema deja claro qué falta, qué se ha enviado y qué ha rechazado la administración, sin obligar a nadie a buscarlo en cinco pantallas distintas. Cuando todo está a la vista, el equipo dedica su tiempo a lo que importa en lugar de perseguir datos.';

export const Efectos: Story = () => (
  <div className="flex max-w-2xl flex-col gap-6">
    <Heading level={1}><GradientText animated>Facturación sin fricción</GradientText></Heading>
    <p className="m-0 text-[20px]"><Typewriter text={['Emite facturas en segundos.', 'Valida con la administración.', 'Cobra antes.']} /></p>
    <p className="m-0 text-[22px] font-semibold"><TextReveal text="Cada palabra entra con el muelle del tema" /></p>
    <p className="m-0 text-[22px] font-semibold"><TextReveal text="Letra a letra" by="char" /></p>
    <p className="m-0 text-[15px]"><ShimmerText>Sincronizando con la AEAT…</ShimmerText></p>
    <p className="m-0 text-[16px]">
      Este importe <Highlight>ha subido un 12 %</Highlight>, esta fecha es <Highlight styleName="underline" tone="danger">crítica</Highlight> y esto{' '}
      <Highlight styleName="block" tone="success">está validado</Highlight>.
    </p>
  </div>
);

export const Contadores: Story = () => {
  const [value, setValue] = React.useState(12840.5);
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="m-0 text-[40px] font-bold"><CountUp value={value} options={{ style: 'currency', currency: 'EUR' }} /></p>
      <p className="m-0 text-[22px]"><CountUp value={value / 100} options={{ maximumFractionDigits: 1 }} /> % de tasa</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => setValue(Math.round(Math.random() * 90000 * 100) / 100)}>Cambiar valor</Button>
        <Button size="sm" variant="secondary" onClick={() => setValue(0)}>A cero</Button>
      </div>
    </div>
  );
};

export const Formatos: Story = () => (
  <dl className="grid max-w-xl grid-cols-[10rem_1fr] gap-y-3 text-[14px]">
    <dt>Importe</dt><dd className="m-0"><Currency value={1234567.891} /></dd>
    <dt>Compacto</dt><dd className="m-0"><Currency value={1234567} compact /></dd>
    <dt>Con signo</dt><dd className="m-0"><Currency value={-420.5} signed /> · <Currency value={1890} signed /></dd>
    <dt>Número</dt><dd className="m-0"><NumberValue value={9876543.21} decimals={2} /> · <NumberValue value={12345} compact /> · <NumberValue value={0.256} percent decimals={1} /></dd>
    <dt>Variación</dt><dd className="m-0"><Delta value={0.125} /> · <Delta value={-0.034} /> · <Delta value={0.2} invert /></dd>
    <dt>Fecha relativa</dt><dd className="m-0"><RelativeTime date={Date.now() - 3 * 3600_000} /> · <RelativeTime date={Date.now() + 2 * 86400_000} /> · <RelativeTime date={Date.now() - 20_000} /></dd>
    <dt>Tamaño</dt><dd className="m-0"><FileSize bytes={512} /> · <FileSize bytes={1536} /> · <FileSize bytes={4_823_000} /> · <FileSize bytes={7.2e9} /></dd>
    <dt>Truncado</dt><dd className="m-0 w-56"><Truncate>Descripción muy larga de una línea de factura que no cabe</Truncate></dd>
    <dt>Nombre de archivo</dt><dd className="m-0 w-56"><Truncate middle keep={12}>informe-trimestral-de-ventas-2026-v3-final.pdf</Truncate></dd>
    <dt>Dos líneas</dt><dd className="m-0 w-56"><Truncate lines={2}>{LOREM}</Truncate></dd>
  </dl>
);

export const Parrafos: Story = () => (
  <div className="flex max-w-3xl flex-col gap-6">
    <Heading level={1} eyebrow="Guía">Ordena tu facturación</Heading>
    <Paragraph variant="lead" balance>Todo lo que necesitas saber para emitir, enviar y conciliar sin perder nada por el camino.</Paragraph>
    <Paragraph dropCap measure>{LOREM}</Paragraph>
    <Paragraph clamp={2} measure>{LOREM} {LOREM}</Paragraph>
    <Paragraph columns={2} justify>{LOREM} {LOREM}</Paragraph>
    <Paragraph variant="small">Texto pequeño para notas y aclaraciones.</Paragraph>
    <Paragraph variant="caption">Pie de tabla · actualizado hace un momento</Paragraph>
    <Paragraph>Pulsa <Kbd>⌘</Kbd> <Kbd>K</Kbd> para buscar o escribe <InlineCode>factura --pendientes</InlineCode> en la consola.</Paragraph>
    <Quote author="Marta Ruiz" source="Directora financiera">Pasamos de perseguir facturas a revisar excepciones. El cierre mensual se redujo a la mitad.</Quote>
  </div>
);
