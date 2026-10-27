/** Lógica pura de los «elementos» del agente: se prueba sin DOM. */

// ── Stack trace ────────────────────────────────────────────────────────

export interface AIStackFrame {
  /** Línea original, tal cual. */
  raw: string;
  fn?: string;
  file: string;
  line?: number;
  column?: number;
  /** `node_modules`, `node:` o código del motor: se atenúa y se pliega con las demás. */
  internal: boolean;
}
export interface AIParsedStack { type?: string; message: string; frames: AIStackFrame[] }

const FRAME_WITH_FN = /^\s*at\s+(?:async\s+)?(.+?)\s+\((.+?)\)\s*$/;
const FRAME_BARE = /^\s*at\s+(?:async\s+)?(.+?)\s*$/;
const LOCATION = /^(.*?)(?::(\d+))?(?::(\d+))?$/;
const INTERNAL = /(^|[\\/])node_modules[\\/]|^node:|^internal[\\/]|^webpack-internal:|\(<anonymous>\)|^<anonymous>$/;

function parseLocation(text: string): Pick<AIStackFrame, 'file' | 'line' | 'column'> {
  const match = LOCATION.exec(text.trim());
  const file = match?.[1] || text.trim();
  return { file, line: match?.[2] ? Number(match[2]) : undefined, column: match?.[3] ? Number(match[3]) : undefined };
}

/** Lee un `error.stack` de V8/Node/navegadores Chromium. Lo que no reconoce se conserva como mensaje. */
export function parseStackTrace(stack: string): AIParsedStack {
  const lines = stack.replace(/\r\n?/g, '\n').split('\n');
  const frames: AIStackFrame[] = [];
  const head: string[] = [];
  for (const line of lines) {
    const withFn = FRAME_WITH_FN.exec(line);
    const bare = withFn ? null : FRAME_BARE.exec(line);
    if (withFn || bare) {
      const fn = withFn ? withFn[1] : undefined;
      const location = parseLocation(withFn ? withFn[2] : bare![1]);
      frames.push({ raw: line.trim(), fn, ...location, internal: INTERNAL.test(location.file) || INTERNAL.test(line) });
    } else if (!frames.length) head.push(line);
  }
  const first = head.join('\n').trim();
  const split = /^([A-Za-z_$][\w$.]*(?:Error|Exception)?):\s*([\s\S]*)$/.exec(first);
  return split ? { type: split[1], message: split[2].trim(), frames } : { message: first, frames };
}

// ── Terminal ───────────────────────────────────────────────────────────

const ANSI = /\u001b\[[0-9;?]*[ -/]*[@-~]|\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g;
/** Quita los códigos de color y de cursor: el texto se muestra tal cual, sin interpretar nada. */
export const stripAnsi = (text: string): string => text.replace(ANSI, '').replace(/\r(?!\n)/g, '\n');

// ── Árbol de archivos ──────────────────────────────────────────────────

export interface AIChangedFile { path: string; status?: 'added' | 'modified' | 'deleted'; additions?: number; deletions?: number }
export type AIFileNode =
  | { kind: 'folder'; name: string; path: string; children: AIFileNode[] }
  | { kind: 'file'; name: string; path: string; file: AIChangedFile };

/** Agrupa rutas en carpetas; las carpetas con un único hijo carpeta se compactan (`src/ai`). */
export function buildFileTree(files: readonly AIChangedFile[]): AIFileNode[] {
  const root: AIFileNode & { kind: 'folder' } = { kind: 'folder', name: '', path: '', children: [] };
  for (const file of files) {
    const parts = file.path.split('/').filter(Boolean);
    let node = root;
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/');
      if (index === parts.length - 1) { node.children.push({ kind: 'file', name: part, path, file }); return; }
      let next = node.children.find((child): child is AIFileNode & { kind: 'folder' } => child.kind === 'folder' && child.name === part);
      if (!next) { next = { kind: 'folder', name: part, path, children: [] }; node.children.push(next); }
      node = next;
    });
  }
  const compact = (nodes: AIFileNode[]): AIFileNode[] => nodes.map(node => {
    if (node.kind === 'file') return node;
    let current = node;
    while (current.children.length === 1 && current.children[0].kind === 'folder') {
      const only = current.children[0] as AIFileNode & { kind: 'folder' };
      current = { kind: 'folder', name: `${current.name}/${only.name}`, path: only.path, children: only.children };
    }
    return { ...current, children: compact(current.children) };
  });
  const sort = (nodes: AIFileNode[]): AIFileNode[] => [...nodes].sort((a, b) => a.kind === b.kind ? a.name.localeCompare(b.name) : a.kind === 'folder' ? -1 : 1)
    .map(node => node.kind === 'folder' ? { ...node, children: sort(node.children) } : node);
  return sort(compact(root.children));
}

// ── Pruebas ────────────────────────────────────────────────────────────

export type AITestStatus = 'passed' | 'failed' | 'skipped' | 'running';
export interface AITestCase { name: string; status: AITestStatus; durationMs?: number; error?: { message: string; stack?: string } }
export interface AITestSuite { name: string; tests: AITestCase[] }
export function summarizeTests(suites: readonly AITestSuite[]) {
  const total = { tests: 0, passed: 0, failed: 0, skipped: 0, running: 0, durationMs: 0 };
  for (const suite of suites) for (const test of suite.tests) {
    total.tests++; total[test.status]++; total.durationMs += test.durationMs ?? 0;
  }
  return total;
}
export const suiteStatus = (suite: AITestSuite): AITestStatus => suite.tests.some(test => test.status === 'failed') ? 'failed' : suite.tests.some(test => test.status === 'running') ? 'running' : suite.tests.every(test => test.status === 'skipped') ? 'skipped' : 'passed';

// ── Plan y cola ────────────────────────────────────────────────────────

export type AIStepStatus = 'pending' | 'running' | 'done' | 'error';
export const planProgress = (steps: readonly { status: AIStepStatus }[]) => ({ done: steps.filter(step => step.status === 'done').length, total: steps.length });

// ── Contexto ───────────────────────────────────────────────────────────

export type AIContextLevel = 'ok' | 'warning' | 'danger';
export function contextUsage(used: number, max: number) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, used / max)) : 0;
  return { ratio, percent: Math.round(ratio * 100), level: (ratio >= 0.95 ? 'danger' : ratio >= 0.8 ? 'warning' : 'ok') as AIContextLevel };
}
export const compactNumber = (value: number): string => value >= 1_000_000 ? `${(value / 1_000_000).toFixed(1).replace(/\.0$/, '')} M` : value >= 1000 ? `${(value / 1000).toFixed(1).replace(/\.0$/, '')} k` : String(Math.round(value));

// ── Varios ─────────────────────────────────────────────────────────────

export function hostOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}
/** «5 s», «1 min 4 s»: duraciones legibles. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(Math.max(0, ms))} ms`;
  const seconds = Math.max(0, Math.round(ms / 1000));
  if (seconds < 60) return `${seconds} s`;
  const minutes = Math.floor(seconds / 60); const rest = seconds % 60;
  return rest ? `${minutes} min ${rest} s` : `${minutes} min`;
}
