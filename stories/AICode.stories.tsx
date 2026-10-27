import * as React from 'react';
import { Languages } from 'lucide-react';
import { AICodeBlock, AICodeDiff, AICodeProvider, AIArtifactPanel, registerCodeAction, type AIArtifact, type AICodeDiffStatus } from '../src/ai';

const Frame = ({ children }: { children: React.ReactNode }) => <div style={{ padding: 24, maxWidth: 900, margin: 'auto', display: 'grid', gap: 16 }} className="ai-surface">{children}</div>;
/** Simula al asistente: muestra la petición que recibiría. */
function useAsk() {
  const [asked, setAsked] = React.useState('');
  return { asked, onAsk: (prompt: string) => setAsked(prompt) };
}
const Asked = ({ text }: { text: string }) => text ? <pre role="status" style={{ margin: 0, padding: 12, fontSize: 12, whiteSpace: 'pre-wrap', border: '1px dashed var(--border-default)', borderRadius: 'var(--k-radius-sm)' }}>Petición al asistente:{'\n\n'}{text}</pre> : null;

const original = `export function total(lineas) {
  let suma = 0;
  for (let i = 0; i < lineas.length; i++) {
    suma = suma + lineas[i].precio * lineas[i].cantidad;
  }
  return suma;
}

export function conIva(importe) {
  return importe * 1.21;
}

export function formatear(importe) {
  return importe.toFixed(2) + ' €';
}`;
const modified = `export function total(lineas: Linea[]): number {
  return lineas.reduce((suma, linea) => suma + linea.precio * linea.cantidad, 0);
}

export function conIva(importe: number, tipo = 0.21): number {
  return importe * (1 + tipo);
}

export function formatear(importe: number): string {
  return importe.toFixed(2) + ' €';
}`;

/** Bloque de código con acciones de IA, «Ejecutar» (con salida) y «Aplicar». */
export const Bloque = () => {
  const { asked, onAsk } = useAsk(); const [applied, setApplied] = React.useState('');
  return <Frame><AICodeProvider onAsk={onAsk} onApplyCode={code => setApplied(`Aplicadas ${code.split('\n').length} líneas.`)}
    onRunCode={async code => { await new Promise(resolve => setTimeout(resolve, 600)); if (code.includes('throw')) throw new Error('ReferenceError: lineas is not defined'); return 'total([{ precio: 10, cantidad: 3 }]) → 30\nconIva(30) → 36.3'; }}>
    <AICodeBlock code={original} language="javascript" title="factura.js" />
    <AICodeBlock code={'throw new Error("fallo")'} language="javascript" title="Ejecución con error" />
  </AICodeProvider>{applied && <p role="status">{applied}</p>}<Asked text={asked} /></Frame>;
};

/** Cambios propuestos: aceptar o descartar; las líneas sin cambios lejanas se pliegan. */
export const Diff = () => {
  const [status, setStatus] = React.useState<AICodeDiffStatus>('pending');
  return <Frame>
    <AICodeDiff original={original} modified={modified} language="typescript" title="factura.ts" status={status}
      onAccept={() => setStatus('accepted')} onReject={() => setStatus('rejected')} />
    {status !== 'pending' && <button type="button" onClick={() => setStatus('pending')} style={{ justifySelf: 'start' }}>Restablecer</button>}
    <AICodeDiff original={Array.from({ length: 60 }, (_, i) => `linea ${i + 1}`).join('\n')} modified={Array.from({ length: 60 }, (_, i) => i === 29 ? 'linea 30 // cambiada' : `linea ${i + 1}`).join('\n')} title="Solo lectura, con contexto plegado" />
  </Frame>;
};

/** Selecciona texto en el editor: aparecen las acciones sobre la selección. */
export const Seleccion = () => {
  const { asked, onAsk } = useAsk();
  const [artifacts, setArtifacts] = React.useState<AIArtifact[]>([{ id: 'f', title: 'factura.ts', kind: 'code', language: 'typescript', content: modified }]);
  return <Frame><AICodeProvider onAsk={onAsk}>
    <div style={{ height: 360, border: '1px solid var(--border-default)', borderRadius: 'var(--k-radius-md)', overflow: 'hidden' }}>
      <AIArtifactPanel artifacts={artifacts} value="f" onSelect={() => undefined} onChange={(id, content) => setArtifacts(list => list.map(item => item.id === id && 'content' in item ? { ...item, content } : item))} />
    </div>
  </AICodeProvider><Asked text={asked} /></Frame>;
};

/** Un plugin añade su acción («Traducir comentarios») a bloques y selección. */
export const AccionesDePlugin = () => {
  const { asked, onAsk } = useAsk();
  React.useEffect(() => registerCodeAction({ id: 'translate', label: 'Traducir comentarios', icon: <Languages size={14} />, order: 15,
    run: ({ code, selection, ask }) => ask?.(`Traduce al inglés los comentarios de:\n\n${selection?.text || code}`) }, { source: 'plugin-demo' }), []);
  return <Frame><AICodeProvider onAsk={onAsk}><AICodeBlock code={'// Suma las líneas\nconst total = lineas.reduce((a, b) => a + b, 0);'} language="javascript" /></AICodeProvider><Asked text={asked} /></Frame>;
};
