import * as React from 'react';
import { UiIcon } from '../icons';
import { DropdownMenu } from '../components/DropdownMenu';
import { Select } from '../components/Select';
import { Textarea } from '../components/Textarea';
import { FileDropzone } from '../components/FileDropzone';
import { cn } from '../utils';
import type { AIUIProps, AIDraft, AIModel, AIRun, AIMention, AICommand } from './types';
import { aiLabels, type AILabels } from './labels';
import { canSubmit, isBusy, remainingFileCount, suggestionQuery } from './internal/helpers';
import { AIIconButton } from './internal/ui';
import { AIAttachments } from './AIAttachments';
import { AIVoiceRecorder } from './AIVoice';
import { useComposerTools, type AIComposerTool, type AIComposerToolContext } from './registry';

export interface AIModelSelectorProps extends AIUIProps { models: AIModel[]; value?: string; onChange?: (id: string) => void; disabled?: boolean }
export function AIModelSelector({ models, value, onChange, disabled, labels, className }: AIModelSelectorProps) {
  const l = aiLabels(labels);
  if (!models.length) return null;
  if (!onChange) return <span className={cn('ai-model-fixed', className)}>{models.find(model => model.id === value)?.label ?? models[0].label}</span>;
  return <div className={cn('ai-model-selector', className)}><Select ariaLabel={l.model} options={models.map(model => ({ value: model.id, label: model.label, disabled: model.disabled }))} value={value ?? ''} onChange={onChange} disabled={disabled} /></div>;
}
type SuggestionSource<T> = readonly T[] | ((query: string) => readonly T[]);
export interface AIComposerProps extends AIUIProps {
  draft: AIDraft;
  onDraftChange: (draft: AIDraft) => void;
  onSubmit: (draft: AIDraft) => void | Promise<void>;
  run?: AIRun;
  onStop?: () => void;
  models?: AIModel[];
  modelId?: string;
  onSelectModel?: (id: string) => void;
  mentions?: SuggestionSource<AIMention>;
  commands?: SuggestionSource<AICommand>;
  onCommand?: (command: AICommand) => void;
  onFiles?: (files: File[]) => void;
  onRecordAudio?: (blob: Blob) => void | Promise<void>;
  accept?: string;
  maxFiles?: number;
  maxSizeMb?: number;
  disabled?: boolean;
  /** Herramientas propias de esta instancia; se suman a las del registro (`registerComposerTool`) y sustituyen a las de su mismo id. */
  tools?: AIComposerTool[];
  /** Cuántas herramientas caben en la barra antes de pasar al menú «más». Por defecto 3. */
  maxInlineTools?: number;
  /** Composición explícita: solo se montan las piezas incluidas. Sin children se usa la distribución habitual. */
  children?: React.ReactNode;
}
interface ComposerContextValue extends AIComposerProps {
  l: AILabels; inputId: string; listId: string;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  busy: boolean; pending: boolean; filesAllowed: boolean; audioAllowed: boolean; valid: boolean;
  items: readonly AIMention[]; active: number; cursor: number;
  setCursor: (value: number) => void; setIndex: React.Dispatch<React.SetStateAction<number>>;
  dismiss: () => void; choose: (index: number) => void; submit: () => void;
  receiveFiles: (files: File[]) => void; rejectFiles: () => void;
}
const ComposerContext = React.createContext<ComposerContextValue | null>(null);
function useComposer() { const context = React.useContext(ComposerContext); if (!context) throw Error('AIComposer parts must be inside AIComposer.'); return context; }

/** Estado y acciones compartidos para controles propios dentro de AIComposer. */
export function useAIComposer() {
  const c = useComposer();
  return { draft: c.draft, setDraft: c.onDraftChange, models: c.models ?? [], modelId: c.modelId ?? c.draft.modelId,
    model: c.models?.find(model => model.id === (c.modelId ?? c.draft.modelId)), selectModel: c.onSelectModel,
    busy: c.busy, pending: c.pending, disabled: !!c.disabled, valid: c.valid, submit: c.submit, stop: c.onStop,
    focusInput: () => c.inputRef.current?.focus(), filesAllowed: c.filesAllowed, audioAllowed: c.audioAllowed, labels: c.l };
}

function ComposerToolbar({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cn('ai-composer-tools', className)}>{children}</div>;
}
function ComposerToolGroup({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  const c = useComposer();
  return <div role="group" aria-label={c.l.tools} {...props} className={cn('ai-tools-group', className)}>{children}</div>;
}
function ComposerSpacer() { return <span className="ai-tools-spacer" aria-hidden="true" />; }
function ComposerModelSelector({ className }: { className?: string }) {
  const c = useComposer();
  return <AIModelSelector models={c.models ?? []} value={c.modelId ?? c.draft.modelId} onChange={c.onSelectModel} disabled={c.busy || c.pending || c.disabled} labels={c.labels} className={className} />;
}
function ComposerAttachButton({ className }: { className?: string }) {
  const c = useComposer();
  return c.filesAllowed ? <FileDropzone variant="button" className={cn('ai-attach', className)} label={<span className="ai-sr-only">{c.l.attach}</span>} icon={<UiIcon slot="paperclip" size={16} />} multiple disabled={c.disabled || c.pending}
    accept={c.accept} maxFiles={remainingFileCount(c.maxFiles, c.draft.attachments.length)} maxSizeMb={c.maxSizeMb} onFiles={c.receiveFiles} onReject={c.rejectFiles} /> : null;
}

function ComposerInput() {
  const c = useComposer();
  const composing = React.useRef(false);
  React.useLayoutEffect(() => {
    const input = document.getElementById(c.inputId) as HTMLTextAreaElement | null;
    c.inputRef.current = input;
    if (input) { input.style.height = '0px'; input.style.height = `${Math.min(200, Math.max(48, input.scrollHeight))}px`; }
  }, [c.draft.text, c.inputId, c.inputRef]);
  return <Textarea data-k-focus-input="" id={c.inputId} aria-label={c.l.message} value={c.draft.text} placeholder={c.l.writeMessage}
    containerClassName="ai-composer-input-wrap" className="ai-composer-input" rows={1} disabled={c.disabled}
    aria-autocomplete="list" aria-controls={c.items.length ? c.listId : undefined}
    aria-activedescendant={c.items.length ? `${c.listId}-${c.active}` : undefined}
    onChange={event => { c.onDraftChange({ ...c.draft, text: event.target.value }); c.setCursor(event.target.selectionStart); }}
    onSelect={event => c.setCursor(event.currentTarget.selectionStart)}
    onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }}
    onKeyDown={event => {
      if (composing.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
      if (c.items.length && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab', 'Escape'].includes(event.key)) {
        event.preventDefault();
        if (event.key === 'Escape') c.dismiss();
        else if (event.key === 'Enter' || event.key === 'Tab') c.choose(c.active);
        else c.setIndex(index => (index + (event.key === 'ArrowDown' ? 1 : -1) + c.items.length) % c.items.length);
        return;
      }
      if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); c.submit(); }
    }} />;
}
function ComposerAttachments() {
  const c = useComposer();
  return <><AIAttachments attachments={c.draft.attachments} onRemove={c.disabled ? undefined : id => c.onDraftChange({ ...c.draft, attachments: c.draft.attachments.filter(item => item.id !== id) })} labels={c.labels} />
    {!!c.draft.mentions?.length && <div className="ai-mention-chips">{c.draft.mentions.map(mention => <span key={mention.id}>@{mention.label}<AIIconButton label={`${c.l.cancel}: ${mention.label}`} onClick={() => c.onDraftChange({ ...c.draft, mentions: c.draft.mentions?.filter(item => item.id !== mention.id) })}><UiIcon slot="x" size={11} /></AIIconButton></span>)}</div>}</>;
}
function ComposerSubmit() {
  const c = useComposer();
  return c.busy ? c.onStop ? <AIIconButton className="ai-submit" label={c.l.stop} onClick={c.onStop}><UiIcon slot="square" size={14} /></AIIconButton> : <span className="ai-muted" role="status">{c.l.streaming}</span>
    : <AIIconButton className="ai-submit" label={c.l.send} disabled={c.disabled || c.pending || !c.valid} onClick={c.submit}><UiIcon slot="arrow-up" size={18} /></AIIconButton>;
}
function ComposerToolButton({ tool, context }: { tool: AIComposerTool; context: AIComposerToolContext }) {
  if (tool.render) return <>{tool.render(context)}</>;
  const disabled = typeof tool.disabled === 'function' ? tool.disabled(context) : tool.disabled;
  return <button type="button" className="ai-tool-chip" data-active={context.active || undefined} aria-pressed={tool.kind === 'toggle' ? context.active : undefined}
    aria-label={tool.label} title={tool.description ?? tool.label} disabled={disabled || context.busy} onClick={() => runTool(tool, context)}>{tool.icon}<span>{tool.label}</span></button>;
}
function runTool(tool: AIComposerTool, context: AIComposerToolContext) {
  if (tool.onSelect) tool.onSelect(context);
  else if (tool.kind === 'toggle') context.setDraft({ ...context.draft, tools: context.active ? (context.draft.tools ?? []).filter(id => id !== tool.id) : [...(context.draft.tools ?? []), tool.id] });
  context.focusInput();
}
function ComposerRegisteredTools() {
  const c = useComposer();
  const registered = useComposerTools();
  const model = c.models?.find(item => item.id === (c.modelId ?? c.draft.modelId));
  const base = { draft: c.draft, setDraft: c.onDraftChange, model, busy: c.busy || c.pending || !!c.disabled, focusInput: () => c.inputRef.current?.focus() };
  const own = c.tools ?? [];
  const tools = [...registered.filter(tool => !own.some(item => item.id === tool.id)), ...own]
    .filter(tool => { try { return tool.when?.(base) ?? true; } catch { return false; } })
    .sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  const limit = Math.max(0, c.maxInlineTools ?? 3);
  const inline = tools.slice(0, limit); const overflow = tools.slice(limit);
  const contextFor = (tool: AIComposerTool): AIComposerToolContext => ({ ...base, active: (c.draft.tools ?? []).includes(tool.id) });
  return <>
      {inline.map(tool => <ComposerToolButton key={tool.id} tool={tool} context={contextFor(tool)} />)}
      {!!overflow.length && <DropdownMenu align="start" items={overflow.map(tool => { const context = contextFor(tool); return { label: tool.label, icon: context.active ? <UiIcon slot="check" size={14} /> : tool.icon, disabled: base.busy || (typeof tool.disabled === 'function' ? tool.disabled(context) : tool.disabled), onClick: () => runTool(tool, context) }; })}>
        <span className="ai-tool-chip ai-tool-more"><UiIcon slot="plus" size={15} /><span className="ai-sr-only">{c.l.moreTools}</span>{overflow.some(tool => (c.draft.tools ?? []).includes(tool.id)) && <i className="ai-tool-dot" aria-hidden="true" />}</span>
      </DropdownMenu>}
  </>;
}
/** Distribución histórica; Toolbar permite componer una barra vacía sin controles implícitos. */
function ComposerTools({ children, voice = true }: { children?: React.ReactNode; voice?: boolean }) {
  return <ComposerToolbar><ComposerToolGroup><ComposerAttachButton /><ComposerRegisteredTools />{children}</ComposerToolGroup><ComposerSpacer /><ComposerModelSelector />{voice && <ComposerVoice compact />}<ComposerSubmit /></ComposerToolbar>;
}
function ComposerVoice({ compact }: { compact?: boolean }) { const c = useComposer(); return c.onRecordAudio && c.audioAllowed ? <AIVoiceRecorder compact={compact} onRecorded={c.onRecordAudio} disabled={c.disabled || c.busy || c.pending} labels={c.labels} /> : null; }
function ComposerRoot(props: AIComposerProps) {
  const { draft, onDraftChange, onSubmit, labels, className, disabled, run, models, modelId, children } = props;
  const l = aiLabels(labels);
  const id = React.useId(); const inputId = `${id}-input`; const listId = `${id}-suggestions`;
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  const [cursor, setCursor] = React.useState(draft.text.length);
  const [index, setIndex] = React.useState(0);
  const [dismissed, setDismissed] = React.useState('');
  const [pending, setPending] = React.useState(false);
  const submitting = React.useRef(false);
  const [error, setError] = React.useState('');
  const [dragging, setDragging] = React.useState(false);
  const selection = React.useRef<{ text: string; caret: number } | null>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  const model = models?.find(item => item.id === (modelId ?? draft.modelId));
  const filesAllowed = model?.capabilities?.attachments !== false;
  const audioAllowed = model?.capabilities?.audio !== false;
  const busy = isBusy(run?.status ?? 'idle');
  const query = suggestionQuery(draft.text, Math.min(cursor, draft.text.length));
  const queryKey = query ? `${query.kind}:${query.start}:${query.query}` : '';
  let items: readonly AIMention[] = [];
  if (query && queryKey !== dismissed && !disabled && !busy) {
    const source = query.kind === 'mention' ? props.mentions : props.commands;
    try { items = (typeof source === 'function' ? source(query.query) : source ?? []).filter(item => `${item.label} ${item.id}`.toLowerCase().includes(query.query.toLowerCase())).slice(0, 12); } catch { /* Host lookup failure leaves native editing available. */ }
  }
  const active = Math.max(0, Math.min(index, items.length - 1));
  React.useEffect(() => setIndex(0), [queryKey]);
  React.useLayoutEffect(() => {
    if (selection.current) {
      if (draft.text === selection.current.text) { inputRef.current?.focus(); inputRef.current?.setSelectionRange(selection.current.caret, selection.current.caret); setCursor(selection.current.caret); }
      selection.current = null;
    }
  }, [draft.text]);
  React.useLayoutEffect(() => {
    const list = listRef.current; const item = list?.children[active] as HTMLElement | undefined;
    if (!list || !item) return;
    if (item.offsetTop < list.scrollTop) list.scrollTop = item.offsetTop;
    else if (item.offsetTop + item.offsetHeight > list.scrollTop + list.clientHeight) list.scrollTop = item.offsetTop + item.offsetHeight - list.clientHeight;
  }, [active, queryKey]);
  const choose = (which: number) => {
    const item = items[which]; if (!item || !query) return;
    const inserted = item.insertText ?? `${query.kind === 'mention' ? '@' + item.label : '/' + item.id} `;
    const text = draft.text.slice(0, query.start) + inserted + draft.text.slice(query.end);
    selection.current = { text, caret: query.start + inserted.length };
    onDraftChange({ ...draft, text, ...(query.kind === 'mention' ? { mentions: [...(draft.mentions ?? []).filter(mention => mention.id !== item.id), item] } : {}) });
    setDismissed(queryKey);
    if (query.kind === 'command') props.onCommand?.(item);
  };
  const submit = async () => {
    if (disabled || busy || submitting.current || !canSubmit(draft, model)) return;
    submitting.current = true; setPending(true); setError(''); setDismissed(queryKey);
    try { await onSubmit(draft); } catch (cause) { setError(cause instanceof Error ? cause.message : l.error); }
    finally { submitting.current = false; setPending(false); }
  };
  function receiveFiles(files: File[]) {
    if (!filesAllowed || disabled || pending) return;
    let candidates = files.filter(file => {
      if (model?.capabilities?.images === false && file.type.startsWith('image/')) return false;
      if (props.maxSizeMb !== undefined && file.size > props.maxSizeMb * 1024 * 1024) return false;
      if (!props.accept) return true;
      return props.accept.toLowerCase().split(',').map(pattern => pattern.trim()).some(pattern => pattern.startsWith('.') ? file.name.toLowerCase().endsWith(pattern) : pattern.endsWith('/*') ? file.type.toLowerCase().startsWith(pattern.slice(0, -1)) : file.type.toLowerCase() === pattern);
    });
    const max = remainingFileCount(props.maxFiles, draft.attachments.length);
    if (max !== undefined) candidates = candidates.slice(0, max);
    setError(candidates.length !== files.length ? l.rejectedFiles : '');
    if (!candidates.length) return;
    if (props.onFiles) props.onFiles(candidates);
    else onDraftChange({ ...draft, attachments: [...draft.attachments, ...candidates.map(file => ({ id: crypto.randomUUID(), name: file.name, mediaType: file.type || 'application/octet-stream', size: file.size, file, status: 'ready' as const }))] });
  }
  const context: ComposerContextValue = { ...props, l, inputId, listId, inputRef, busy, pending, filesAllowed, audioAllowed, valid: canSubmit(draft, model), items, active, cursor, setCursor, setIndex, dismiss: () => setDismissed(queryKey), choose, submit: () => void submit(), receiveFiles, rejectFiles: () => setError(l.rejectedFiles) };
  return <ComposerContext.Provider value={context}><form data-k-focus-surface="" className={cn('ai-surface ai-composer', dragging && 'ai-composer-dragging', className)} aria-label={l.writeMessage}
    onSubmit={event => { event.preventDefault(); void submit(); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDismissed(queryKey); }}
    onPaste={event => { const files = Array.from(event.clipboardData.files); if (files.length) { event.preventDefault(); receiveFiles(files); } }}
    onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true); } }}
    onDragLeave={event => { const rect = event.currentTarget.getBoundingClientRect(); if (event.clientX <= rect.left || event.clientX >= rect.right || event.clientY <= rect.top || event.clientY >= rect.bottom) setDragging(false); }}
    onDrop={event => { if (event.dataTransfer.files.length) { event.preventDefault(); setDragging(false); receiveFiles(Array.from(event.dataTransfer.files)); } }}>
    {items.length > 0 && <div className="ai-composer-suggestions" id={listId} ref={listRef} role="listbox" aria-label={l.suggestions}>{items.map((item, which) => <div role="option" id={`${listId}-${which}`} aria-selected={which === active} key={item.id} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setIndex(which)} onClick={() => choose(which)}><strong>{query?.kind === 'mention' ? '@' : '/'}{item.label}</strong>{item.description && <small>{item.description}</small>}</div>)}</div>}
    {children ?? <><ComposerAttachments /><ComposerInput /><ComposerTools /></>}
    {error && <p className="ai-error" role="alert">{error}</p>}
    {!!draft.attachments.length && !canSubmit({ ...draft, attachments: draft.attachments.map(file => ({ ...file, status: 'ready' })) }, model) && <p className="ai-error" role="alert">{l.incompatibleAttachments}</p>}
  </form></ComposerContext.Provider>;
}
export const AIComposer = Object.assign(ComposerRoot, { Input: ComposerInput, Attachments: ComposerAttachments, Tools: ComposerTools, Toolbar: ComposerToolbar, ToolGroup: ComposerToolGroup, Spacer: ComposerSpacer,
  ModelSelector: ComposerModelSelector, AttachButton: ComposerAttachButton, RegisteredTools: ComposerRegisteredTools, Submit: ComposerSubmit, Voice: ComposerVoice });
