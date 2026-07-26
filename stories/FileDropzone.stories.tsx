import * as React from 'react';
import type { Story } from '@ladle/react';
import { FileDropzone } from '../src/components/FileDropzone';

export const Basico: Story = () => {
  const [files, setFiles] = React.useState<File[]>([]);
  return (
    <div className="max-w-lg">
      <FileDropzone
        multiple
        accept="image/*,.pdf"
        maxSizeMb={10}
        hint="PNG, JPG o PDF · máx. 10 MB"
        files={files}
        onFiles={(f) => setFiles((prev) => [...prev, ...f])}
        onRemoveFile={(i) => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
        onReject={(reason, rejected) =>
          console.log('rechazados', reason, rejected.map((f) => f.name))
        }
      />
    </div>
  );
};

export const Subiendo: Story = () => (
  <div className="max-w-lg">
    <FileDropzone onFiles={() => {}} isUploading progress={62} hint="No cierres esta ventana." />
  </div>
);

export const Variantes: Story = () => (
  <div className="flex flex-col gap-6 max-w-lg">
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--k-ink-400)] mb-2">
        inline
      </p>
      <FileDropzone variant="inline" onFiles={() => {}} label="Adjuntar documento" />
    </div>
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--k-ink-400)] mb-2">
        button
      </p>
      <FileDropzone variant="button" onFiles={() => {}} label="Subir archivo" />
    </div>
    <div>
      <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--k-ink-400)] mb-2">
        con error
      </p>
      <FileDropzone onFiles={() => {}} error="El archivo supera el tamaño permitido." />
    </div>
  </div>
);
