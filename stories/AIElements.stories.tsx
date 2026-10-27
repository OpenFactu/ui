import * as React from 'react';
import { FileText } from 'lucide-react';
import {
  AIMessage, AIConversation, AIReasoning, AIChainOfThought, AIPlan, AIQueue, AITerminal, AIStackTrace, AITestResults, AIFileTree, AICheckpoint, AIContextUsage, AIInlineCitation,
  registerMessagePart, type AIMessageData, type AIPlanStep, type AITestSuite,
} from '../src/ai';

const Frame = ({ children, width = 760 }: { children: React.ReactNode; width?: number }) => <div className="ai-surface" style={{ padding: 24, maxWidth: width, margin: 'auto', display: 'grid', gap: 18 }}>{children}</div>;

const STACK = `TypeError: Cannot read properties of undefined (reading 'email')
    at seedUsers (/app/prisma/seed.ts:27:14)
    at main (/app/prisma/seed.ts:51:3)
    at Object.<anonymous> (/app/node_modules/tsx/dist/run.js:12:5)
    at Module._compile (node:internal/modules/cjs/loader:1554:14)
    at node:internal/main/run_main_module:36:49
    at processTicksAndRejections (node:internal/process/task_queues:95:5)`;

/** La escena de referencia: comando fallido, traza, explicación del agente. */
export const Escena = () => {
  const [opened, setOpened] = React.useState('');
  const message: AIMessageData = { id: 'a', role: 'assistant', parts: [
    { type: 'terminal', command: 'pnpm prisma migrate reset --skip-seed', output: 'Applying migration `20260101_init`\nApplying migration `20260215_users`\nDatabase reset successful', exitCode: 0 },
    { type: 'stack', trace: STACK },
    { type: 'text', text: 'Las migraciones se aplicaron, pero la siembra falló en `seedUsers`. Una de las fixtures no tiene perfil, así que `profile.email` es `undefined`.' },
  ] };
  return <Frame width={640}>
    <AIMessage message={{ id: 'u', role: 'user', parts: [{ type: 'text', text: 'Resetea la base de datos y siembra los datos.' }] }} />
    <AIMessage message={message} actions={{ onOpenFile: (file, line) => setOpened(`${file}:${line ?? ''}`) }} />
    {opened && <p role="status" className="ai-muted">Abrir en el editor: {opened}</p>}
  </Frame>;
};

export const Razonamiento = () => {
  const [streaming, setStreaming] = React.useState(true); const [run, setRun] = React.useState(0);
  const [text, setText] = React.useState('');
  const full = 'El usuario quiere resetear la base de datos y sembrarla.\nPrimero reviso el esquema de Prisma, después los scripts de siembra y por último decido el orden de los comandos.';
  React.useEffect(() => {
    setStreaming(true); setText('');
    let index = 0; const timer = setInterval(() => { index += 4; setText(full.slice(0, index)); if (index >= full.length) { clearInterval(timer); setStreaming(false); } }, 40);
    return () => clearInterval(timer);
  }, [run]);
  return <Frame width={560}>
    <button type="button" onClick={() => setRun(value => value + 1)} style={{ justifySelf: 'start' }}>Repetir</button>
    <AIReasoning text={text} streaming={streaming} durationMs={streaming ? undefined : 5200} />
    <AIReasoning text="Se abre y se cierra solo mientras piensa; si lo abres tú, lo que decides manda." durationMs={64000} defaultOpen />
  </Frame>;
};

export const Plan = () => {
  const [steps, setSteps] = React.useState<AIPlanStep[]>([
    { id: '1', title: 'Leer el esquema de Prisma', status: 'done' }, { id: '2', title: 'Ejecutar las migraciones', status: 'running', description: 'prisma migrate reset' },
    { id: '3', title: 'Corregir la fixture sin perfil', status: 'pending' }, { id: '4', title: 'Volver a sembrar', status: 'pending' },
  ]);
  const advance = () => setSteps(list => { const index = list.findIndex(step => step.status === 'running' || step.status === 'pending'); return list.map((step, i) => i === index ? { ...step, status: step.status === 'running' ? 'done' : 'running' } : step); });
  return <Frame width={560}><button type="button" onClick={advance} style={{ justifySelf: 'start' }}>Avanzar</button><AIPlan steps={steps} />
    <AIQueue items={[{ id: 'a', title: 'Añadir prueba para seedUsers', status: 'running' }, { id: 'b', title: 'Actualizar el README', description: 'Sección de siembra', status: 'todo' }, { id: 'c', title: 'Revisar las migraciones', status: 'done' }]} /></Frame>;
};

export const CadenaDePensamiento = () => <Frame width={560}>
  <AIChainOfThought defaultOpen steps={[
    { id: '1', title: 'Buscó documentación de Prisma', status: 'done', sources: [{ id: 's1', title: 'migrate reset', url: 'https://www.prisma.io/docs/orm/prisma-migrate' }, { id: 's2', title: 'Seeding', url: 'https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding' }] },
    { id: '2', title: 'Leyó prisma/seed.ts', status: 'done', description: '73 líneas' },
    { id: '3', title: 'Comparó con el esquema', status: 'running' },
  ]} />
</Frame>;

export const TerminalEnVivo = () => {
  const lines = ['> app@1.0.0 build', '> tsc && vite build', '\u001b[32mvite v5.4.0 building for production...\u001b[0m', 'transforming (120) src/main.tsx', '\u001b[33m(!) Some chunks are larger than 500 kB\u001b[0m', 'dist/index.html  0.45 kB', 'dist/assets/index-DxK2.js  612.30 kB', '\u001b[32m✓ built in 4.12s\u001b[0m'];
  const [output, setOutput] = React.useState(''); const [streaming, setStreaming] = React.useState(true); const [run, setRun] = React.useState(0);
  React.useEffect(() => {
    setOutput(''); setStreaming(true); let index = 0;
    const timer = setInterval(() => { index++; setOutput(lines.slice(0, index).join('\n')); if (index >= lines.length) { clearInterval(timer); setStreaming(false); } }, 450);
    return () => clearInterval(timer);
  }, [run]); // eslint-disable-line react-hooks/exhaustive-deps
  return <Frame width={640}><button type="button" onClick={() => setRun(value => value + 1)} style={{ justifySelf: 'start' }}>Repetir</button>
    <AITerminal command="pnpm build" output={output} streaming={streaming} defaultOpen onClear={() => setOutput('')} />
    <AITerminal command="pnpm test" exitCode={1} output={'FAIL  src/seed.test.ts\n  ✕ crea usuarios con perfil (4 ms)\n\nTests: 1 failed, 11 passed'} />
  </Frame>;
};

export const TrazaDeError = () => <Frame width={640}>
  <AIStackTrace trace={STACK} defaultOpen onFilePathClick={() => undefined} />
  <AIStackTrace trace="Error: ECONNREFUSED 127.0.0.1:5432" />
</Frame>;

const suites: AITestSuite[] = [
  { name: 'prisma/seed.test.ts', tests: [
    { name: 'crea los usuarios', status: 'passed', durationMs: 12 },
    { name: 'crea usuarios con perfil', status: 'failed', durationMs: 4, error: { message: "TypeError: Cannot read properties of undefined (reading 'email')", stack: 'at seedUsers (prisma/seed.ts:27:14)\nat main (prisma/seed.ts:51:3)' } },
    { name: 'es idempotente', status: 'skipped' },
  ] },
  { name: 'src/format.test.ts', tests: [{ name: 'formatea importes', status: 'passed', durationMs: 2 }, { name: 'formatea fechas', status: 'passed', durationMs: 3 }] },
];
export const Pruebas = () => <Frame width={640}><AITestResults suites={suites} durationMs={1840} /><AITestResults suites={suites.slice(1)} /></Frame>;

export const Archivos = () => {
  const [selected, setSelected] = React.useState('src/ai/AIPlan.tsx');
  return <Frame width={460}><AIFileTree selected={selected} onSelect={setSelected} files={[
    { path: 'src/ai/AIPlan.tsx', status: 'added', additions: 64 }, { path: 'src/ai/AIConsole.tsx', status: 'added', additions: 128 }, { path: 'src/ai/AIMessage.tsx', status: 'modified', additions: 12, deletions: 2 },
    { path: 'styles/ai-elements.css', status: 'added', additions: 90 }, { path: 'styles/ai.css', status: 'modified', additions: 4, deletions: 4 }, { path: 'prisma/seed.ts', status: 'deleted', deletions: 73 }, { path: 'README.md', status: 'modified', additions: 8 },
  ]} /><p className="ai-muted">Seleccionado: {selected}</p></Frame>;
};

export const ContextoYCitas = () => {
  const [used, setUsed] = React.useState(62000);
  const breakdown = [{ id: 'sys', label: 'Instrucciones', tokens: 4200 }, { id: 'msg', label: 'Mensajes', tokens: Math.max(0, used - 26000) }, { id: 'tools', label: 'Herramientas', tokens: 9800 }, { id: 'files', label: 'Archivos', tokens: 12000 }];
  return <Frame width={640}>
    <label style={{ display: 'grid', gap: 4, fontSize: 12 }}>Tokens usados: {used.toLocaleString('es-ES')}<input type="range" aria-label="Tokens usados" min={30000} max={199000} step={1000} value={used} onChange={event => setUsed(Number(event.target.value))} /></label>
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', minHeight: 260, alignItems: 'flex-start' }}>
      <AIContextUsage usedTokens={used} maxTokens={200000} modelLabel="Asistente general" breakdown={breakdown} details={[{ label: 'Entrada', value: '41,2 k' }, { label: 'Salida', value: '8,4 k' }, { label: 'Coste', value: '0,38 €' }]} onCompact={() => new Promise(resolve => { setTimeout(() => { setUsed(34000); resolve(); }, 700); })} />
      <AIContextUsage usedTokens={168000} maxTokens={200000} placement="top" align="start" />
      <AIContextUsage usedTokens={197500} maxTokens={200000} />
    </div>
    <p>Prisma recomienda sembrar tras el reset <AIInlineCitation sources={[{ id: 's', title: 'Seeding your database', url: 'https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding', description: 'Guía oficial de siembra con Prisma Migrate.' }, { id: 't', title: 'migrate reset', url: 'https://www.prisma.io/docs/orm/reference/prisma-cli-reference', description: 'Referencia de la CLI.' }, { id: 'u', title: 'Discusión en GitHub', url: 'https://github.com/prisma/prisma/discussions' }]} /> y mantener las fixtures completas <AIInlineCitation source={{ id: 'v', title: 'React', url: 'https://react.dev/learn' }} />.</p>
    <AICheckpoint label="Antes de resetear la base de datos" onRestore={() => new Promise(resolve => setTimeout(resolve, 600))} />
  </Frame>;
};

/** Un plugin registra cómo se pinta su parte; los mensajes la usan con `type: 'custom'`. */
export const PartesDePlugin = () => {
  React.useEffect(() => registerMessagePart('invoice', ({ data }) => {
    const invoice = data as { id: string; total: string };
    return <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border-default)', borderRadius: 'var(--k-radius-md)' }}><FileText size={16} /><strong>{invoice.id}</strong><span className="ai-muted">{invoice.total}</span></div>;
  }, { source: 'plugin-demo' }), []);
  return <Frame width={560}><AIMessage message={{ id: 'p', role: 'assistant', parts: [{ type: 'text', text: 'He creado la factura:' }, { type: 'custom', kind: 'invoice', data: { id: 'F-2026-0042', total: '1.240,00 €' } }, { type: 'custom', kind: 'sin-registrar' }] }} /></Frame>;
};

/** Todo junto en una conversación. */
export const Conversacion = () => {
  const [restored, setRestored] = React.useState(false);
  const messages: AIMessageData[] = [
    { id: '1', role: 'user', parts: [{ type: 'text', text: 'Resetea la base de datos y siembra los datos.' }] },
    { id: '2', role: 'assistant', parts: [
      { type: 'reasoning', text: 'Reviso el esquema y los scripts de siembra antes de lanzar comandos.', durationMs: 4300 },
      { type: 'plan', steps: [{ id: 'a', title: 'Resetear', status: 'done' }, { id: 'b', title: 'Sembrar', status: 'error' }, { id: 'c', title: 'Verificar', status: 'pending' }] },
      { type: 'checkpoint', id: 'cp1', label: 'Antes de resetear', restored },
      { type: 'terminal', command: 'pnpm prisma migrate reset --skip-seed', output: 'Database reset successful', exitCode: 0 },
      { type: 'stack', trace: STACK },
      { type: 'tests', suites: suites.slice(0, 1) },
      { type: 'files', files: [{ path: 'prisma/seed.ts', status: 'modified', additions: 3, deletions: 1 }] },
      { type: 'text', text: 'La siembra falló en `seedUsers`: una fixture no tiene perfil.' },
    ] },
  ];
  return <div className="ai-surface" style={{ height: 760, maxWidth: 760, margin: 'auto', display: 'flex', flexDirection: 'column', border: '1px solid var(--border-default)', borderRadius: 'var(--k-radius-md)' }}>
    <AIConversation messages={messages} conversationId="elements" actions={{ onRestoreCheckpoint: async () => setRestored(true), onOpenFile: () => undefined }} />
  </div>;
};
