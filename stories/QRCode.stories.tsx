import * as React from 'react';
import type { Story } from '@ladle/react';
import { QRCode, qrToSvg, type QrEyeShape, type QrLevel, type QrModuleShape } from '../src/qr';
import { Input } from '../src/components/Input';
import { Button } from '../src/components/Button';
import { SegmentedControl } from '../src/components/SegmentedControl';

export const Basico: Story = () => {
  const [value, setValue] = React.useState('https://openfactu.es');
  const [level, setLevel] = React.useState<QrLevel>('M');
  return (
    <div className="flex max-w-[360px] flex-col gap-4">
      <QRCode value={value} level={level} size={200} />
      <Input label="Contenido" value={value} onChange={(e) => setValue(e.target.value)} />
      <SegmentedControl<QrLevel>
        value={level}
        onChange={setLevel}
        options={(['L', 'M', 'Q', 'H'] as const).map((l) => ({ value: l, label: l }))}
      />
      <p className="m-0 text-[12px] text-[var(--fg-muted,#52606f)]">
        Cuanto más alto el nivel, más se puede tapar o dañar sin que deje de leerse, y más denso sale el código.
      </p>
    </div>
  );
};

const MODULES: QrModuleShape[] = ['square', 'rounded', 'dots'];
const EYES: QrEyeShape[] = ['square', 'rounded', 'circle'];

export const Formas: Story = () => (
  <div className="grid w-fit grid-cols-3 gap-6">
    {MODULES.flatMap((modules) => EYES.map((eyes) => (
      <figure key={`${modules}-${eyes}`} className="m-0 flex flex-col items-center gap-2">
        <QRCode value="https://openfactu.es/demo" modules={modules} eyes={eyes} size={140} />
        <figcaption className="font-mono text-[11px] text-[var(--fg-muted,#52606f)]">{modules} · {eyes}</figcaption>
      </figure>
    )))}
  </div>
);

const Marca = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 4v16M6 12l9-8M9.5 9l8.5 11" />
  </svg>
);

export const ConLogo: Story = () => (
  <div className="flex flex-wrap items-center gap-8">
    <QRCode value="https://openfactu.es/app" logo={<Marca />} modules="rounded" eyes="rounded" size={200} />
    <QRCode
      value="https://openfactu.es/app"
      logo={<span className="text-[22px] font-bold">K</span>}
      modules="dots"
      eyes="circle"
      eyeColor="var(--color-accent, #0d9488)"
      size={200}
    />
  </div>
);

export const Colores: Story = () => (
  <div className="flex flex-wrap items-center gap-6">
    <QRCode value="https://openfactu.es" size={150} />
    <QRCode value="https://openfactu.es" size={150} color="var(--color-accent, #0d9488)" eyes="rounded" />
    <div className="rounded-xl bg-[var(--k-ink-900,#0b1220)] p-4">
      <QRCode value="https://openfactu.es" size={150} background="var(--k-surface, #ffffff)" eyes="rounded" modules="rounded" />
    </div>
    <p className="m-0 max-w-[260px] text-[12px] text-[var(--fg-muted,#52606f)]">
      Por defecto es oscuro sobre blanco también en modo oscuro: hay lectores que no leen un QR invertido. Cámbialo con
      <code> --k-qr-fg</code> y <code>--k-qr-bg</code> o con las props.
    </p>
  </div>
);

/** Ejemplo de QR tributario en una factura (VeriFactu pide nivel M y entre 30 y 40 mm impreso). */
export const Factura: Story = () => {
  const url = 'https://prewww2.aeat.es/wlpl/TIKE-CONT/ValidarQR?nif=B12345678&numserie=2026-0042&fecha=29-10-2026&importe=121.00';
  const descargar = () => {
    const blob = new Blob([qrToSvg(url, { margin: 4, size: 512 })], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'factura-2026-0042-qr.svg'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  return (
    <div className="flex w-fit items-start gap-5 rounded-xl border border-[var(--border-default,#d6dce3)] bg-[var(--bg-card,#ffffff)] p-5">
      <QRCode value={url} level="M" margin={4} size="35mm" label="QR tributario de la factura 2026-0042" />
      <div className="flex flex-col gap-2 text-[13px]">
        <strong className="text-[var(--fg-default,#0b1220)]">QR tributario</strong>
        <span className="text-[var(--fg-muted,#52606f)]">Factura verificable en la sede electrónica de la AEAT</span>
        <span className="font-mono text-[11px] text-[var(--fg-muted,#52606f)]">2026-0042 · 121,00 €</span>
        <Button variant="outline" size="sm" onClick={descargar}>Descargar SVG</Button>
      </div>
    </div>
  );
};

export const TextoDemasiadoLargo: Story = () => <QRCode value={'x'.repeat(5000)} level="H" size={160} />;
