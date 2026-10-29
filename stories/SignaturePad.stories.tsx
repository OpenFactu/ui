import * as React from 'react';
import type { Story } from '@ladle/react';
import { SignaturePad, type SignaturePadHandle } from '../src/components/SignaturePad';
import { Button } from '../src/components/Button';

export const Basico: Story = () => {
  const ref = React.useRef<SignaturePadHandle>(null);
  const [strokes, setStrokes] = React.useState(0);
  const [preview, setPreview] = React.useState<string | null>(null);
  return (
    <div className="flex max-w-lg flex-col gap-4">
      <SignaturePad ref={ref} label="Firma del receptor" helperText="Con el dedo, el ratón o un lápiz" onChange={(s) => setStrokes(s.length)} />
      <div className="flex gap-2">
        <Button size="sm" disabled={!strokes} onClick={() => setPreview(ref.current?.toDataURL() ?? null)}>Exportar PNG</Button>
        <Button size="sm" variant="secondary" disabled={!strokes} onClick={() => setPreview(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(ref.current?.toSVG() ?? '')}`)}>Exportar SVG</Button>
      </div>
      {preview && <img src={preview} alt="Firma exportada" className="max-w-full rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)]" />}
    </div>
  );
};
