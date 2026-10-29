import * as React from 'react';
import { useAIComposer } from '../src/ai';
import { Button } from '../src/components/Button';
import { AIComposer, AIModelSelector, AIConversationHistory, AIMessage, AIMessageActions, AIConversation, AIPromptSuggestions, AIMarkdown, AICodeBlock, AISources, AIAttachments, AIToolCall, AIAgentActivity, AIArtifactPanel, AIVoiceRecorder, AIAudioPlayer, type AIDraft, type AIArtifact, type AIToolStatus } from '../src/ai';
import { Globe, Brain, FileText, Plug, ImageIcon, Code2 } from 'lucide-react';
import { registerComposerTool, unregisterComposerToolSource, type AIComposerTool } from '../src/ai';
import { demoModels, demoMessages, demoArtifacts, demoMentions, demoCommands, demoSuggestions, useAIDemo } from './ai-demo';
const Frame = ({ children }: { children: React.ReactNode }) => <div style={{ padding: 24, maxWidth: 900, margin: 'auto' }} className="ai-surface">{children}</div>;
export const Compositor = () => {
  const [draft, setDraft] = React.useState<AIDraft>({ text: '', attachments: [] });
  const [model, setModel] = React.useState('general');
  const [submitted, setSubmitted] = React.useState('');
  return <Frame><p>Prueba @Ventas, /Resumir, archivos y Mayús+Intro. El envío conserva el borrador hasta que la aplicación lo cambie.</p><AIComposer draft={draft} onDraftChange={setDraft} onSubmit={value => setSubmitted(value.text)} models={demoModels} modelId={model} onSelectModel={setModel} mentions={demoMentions} commands={demoCommands} maxFiles={2} maxSizeMb={1} accept=".txt,image/*" /><p role="status">Último envío: {submitted}</p></Frame>;
};
export const CompositorPorPiezas = () => {
  const [draft, setDraft] = React.useState<AIDraft>({ text: '', attachments: [] });
  const [model, setModel] = React.useState('general');
  const [layout, setLayout] = React.useState('top');
  const [sent, setSent] = React.useState('');
  return <Frame><p>Elige la distribución. Las piezas comparten el borrador y las capacidades del modelo; no se añaden controles implícitos.</p>
    <div className="ai-inline-actions">{[['top', 'Modelo arriba'], ['bottom', 'Modelo abajo'], ['minimal', 'Solo texto']].map(([id, label]) => <Button key={id} size="sm" variant="secondary" aria-pressed={layout === id} onClick={() => setLayout(id)}>{label}</Button>)}</div>
    <AIComposer draft={draft} onDraftChange={setDraft} onSubmit={value => { setSent(value.text); setDraft({ text: '', attachments: [] }); }} models={demoModels} modelId={model} onSelectModel={setModel}
      onRecordAudio={() => setSent('Audio recibido')} tools={[{ id: 'research', label: 'Investigar', kind: 'toggle', icon: <Brain size={14} /> }]}>
      {layout === 'top' && <AIComposer.Toolbar aria-label="Controles superiores"><AIComposer.ModelSelector /><AIComposer.Spacer /><ComposerContextButton /></AIComposer.Toolbar>}
      <AIComposer.Attachments /><AIComposer.Input />
      <AIComposer.Toolbar aria-label="Controles inferiores"><AIComposer.ToolGroup>{layout !== 'minimal' && <><AIComposer.AttachButton /><AIComposer.RegisteredTools /><AIComposer.Voice compact /></>}</AIComposer.ToolGroup><AIComposer.Spacer />{layout === 'bottom' && <AIComposer.ModelSelector />}<AIComposer.Submit /></AIComposer.Toolbar>
    </AIComposer><p role="status">Último envío: {sent}</p></Frame>;
};
function ComposerContextButton() { const c = useAIComposer(); return <button type="button" className="ai-tool-chip" disabled={c.disabled || c.busy || c.pending} onClick={() => { c.setDraft({ ...c.draft, text: `${c.draft.text}${c.draft.text ? '\n' : ''}Contexto del proyecto: ` }); c.focusInput(); }}>Añadir contexto</button>; }
export const Modelos = () => { const [value, setValue] = React.useState('general'); return <Frame><AIModelSelector models={demoModels} value={value} onChange={setValue} /></Frame>; };
export const Historial = () => { const { state, actions } = useAIDemo(); return <Frame><div style={{ width: 280, maxWidth: '100%', height: 600 }}><AIConversationHistory conversations={state.conversations} projects={state.projects} value={state.conversationId} onSelect={actions.onSelectConversation} onNew={actions.onNewConversation} onRename={actions.onRenameConversation} onDelete={actions.onDeleteConversation} onPin={actions.onPinConversation} onCreateProject={actions.onCreateProject} onRenameProject={actions.onRenameProject} onDeleteProject={actions.onDeleteProject} onMoveConversation={actions.onMoveConversation} /></div></Frame>; };
export const Conversacion = () => <Frame><div style={{ height: 600, display: 'flex' }}><AIConversation messages={demoMessages} /></div></Frame>;
export const Mensaje = () => <Frame><AIMessage message={{ ...demoMessages[0], name: 'Tú', avatar: demoArtifacts.find(artifact => artifact.kind === 'image')?.url }} /><AIMessage message={demoMessages[1]} /></Frame>;
export const Acciones = () => { const [action, setAction] = React.useState(''); return <Frame><AIMessageActions message={demoMessages[1]} onEdit={() => setAction('Editar')} actions={{ onRetry: () => setAction('Regenerar'), onFeedback: (_, value) => setAction(value), onReadAloud: () => setAction('Lectura solicitada (simulada)') }} /><p role="status">{action}</p></Frame>; };
export const Sugerencias = () => { const [prompt, setPrompt] = React.useState(''); return <Frame><AIPromptSuggestions suggestions={demoSuggestions} onSelect={setPrompt} /><p>{prompt}</p></Frame>; };
const markdown = '# Contenido enriquecido\n\nUna respuesta con **negrita**, _énfasis_, ~~tachado~~, [enlaces](https://react.dev) y una nota[^1].\n\n> Una cita breve.\n\n- [x] Revisar\n- [ ] Compartir\n\n| Campo | Valor |\n| --- | --- |\n| Ideas | 12 |\n\n```typescript\nconst greeting = "Hola";\nconsole.log(greeting);\n```\n\n[^1]: Una nota al pie.\n\n<img src=x onerror="window.__aiInjected=true">\n\n[Enlace bloqueado](javascript:alert(1))';
export const Markdown = () => <Frame><AIMarkdown>{markdown}</AIMarkdown></Frame>;
export const Codigo = () => <Frame><AICodeBlock language="typescript" code={Array.from({ length: 3000 }, (_, index) => `const idea${index} = ${index};`).join('\n')} /></Frame>;
export const Fuentes = () => <Frame><AISources sources={[{ id: 'react', title: 'React', url: 'https://react.dev', description: 'Referencia técnica' }, { id: 'unsafe', title: 'Referencia sin enlace seguro', url: 'javascript:alert(1)' }]} /></Frame>;
export const Adjuntos = () => { const [attachments, setAttachments] = React.useState<AIDraft['attachments']>([{ id: 'ready', name: 'notas.txt', mediaType: 'text/plain', size: 1200, status: 'ready' }, { id: 'upload', name: 'datos.csv', mediaType: 'text/csv', status: 'uploading', progress: 45 }, { id: 'error', name: 'informe.pdf', mediaType: 'application/pdf', status: 'error', error: 'Subida fallida (simulación)' }]); return <Frame><AIAttachments attachments={attachments} onRemove={id => setAttachments(items => items.filter(item => item.id !== id))} /></Frame>; };
export const Herramienta = () => { const [status, setStatus] = React.useState<AIToolStatus>('approval-required'); return <Frame><p>La aprobación de esta demo solo cambia el estado local.</p><AIToolCall tool={{ id: '1', name: 'Consultar datos de ejemplo', status, input: { dataset: 'ideas' }, ...(status === 'completed' ? { output: { ideas: 12 }, durationMs: 400 } : {}) }} onApprove={() => setStatus('completed')} onReject={() => setStatus('denied')} /></Frame>; };
export const Actividad = () => <Frame><AIAgentActivity steps={[{ id: 'a', title: 'Leer el contexto', status: 'completed', durationMs: 210 }, { id: 'b', title: 'Preparar un resultado', description: 'Actividad recibida de la aplicación', status: 'running' }, { id: 'c', title: 'Revisar', status: 'pending' }]} /></Frame>;
export const Resultados = () => {
  const [artifacts, setArtifacts] = React.useState<AIArtifact[]>(demoArtifacts); const [value, setValue] = React.useState('panel');
  return <Frame><div style={{ height: 600, border: '1px solid var(--k-border)' }}><AIArtifactPanel artifacts={artifacts} value={value} onSelect={setValue} onClose={id => { setArtifacts(items => items.filter(item => item.id !== id)); if (id === value) setValue(artifacts.find(item => item.id !== id)?.id ?? ''); }} onChange={(id, content) => setArtifacts(items => items.map(item => item.id === id && 'content' in item ? { ...item, content } : item))} /></div></Frame>;
};
function sampleAudio() {
  const rate = 8000; const data = new ArrayBuffer(44 + rate * 2 * 3); const view = new DataView(data);
  const text = (offset: number, value: string) => [...value].forEach((char, index) => view.setUint8(offset + index, char.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, data.byteLength - 8, true); text(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, data.byteLength - 44, true);
  for (let index = 0; index < rate * 3; index++) view.setInt16(44 + index * 2, Math.sin(index / rate * 220 * Math.PI * 2) * 1000, true);
  return new Blob([data], { type: 'audio/wav' });
}
export const Audio = () => { const blob = React.useMemo(sampleAudio, []); return <Frame><p>Tono de prueba de tres segundos. No se reproduce automáticamente.</p><AIAudioPlayer blob={blob} title="Audio de prueba" /></Frame>; };
export const Grabacion = () => { const [blob, setBlob] = React.useState<Blob>(); const [visible, setVisible] = React.useState(true); return <Frame><p>El micrófono solo se abre al pulsar Grabar. La grabación se conserva en esta página.</p><button type="button" onClick={() => setVisible(value => !value)}>Mostrar u ocultar grabadora</button>{visible && <AIVoiceRecorder onRecorded={setBlob} />}{blob && <><p role="status">Audio recibido: {blob.size} bytes</p><AIAudioPlayer blob={blob} /></>}</Frame>; };
export const Estados = () => <Frame><div style={{ height: 250, display: 'flex' }}><AIConversation messages={[]} loading /></div><div style={{ height: 250, display: 'flex' }}><AIConversation messages={[]} run={{ status: 'error', error: 'Servicio no disponible (ejemplo)' }} actions={{ onRetry: () => {} }} /></div></Frame>;

const pluginTools: AIComposerTool[] = [
  { id: 'web', label: 'Buscar en la web', icon: <Globe size={15} />, kind: 'toggle', order: 10, description: 'Consulta fuentes externas antes de responder' },
  { id: 'think', label: 'Razonar', icon: <Brain size={15} />, kind: 'toggle', order: 20 },
  { id: 'templates', label: 'Plantillas', icon: <FileText size={15} />, order: 30, onSelect: ({ draft, setDraft }) => setDraft({ ...draft, text: ['Redacta un informe con esta estructura:', '1. Contexto', '2. Resultados', '3. Próximos pasos'].join('\n') }) },
  { id: 'images', label: 'Crear imagen', icon: <ImageIcon size={15} />, kind: 'toggle', order: 40 },
  { id: 'code', label: 'Ejecutar código', icon: <Code2 size={15} />, kind: 'toggle', order: 50, when: ({ model }) => model?.id !== 'text' },
  { id: 'connectors', label: 'Conectores', icon: <Plug size={15} />, order: 60 },
];
/** Las herramientas de la barra son un registro: un plugin las aporta y las retira en ejecución. */
export const HerramientasExtensibles = () => {
  const [draft, setDraft] = React.useState<AIDraft>({ text: '', attachments: [] });
  const [model, setModel] = React.useState('general');
  const [enabled, setEnabled] = React.useState(true);
  React.useEffect(() => {
    if (!enabled) return;
    const off = pluginTools.map(tool => registerComposerTool(tool, { source: 'plugin-demo' }));
    return () => { off.forEach(fn => fn()); unregisterComposerToolSource('plugin-demo'); };
  }, [enabled]);
  return <Frame>
    <p>Activa o desactiva el plugin: la barra se repinta sola. Con más de tres herramientas, el resto pasa al menú «+». Cambia a «Solo texto» para ocultar «Ejecutar código» (`when`).</p>
    <button type="button" onClick={() => setEnabled(value => !value)} aria-pressed={enabled} style={{ margin: '0 0 12px', padding: '5px 12px', cursor: 'pointer' }}>{enabled ? 'Desactivar plugin' : 'Activar plugin'}</button>
    <AIComposer draft={draft} onDraftChange={setDraft} onSubmit={() => undefined} models={demoModels} modelId={model} onSelectModel={setModel} onFiles={() => undefined} onRecordAudio={() => undefined} />
    <p role="status">Herramientas activas: {draft.tools?.length ? draft.tools.join(', ') : 'ninguna'}</p>
  </Frame>;
};
