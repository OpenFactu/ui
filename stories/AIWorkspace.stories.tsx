import * as React from 'react';
import { AIWorkspace, AIConversation, AIComposer, AICodeBlock, type AIMessageData } from '../src/ai';
import { useAIDemo, demoMentions, demoCommands, demoSuggestions } from './ai-demo';

function Demo({ empty = false }: { empty?: boolean }) {
  const { state, actions, notice } = useAIDemo(empty);
  return <div style={{ padding: 16 }}><p className="ai-demo-notice">Demo local · respuestas, subida de archivos y herramientas simuladas. Escribe «error» para probar el reintento.</p>{notice && <p role="status">{notice}</p>}
    <AIWorkspace state={state} actions={actions} mentions={demoMentions} commands={demoCommands} suggestions={demoSuggestions} attachmentLimits={{ maxFiles: 4, maxSizeMb: 10 }} style={{ height: 'calc(100dvh - 150px)' }} />
  </div>;
}
export const Completo = () => <Demo />;
export const Vacio = () => <Demo empty />;
export const ConversacionLarga = () => {
  const [messages, setMessages] = React.useState<AIMessageData[]>(() => Array.from({ length: 200 }, (_, index) => ({ id: `message-${index}`, role: index % 2 ? 'assistant' : 'user', parts: [{ type: 'text', text: `Mensaje ${index + 1}. ${index % 2 ? '**Respuesta de ejemplo.** Conserva la lectura al añadir mensajes al final.' : 'Pregunta breve para comprobar el historial largo.'}` }] })));
  const [draft, setDraft] = React.useState({ text: '', attachments: [] });
  const [hasOlder, setHasOlder] = React.useState(true);
  return <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}><p>Prueba local · 200 mensajes y un bloque de 3.000 líneas.</p><div style={{ height: 550, display: 'flex', flexDirection: 'column', border: '1px solid var(--k-border)' }}>
    <AIConversation messages={messages} conversationId="long" hasOlder={hasOlder} onLoadOlder={() => { setMessages(value => [...Array.from({ length: 20 }, (_, index): AIMessageData => ({ id: `older-${index}`, role: 'user', parts: [{ type: 'text', text: `Mensaje anterior ${index + 1}` }] })), ...value]); setHasOlder(false); }} />
    <button type="button" onClick={() => setMessages(value => [...value, { id: crypto.randomUUID(), role: 'assistant', parts: [{ type: 'text', text: 'Nueva respuesta recibida al final.' }] }])}>Añadir mensaje simulado</button>
    <AIComposer draft={draft} onDraftChange={value => setDraft({ ...value, attachments: [] })} onSubmit={value => setMessages(messages => [...messages, { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: value.text }] }])} />
  </div><AICodeBlock code={Array.from({ length: 3000 }, (_, index) => `const item${index} = ${index};`).join('\n')} language="typescript" /></div>;
};
