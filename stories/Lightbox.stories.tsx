import * as React from 'react';
import type { Story } from '@ladle/react';
import { Lightbox } from '../src/components/Lightbox';
import { demoImage } from './shared/demoImages';

const IMAGES = Array.from({ length: 6 }, (_, i) => ({ src: demoImage(i, `Foto ${i + 1}`), alt: `Foto de demostración ${i + 1}`, caption: `Albarán ${2026001 + i} · adjunto ${i + 1}` }));

export const Galeria: Story = () => {
  const [open, setOpen] = React.useState(false);
  const [index, setIndex] = React.useState(0);
  return (
    <div className="grid max-w-2xl grid-cols-3 gap-2">
      {IMAGES.map((img, i) => (
        <button key={img.src} type="button" className="overflow-hidden rounded-[var(--k-radius-sm,4px)]" onClick={() => { setIndex(i); setOpen(true); }} aria-label={`Ver ${img.alt}`}>
          <img src={img.src} alt="" className="block aspect-[3/2] w-full object-cover transition-transform hover:scale-105" />
        </button>
      ))}
      <Lightbox images={IMAGES} open={open} onClose={() => setOpen(false)} index={index} onIndexChange={setIndex} />
    </div>
  );
};
