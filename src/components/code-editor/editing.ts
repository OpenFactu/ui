import type { CodeCompletion } from './types';

export interface EditState { value: string; start: number; end: number }
export interface CodeMatch { start: number; end: number }

export function replaceRange(state: EditState, text: string, start = state.start, end = state.end): EditState {
  return { value: state.value.slice(0, start) + text + state.value.slice(end), start: start + text.length, end: start + text.length };
}

export function indentSelection(state: EditState, tabSize: number, outdent = false): EditState {
  const { value, start, end } = state;
  const lineStart = value.slice(0, start).lastIndexOf('\n') + 1;
  if (start === end && !outdent) return replaceRange(state, ' '.repeat(tabSize - (start - lineStart) % tabSize));
  const last = end > start && value[end - 1] === '\n' ? end - 1 : end;
  const lineEnd = value.indexOf('\n', last);
  const stop = lineEnd === -1 ? value.length : lineEnd;
  const lines = value.slice(lineStart, stop).split('\n');
  let firstDelta = 0;
  let totalDelta = 0;
  const result = lines.map((line, index) => {
    const removed = outdent ? (line.startsWith('\t') ? 1 : Math.min(tabSize, /^ */.exec(line)![0].length)) : 0;
    const delta = outdent ? -removed : tabSize;
    if (index === 0) firstDelta = delta;
    totalDelta += delta;
    return outdent ? line.slice(removed) : ' '.repeat(tabSize) + line;
  }).join('\n');
  return { value: value.slice(0, lineStart) + result + value.slice(stop), start: Math.max(lineStart, start + firstDelta), end: Math.max(lineStart, end + totalDelta) };
}

export function insertNewline(state: EditState, tabSize: number, indentAfter: readonly string[]): EditState {
  const before = state.value.slice(0, state.start);
  const line = before.slice(before.lastIndexOf('\n') + 1);
  const indent = /^[\t ]*/.exec(line)![0];
  const extra = indentAfter.includes(line.trimEnd().slice(-1)) ? ' '.repeat(tabSize) : '';
  const after = state.value.slice(state.end);
  const close = extra && /^[\])}]/.test(after) ? '\n' + indent : '';
  const result = replaceRange(state, '\n' + indent + extra + close);
  return { ...result, start: result.start - close.length, end: result.end - close.length };
}

export function insertPair(state: EditState, key: string, pairs: Readonly<Record<string, string>>): EditState | null {
  const { value, start, end } = state;
  if (start === end && Object.values(pairs).includes(key) && value[start] === key) return { ...state, start: start + 1, end: start + 1 };
  const close = pairs[key];
  if (!close) return null;
  if (start === end && /[\w$]/.test(value[start] || '')) return null;
  if (start === end && key === close && /[\w$\\]/.test(value[start - 1] || '')) return null;
  const result = replaceRange(state, key + value.slice(start, end) + close);
  return { ...result, start: start + 1, end: end + 1 };
}

export function findMatches(value: string, query: string, caseSensitive = false): CodeMatch[] {
  if (!query) return [];
  // A literal escaped regexp preserves original UTF-16 offsets even when a
  // character's lowercase form has a different length (for example İ).
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regexp = new RegExp(escaped, caseSensitive ? 'g' : 'gi');
  return Array.from(value.matchAll(regexp), match => ({ start: match.index!, end: match.index! + match[0].length }));
}

export function completeAt(value: string, cursor: number, keywords: readonly string[]) {
  let from = cursor;
  let to = cursor;
  while (from > 0 && /[\w$]/.test(value[from - 1])) from--;
  while (to < value.length && /[\w$]/.test(value[to])) to++;
  const prefix = value.slice(from, cursor);
  const words = new Set([...keywords, ...(value.match(/[A-Za-z_$][\w$]*/g) || [])]);
  const items: CodeCompletion[] = [...words]
    .filter(word => word !== value.slice(from, to) && word.toLowerCase().startsWith(prefix.toLowerCase()))
    .sort().slice(0, 50).map(label => ({ label }));
  return { from, to, items };
}

/** Bounded snapshots, shared by keyboard commands, input and replace actions. */
export class EditorHistory {
  private past: EditState[] = [];
  private future: EditState[] = [];
  private group = '';
  private time = 0;
  private last: EditState | null = null;

  reset() { this.past = []; this.future = []; this.group = ''; this.last = null; }

  record(before: EditState, after: EditState, group = 'command', time = Date.now()) {
    if (before.value === after.value) return;
    const joins = group === 'typing' && this.group === group && time - this.time < 600 &&
      this.last?.value === before.value && this.last.start === before.start && this.last.end === before.end;
    if (!joins) this.past.push(before);
    // At most 100 edits and about 4 MB of UTF-16 snapshots (one large edit is kept).
    let size = this.past.reduce((total, item) => total + item.value.length, 0);
    while (this.past.length > 1 && (this.past.length > 100 || size > 2_000_000)) size -= this.past.shift()!.value.length;
    this.future = [];
    this.group = group;
    this.time = time;
    this.last = after;
  }

  undo(current: EditState): EditState | null {
    const result = this.past.pop();
    if (!result) return null;
    this.future.push(current);
    this.group = '';
    return result;
  }

  redo(current: EditState): EditState | null {
    const result = this.future.pop();
    if (!result) return null;
    this.past.push(current);
    this.group = '';
    return result;
  }
}
