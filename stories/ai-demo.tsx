import * as React from 'react';
import type { AIArtifact, AIConversationItem, AIConversationProject, AIDraft, AIMessageData, AIModel, AIRun, AIWorkspaceActions, AIWorkspaceState } from '../src/ai';

export const demoModels: AIModel[] = [
  { id: 'general', label: 'Asistente general', description: 'Modelo simulado · texto, imágenes y audio', capabilities: { attachments: true, images: true, audio: true } },
  { id: 'code', label: 'Especialista en código', description: 'Modelo simulado · archivos y texto', capabilities: { attachments: true, images: false, audio: false } },
  { id: 'text', label: 'Solo texto', capabilities: { attachments: false, images: false, audio: false } },
];
export const demoMentions = [{ id: 'ventas', label: 'Ventas', description: 'Contexto de ventas de ejemplo' }, { id: 'catalogo', label: 'Catálogo', description: 'Productos de muestra' }];
export const demoCommands = [{ id: 'resumir', label: 'Resumir', description: 'Preparar un resumen', insertText: 'Resume la conversación ' }, { id: 'codigo', label: 'Código', description: 'Crear un ejemplo', insertText: 'Crea un ejemplo de código ' }];
export const demoSuggestions = [{ id: 'panel', label: 'Crear un panel', description: 'Un resultado HTML interactivo', prompt: 'Crea un panel con los datos de ejemplo' }, { id: 'resumen', label: 'Resumir información', description: 'Texto, tabla y fuentes', prompt: 'Resume los datos de ejemplo' }];
export const demoHtml = `<style>body{background:#f8fafc;color:#172033;padding:24px}h1{font-size:26px;margin:0 0 8px}p{color:#58677e}button{padding:10px 16px;border:0;border-radius:8px;background:#0f766e;color:white;cursor:pointer}.metric{margin:28px 0;padding:24px;border:1px solid #dce3eb;border-radius:12px;background:white}.metric strong{font-size:36px;display:block}small{color:#58677e}</style><small>RESULTADO DE EJEMPLO</small><h1>Tu próximo paso, más claro.</h1><p>Un pequeño panel generado con datos ficticios.</p><div class="metric"><small>Ideas exploradas</small><strong id="count">12</strong></div><button id="add">Añadir una idea</button><script>document.getElementById('add').onclick=()=>document.getElementById('count').textContent=Number(document.getElementById('count').textContent)+1</script>`;
export const demoArtifacts: AIArtifact[] = [
  { id: 'panel', kind: 'html', title: 'Panel de ideas', filename: 'panel.html', content: demoHtml },
  { id: 'summary', kind: 'markdown', title: 'Resumen', filename: 'resumen.md', content: '# Un espacio para explorar\n\nEste documento es **editable**.\n\n- [x] Revisar los datos\n- [ ] Compartir el resultado\n\n| Concepto | Valor |\n| --- | --- |\n| Ideas | 12 |\n| Propuestas | 4 |' },
  { id: 'code', kind: 'code', title: 'Ejemplo.ts', filename: 'ejemplo.ts', language: 'typescript', content: 'interface Idea {\n  title: string;\n  selected: boolean;\n}\n\nconst ideas: Idea[] = [];\nconst selected = ideas.filter(idea => idea.selected);\n' },
  { id: 'table', kind: 'table', title: 'Datos', columns: [{ key: 'name', label: 'Concepto' }, { key: 'value', label: 'Cantidad' }], rows: [{ name: 'Ideas', value: 12 }, { name: 'Propuestas', value: 4 }] },
  { id: 'image', kind: 'image', title: 'Imagen de muestra', alt: 'Píxel de muestra ampliado', url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=' },
];
export const demoMessages: AIMessageData[] = [
  { id: 'welcome-user', role: 'user', parts: [{ type: 'text', text: 'Ayúdame a organizar las ideas de mi próximo proyecto.' }] },
  { id: 'welcome-assistant', role: 'assistant', parts: [
    { type: 'text', text: 'He preparado un punto de partida. Podemos explorar ideas, trabajar con código o convertir la conversación en un resultado editable.\n\n### Un plan sencillo\n1. Define qué quieres resolver.\n2. Añade el contexto y los archivos necesarios.\n3. Revisa y ajusta la propuesta.\n\n> Tú decides cuándo aprobar una herramienta.\n\nEl panel de la derecha contiene una **demo interactiva**.' },
    { type: 'activity', steps: [{ id: 'step-1', title: 'Organizar el contexto', status: 'completed', durationMs: 210 }, { id: 'step-2', title: 'Preparar una propuesta', status: 'completed', durationMs: 340 }] },
    { type: 'sources', sources: [{ id: 's1', title: 'Documentación de React', description: 'Referencia técnica de ejemplo', url: 'https://react.dev/learn' }] },
    { type: 'artifact', artifactId: 'panel', title: 'Panel de ideas' },
  ] },
];
interface Session { item: AIConversationItem; messages: AIMessageData[]; draft: AIDraft; run: AIRun; artifacts: AIArtifact[]; artifactId?: string; modelId: string }
const blankDraft = (): AIDraft => ({ text: '', attachments: [] });
const session = (id: string, title: string): Session => ({ item: { id, title }, messages: [], draft: blankDraft(), run: { status: 'idle' }, artifacts: [], modelId: 'general' });
export function useAIDemo(empty = false) {
  const [projects, setProjects] = React.useState<AIConversationProject[]>([{ id: 'ideas', title: 'Ideas y diseño' }, { id: 'operations', title: 'Operaciones' }]);
  const [sessions, setSessions] = React.useState<Record<string, Session>>(() => ({
    project: { ...session('project', 'Un nuevo proyecto'), item: { id: 'project', title: 'Un nuevo proyecto', pinned: true, group: 'Hoy' }, messages: empty ? [] : demoMessages.map(message => message.role === 'assistant' ? { ...message, versions: [{ id: 'full', label: 'Respuesta detallada', parts: message.parts }, { id: 'short', label: 'Respuesta breve', parts: [{ type: 'text', text: 'Empieza con una idea concreta. Añade contexto, revisa la propuesta y abre el panel para editarla.' }] }] } : message), artifacts: empty ? [] : demoArtifacts, artifactId: empty ? undefined : 'panel' },
    notes: { ...session('notes', 'Notas e ideas'), item: { id: 'notes', title: 'Notas e ideas', group: 'Ayer' } },
  }));
  const [activeId, setActiveId] = React.useState('project');
  const [notice, setNotice] = React.useState('');
  const timers = React.useRef(new Map<string, ReturnType<typeof setTimeout>[]>());
  const generations = React.useRef(new Map<string, number>());
  const live = React.useRef(sessions); live.current = sessions;
  const update = (id: string, fn: (value: Session) => Session) => setSessions(values => values[id] ? { ...values, [id]: fn(values[id]) } : values);
  const cancel = (id: string) => { timers.current.get(id)?.forEach(clearTimeout); timers.current.delete(id); generations.current.set(id, (generations.current.get(id) ?? 0) + 1); };
  React.useEffect(() => () => { timers.current.forEach(values => values.forEach(clearTimeout)); }, []);
  const later = (id: string, delay: number, fn: () => void) => {
    const generation = generations.current.get(id) ?? 0;
    const timer = setTimeout(() => { if ((generations.current.get(id) ?? 0) === generation) fn(); }, delay);
    timers.current.set(id, [...(timers.current.get(id) ?? []), timer]);
  };
  const setTool = (id: string, messageId: string, status: 'running' | 'completed' | 'denied') => update(id, value => ({ ...value, messages: value.messages.map(message => message.id !== messageId ? message : { ...message, parts: message.parts.map(part => part.type === 'tool' ? { ...part, tool: { ...part.tool, status, ...(status === 'completed' ? { output: { ideas: 12 }, durationMs: 520 } : {}) } } : part) }) }));
  function stream(id: string, messageId: string) {
    const content = '### Propuesta preparada\n\nHe organizado los datos de ejemplo en un documento y un panel. Puedes **editar el resultado**, descargarlo o seguir preguntando.\n\n| Paso | Estado |\n| --- | --- |\n| Revisar contexto | Listo |\n| Preparar propuesta | Listo |\n\n```typescript\nconst nextStep = "Explorar una idea";\nconsole.log(nextStep);\n```\n\nTodos los datos y las respuestas de esta demo son simulados.';
    setTool(id, messageId, 'running');
    update(id, value => ({ ...value, run: { status: 'streaming' } }));
    const chunks = 8;
    for (let index = 1; index <= chunks; index++) later(id, index * 160, () => {
      const done = index === chunks;
      update(id, value => ({ ...value, run: { status: done ? 'idle' : 'streaming' },
        artifacts: done ? [...demoArtifacts.map(artifact => value.artifacts.find(item => item.id === artifact.id) ?? artifact), ...value.artifacts.filter(artifact => !demoArtifacts.some(item => item.id === artifact.id))] : value.artifacts,
        messages: value.messages.map(message => message.id === messageId ? { ...message, status: done ? 'idle' : 'streaming', parts: [
          { type: 'text', text: content.slice(0, Math.ceil(content.length * index / chunks)) },
          ...message.parts.filter(part => part.type === 'tool').map(part => part.type === 'tool' ? { ...part, tool: { ...part.tool, status: done ? 'completed' as const : 'running' as const, ...(done ? { output: { ideas: 12 }, durationMs: 1280 } : {}) } } : part),
          ...(done ? [{ type: 'artifact' as const, artifactId: 'summary', title: 'Resumen editable' }, { type: 'sources' as const, sources: [{ id: 'react', title: 'React · documentación', url: 'https://react.dev/learn' }] }] : []),
        ] } : message) }));
    });
  }
  function begin(id: string, draft: AIDraft, reuseId?: string, retry = false) {
    cancel(id); const messageId = reuseId ?? crypto.randomUUID();
    const assistant: AIMessageData = { id: messageId, role: 'assistant', status: 'submitting', parts: [] };
    update(id, value => ({ ...value, draft: reuseId ? value.draft : blankDraft(), run: { status: 'submitting' }, messages: reuseId
      ? value.messages.map(message => message.id === reuseId ? assistant : message)
      : [...value.messages, { id: crypto.randomUUID(), role: 'user', parts: [{ type: 'text', text: draft.text }, ...draft.attachments.map(attachment => ({ type: 'file' as const, attachment }))] }, assistant] }));
    later(id, 240, () => {
      if (/error/i.test(draft.text) && !retry) {
        update(id, value => ({ ...value, run: { status: 'error', error: 'Error simulado. Reintenta para continuar.' }, messages: value.messages.map(message => message.id === messageId ? { ...message, status: 'error', parts: [{ type: 'text', text: 'La demo ha simulado un fallo recuperable.' }] } : message) })); return;
      }
      update(id, value => ({ ...value, run: { status: 'waiting' }, messages: value.messages.map(message => message.id === messageId ? { ...message, status: 'waiting', parts: [{ type: 'text', text: 'Puedo preparar el resultado usando los datos de muestra. La herramienta requiere tu aprobación.' }, { type: 'tool', tool: { id: messageId, name: 'Preparar propuesta (simulación)', status: 'approval-required', input: { scope: 'Datos ficticios', model: value.modelId } } }] } : message) }));
    });
  }
  const active = sessions[activeId] ?? Object.values(sessions)[0];
  const upload = (files: File[]) => {
    const id = activeId; const attachments = files.map(file => ({ id: crypto.randomUUID(), name: file.name, mediaType: file.type, file, size: file.size, status: 'uploading' as const, progress: 0 }));
    update(id, value => ({ ...value, draft: { ...value.draft, attachments: [...value.draft.attachments, ...attachments] } }));
    // Upload is deliberately local; no file leaves the browser.
    const timer = setTimeout(() => update(id, value => ({ ...value, draft: { ...value.draft, attachments: value.draft.attachments.map(item => attachments.some(added => added.id === item.id) ? { ...item, status: 'ready', progress: 100 } : item) } })), 400);
    timers.current.set('uploads', [...(timers.current.get('uploads') ?? []), timer]);
  };
  const actions: AIWorkspaceActions = {
    onDraftChange: draft => update(activeId, value => ({ ...value, draft })),
    onSubmit: draft => { if (!['idle', 'error', 'cancelled'].includes(live.current[activeId]?.run.status)) return; begin(activeId, draft); },
    onStop: () => { cancel(activeId); update(activeId, value => ({ ...value, run: { status: 'cancelled' }, messages: value.messages.map(message => ['submitting', 'waiting', 'streaming'].includes(message.status ?? '') ? { ...message, status: 'cancelled', parts: message.parts.map(part => part.type === 'tool' ? { ...part, tool: { ...part.tool, status: 'cancelled' } } : part) } : message) })); },
    onRetry: requestedId => { const value = live.current[activeId]; const target = requestedId ? value.messages.find(message => message.id === requestedId) : [...value.messages].reverse().find(message => message.role === 'assistant'); if (target) begin(activeId, { text: 'Reintentar', attachments: [] }, target.id, true); },
    onSelectConversation: setActiveId,
    onNewConversation: projectId => { const id = crypto.randomUUID(); const next = session(id, 'Nueva conversación'); next.item.projectId = projectId; setSessions(values => ({ ...values, [id]: next })); setActiveId(id); },
    onCreateProject: title => setProjects(values => [...values, { id: crypto.randomUUID(), title }]),
    onRenameProject: (id, title) => setProjects(values => values.map(project => project.id === id ? { ...project, title } : project)),
    onDeleteProject: id => { setProjects(values => values.filter(project => project.id !== id)); setSessions(values => Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.item.projectId === id ? { ...value, item: { ...value.item, projectId: undefined } } : value]))); },
    onMoveConversation: (id, projectId) => update(id, value => ({ ...value, item: { ...value.item, projectId } })),
    onRenameConversation: (id, title) => update(id, value => ({ ...value, item: { ...value.item, title } })),
    onPinConversation: (id, pinned) => update(id, value => ({ ...value, item: { ...value.item, pinned } })),
    onDeleteConversation: id => { cancel(id); const rest = Object.values(live.current).filter(value => value.item.id !== id); if (!rest.length) { const replacement = session('replacement', 'Nueva conversación'); setSessions({ replacement }); setActiveId('replacement'); } else { setSessions(values => { const next = { ...values }; delete next[id]; return next; }); if (activeId === id) setActiveId(rest[0].item.id); } },
    onSelectModel: modelId => update(activeId, value => ({ ...value, modelId })),
    onFiles: upload, onRecordAudio: blob => upload([new File([blob], 'nota-de-voz.webm', { type: blob.type })]),
    onEditMessage: (id, text) => update(activeId, value => ({ ...value, messages: value.messages.map(message => message.id === id ? { ...message, parts: [{ type: 'text', text }], versions: message.versions?.map(version => version.id === (message.versionId ?? message.versions?.[0].id) ? { ...version, parts: [{ type: 'text', text }] } : version) } : message) })),
    onFeedback: (id, feedback) => update(activeId, value => ({ ...value, messages: value.messages.map(message => message.id === id ? { ...message, feedback } : message) })),
    onReadAloud: () => setNotice('Lectura solicitada (simulación). La aplicación aportaría la síntesis de voz.'),
    onVersionChange: (id, versionId) => update(activeId, value => ({ ...value, messages: value.messages.map(message => message.id === id ? { ...message, versionId } : message) })),
    onApproveTool: id => stream(activeId, id),
    onRejectTool: id => { setTool(activeId, id, 'denied'); update(activeId, value => ({ ...value, run: { status: 'idle' }, messages: value.messages.map(message => message.id === id ? { ...message, status: 'idle', parts: [{ type: 'text', text: 'Herramienta rechazada. Podemos continuar sin utilizarla.' }, ...message.parts.filter(part => part.type === 'tool')] } : message) })); },
    onOpenArtifact: artifactId => update(activeId, value => ({ ...value, artifacts: value.artifacts.some(item => item.id === artifactId) ? value.artifacts : [...value.artifacts, ...demoArtifacts.filter(item => item.id === artifactId)], artifactId })),
    onCloseArtifact: id => update(activeId, value => ({ ...value, artifacts: value.artifacts.filter(item => item.id !== id), artifactId: value.artifactId === id ? value.artifacts.find(item => item.id !== id)?.id : value.artifactId })),
    onArtifactChange: (id, content) => update(activeId, value => ({ ...value, artifacts: value.artifacts.map(artifact => artifact.id === id && 'content' in artifact ? { ...artifact, content } : artifact) })),
    onOpenCode: (content, language) => { const id = crypto.randomUUID(); update(activeId, value => ({ ...value, artifacts: [...value.artifacts, { id, title: 'Código de la respuesta', kind: 'code', content, language }], artifactId: id })); },
    onCommand: command => setNotice(`Comando seleccionado: ${command.label}`),
    onApplyCode: (_code, language) => setNotice(`Código ${language ?? ''} aplicado (simulación). La aplicación decide dónde va.`),
    onRunCode: async code => { await new Promise(resolve => setTimeout(resolve, 500)); return [`> ${code.split(/\n/).length} líneas evaluadas (simulación)`, 'Explorar una idea'].join('\n'); },
  };
  const state: AIWorkspaceState = { conversations: Object.values(sessions).map(value => value.item), projects, conversationId: active.item.id, messages: active.messages, draft: active.draft, models: demoModels, modelId: active.modelId, run: active.run, artifacts: active.artifacts, artifactId: active.artifactId };
  return { state, actions, notice };
}
