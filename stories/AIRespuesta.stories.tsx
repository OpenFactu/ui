import * as React from 'react';
import {
  AIConversation, AIMessage, AIQuestion, AIToolCall, registerToolView, unregisterToolViewSource,
  type AIMessageCustomization, type AIMessageData, type AIMessagePart, type AIQuestionAnswer, type AITool,
} from '../src/ai';
import { Badge } from '../src/components/Badge';
import { Button } from '../src/components/Button';
import { IconSwap } from '../src/components/Microinteractions';
import { Bookmark, FileText, Search, Check } from 'lucide-react';

const Frame = ({ children }: { children: React.ReactNode }) => <div style={{ padding: 24, maxWidth: 720, margin: 'auto' }} className="ai-surface flex flex-col gap-4">{children}</div>;

const RESPUESTA = `Estas son las **facturas vencidas** de este mes, con [el detalle completo](https://example.com/facturas) y un _resumen_ al final.

Lo primero es revisar tres cosas:

- Los cobros pendientes
- Los gastos sin justificante

- Los movimientos sin conciliar

| Cliente | Importe |
| --- | --- |
| Talleres Ruiz | 1.200 € |
| Clínica Sol | 830 € |

\`\`\`ts
const total = facturas.reduce((suma, f) => suma + f.importe, 0);
console.log(total);
\`\`\`

Con esto, el total a reclamar es de \`2.030 €\` y ~~no hace falta~~ basta con un recordatorio.`;

/** Llega de seis en seis caracteres: los bloques terminados no se tocan y lo que está a medias no enseña su sintaxis. */
export const RespuestaEnDirecto = () => {
  const [length, setLength] = React.useState(0);
  const [running, setRunning] = React.useState(false);
  React.useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => setLength((n) => { const next = Math.min(RESPUESTA.length, n + 6); if (next === RESPUESTA.length) setRunning(false); return next; }), 25);
    return () => clearInterval(timer);
  }, [running]);
  const done = length === RESPUESTA.length;
  const message: AIMessageData = { id: 'm', role: 'assistant', status: done ? undefined : 'streaming', parts: [{ type: 'text', text: RESPUESTA.slice(0, length), format: 'markdown' }] };
  return (
    <Frame>
      <div className="flex items-center gap-3">
        <Button size="sm" onClick={() => { setLength(0); setRunning(true); }}>Responder</Button>
        <span data-testid="estado" className="text-[length:calc(12px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]">{done ? 'Terminado' : running ? 'Llegando' : 'Parado'}</span>
      </div>
      <AIMessage message={message} />
    </Frame>
  );
};

const FACTURAS = [{ id: 'F-141', cliente: 'Talleres Ruiz', total: 1200 }, { id: 'F-142', cliente: 'Clínica Sol', total: 830 }];
const COMPLETADA: AITool = { id: 'c', name: 'consultar_facturas', status: 'completed', input: { estado: 'vencida' }, output: FACTURAS, durationMs: 420 };

/** El nombre legible, una línea de resumen y su propio resultado; lo que no tiene vista se ve en JSON, como siempre. */
export const VistasDeHerramienta = () => {
  React.useEffect(() => {
    registerToolView('consultar_facturas', {
      label: 'Consultar facturas',
      icon: <Search size={14} />,
      summary: (tool) => (Array.isArray(tool.output) ? `${tool.output.length} facturas` : undefined),
      render: ({ output, raw }) => (
        <div data-testid="vista-facturas" className="flex flex-col gap-2">
          <ul className="m-0 list-none p-0">{(output as typeof FACTURAS | undefined)?.map((f) => <li key={f.id} className="flex justify-between gap-3 py-1"><span>{f.cliente}</span><strong>{f.total} €</strong></li>)}</ul>
          <details><summary>Ver detalle</summary>{raw}</details>
        </div>
      ),
    }, { source: 'story' });
    registerToolView('leer_pdf', { label: 'Leer el PDF', icon: <FileText size={14} /> }, { source: 'story' });
    registerToolView('rompe', { label: 'Vista que falla', render: () => { throw new Error('fallo de la vista'); } }, { source: 'story' });
    return () => unregisterToolViewSource('story');
  }, []);
  const [estado, setEstado] = React.useState<AITool['status']>('running');
  const grupo: AIMessagePart[] = [
    { type: 'tool', tool: { id: 'g1', name: 'consultar_facturas', status: 'completed', output: FACTURAS } },
    { type: 'tool', tool: { id: 'g2', name: 'leer_pdf', status: estado, output: estado === 'completed' ? { paginas: 3 } : undefined } },
    { type: 'tool', tool: { id: 'g3', name: 'sin_vista', status: 'completed', input: { a: 1 } } },
  ];
  return (
    <Frame>
      <AIToolCall tool={COMPLETADA} />
      <AIToolCall tool={{ id: 'r', name: 'rompe', status: 'error', input: { a: 1 }, error: 'No se pudo' }} />
      <AIToolCall tool={{ id: 's', name: 'sin_vista', status: 'error', input: { a: 1 }, error: 'Sin vista propia' }} />
      <Button size="sm" variant="secondary" onClick={() => setEstado((s) => (s === 'running' ? 'completed' : s === 'completed' ? 'approval-required' : 'running'))}>Cambiar estado del grupo: {estado}</Button>
      <AIMessage message={{ id: 'g', role: 'assistant', parts: grupo }} actions={{ onApproveTool: () => setEstado('completed'), onRejectTool: () => setEstado('completed') }} />
    </Frame>
  );
};

const PASOS = [
  { question: '¿Es un cliente nuevo o ya existe?', options: [{ label: 'Nuevo', description: 'Hay que darlo de alta' }, { label: 'Ya existe' }] },
  { question: '¿Qué le quieres facturar?', options: [{ label: 'Servicios' }, { label: 'Productos' }, { label: 'Suscripción' }], multiple: true },
  { question: '¿Alguna nota para la factura?', allowText: true, placeholder: 'Escribe la nota…' },
];

export const PreguntasGuiadas = () => {
  const [paso, setPaso] = React.useState(0);
  const [respuestas, setRespuestas] = React.useState<string[]>([]);
  const [falla, setFalla] = React.useState(true);
  const [enMensaje, setEnMensaje] = React.useState<AIQuestionAnswer | undefined>();
  const actual = PASOS[paso];
  return (
    <Frame>
      {/* Suelta encima del compositor: el flujo avanza siempre en el mismo sitio. */}
      {actual
        ? <AIQuestion key={paso} {...actual} step={{ current: paso + 1, total: PASOS.length, title: 'Nueva factura' }} onAnswer={(answer) => { setRespuestas((r) => [...r, answer.label]); setPaso((p) => p + 1); }} />
        : <p data-testid="flujo-fin" className="m-0">Listo: {respuestas.join(' · ')}</p>}
      {/* Como parte de un mensaje, con una respuesta asíncrona que falla la primera vez. */}
      <AIMessage
        message={{ id: 'q', role: 'assistant', parts: [{ type: 'text', text: 'Necesito saber una cosa antes de seguir:', format: 'markdown' }, { type: 'question', id: 'q1', question: '¿Lo envío ya?', options: [{ id: 'si', label: 'Sí, envíalo' }, { id: 'no', label: 'Todavía no' }], answer: enMensaje }] }}
        actions={{ onAnswerQuestion: async (_id, answer) => { await new Promise((r) => setTimeout(r, 60)); if (falla) { setFalla(false); throw new Error('No se pudo guardar la respuesta'); } setEnMensaje(answer); } }}
      />
    </Frame>
  );
};

/** Pie propio, acción añadida, una parte cambiada y un mensaje entero distinto, todo con condiciones. */
export const MensajesAMedida = () => {
  const [guardado, setGuardado] = React.useState(false);
  const messageProps = React.useMemo<AIMessageCustomization>(() => ({
    renderFooter: (message) => (message.role === 'assistant' ? <p data-testid="pie" className="m-0 text-[length:calc(11px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]">120 tokens · 34 t/s</p> : null),
    renderActions: (message, defaults) => (message.role === 'assistant' ? (
      <span className="inline-flex items-center gap-1">{defaults}
        <button type="button" aria-label="Guardar respuesta" aria-pressed={guardado} onClick={() => setGuardado((v) => !v)} className="inline-grid h-[26px] w-[27px] place-items-center"><IconSwap state={guardado}>{guardado ? <Check size={13} /> : <Bookmark size={13} />}</IconSwap></button>
      </span>
    ) : defaults),
    renderHeader: (message, defaults) => (message.role === 'assistant' ? <div data-testid="cabecera" className="flex items-center gap-2">{defaults}<Badge variant="neutral">Beta</Badge></div> : defaults),
    renderAvatar: (message, defaults) => (message.role === 'user' ? null : defaults),
    renderPart: (part, { defaults }) => (part.type === 'image' ? <figure data-testid="imagen" className="m-0">{defaults}</figure> : defaults),
  }), [guardado]);
  const messages: AIMessageData[] = [
    { id: 'u', role: 'user', parts: [{ type: 'text', text: 'Hazme el resumen del mes' }] },
    { id: 'a', role: 'assistant', parts: [{ type: 'text', text: 'Este es el **resumen**.', format: 'markdown' }] },
    { id: 's', role: 'system', parts: [{ type: 'text', text: 'Cambio de modelo' }] },
  ];
  return (
    <Frame>
      <AIConversation
        messages={messages}
        messageProps={messageProps}
        renderMessage={(message, { defaults }) => (message.role === 'system' ? <p data-testid="aviso-sistema" className="m-0 text-center text-[length:calc(11px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]">— Cambio de modelo —</p> : defaults)}
      />
    </Frame>
  );
};
