import { useResizeObserver } from '../hooks/useResizeObserver';
import * as React from 'react';
import { UiIcon } from '../icons';
import { Select } from './Select';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { cn } from '../utils';
import { CODE_LANGUAGES, tokenizeCode } from './code-editor/languages';
import { CODE_EDITOR_THEMES, editorThemeStyle } from './code-editor/themes';
import { CodeHighlight } from './code-editor/CodeHighlight';
import { CodeMotion, type CodeMotionHandle } from './code-editor/CodeMotion';
import { canvasFont } from './code-editor/metrics';
import { completeAt, EditorHistory, findMatches, indentSelection, insertNewline, insertPair, replaceRange } from './code-editor/editing';
import type { EditState } from './code-editor/editing';
import type { CodeCompletion, CodeCompletionContext, CodeEditorThemeValue, CodeLanguageDefinition } from './code-editor/types';
import { useI18n } from '../i18n/I18nProvider';

export type { CodeToken, CodeTokenType, CodeCompletion, CodeCompletionContext, CodeLanguageDefinition, CodeEditorColors, CodeEditorTheme, CodeEditorThemePreset, CodeEditorThemeValue } from './code-editor/types';
export { CODE_LANGUAGES } from './code-editor/languages';
export { CODE_EDITOR_THEMES } from './code-editor/themes';

export interface CodeEditorProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'defaultValue' | 'onChange' | 'children'> {
  value: string;
  onChange: (value: string) => void;
  /** Built-in/custom identifier, or an inline definition. Unknown ids use plain text. */
  language?: string | CodeLanguageDefinition;
  languages?: readonly CodeLanguageDefinition[];
  label?: string;
  helperText?: string;
  error?: string;
  containerClassName?: string;
  height?: React.CSSProperties['height'];
  tabSize?: number;
  theme?: CodeEditorThemeValue;
  defaultTheme?: CodeEditorThemeValue;
  onThemeChange?: (theme: CodeEditorThemeValue) => void;
  showThemeSelector?: boolean;
  /** Only the code surface: hides tools, theme selector, line numbers and status. */
  minimal?: boolean;
  /** Opt-in cursor, active-line and selection motion; respects reduced motion. */
  motion?: boolean;
  /** Optional synchronous, local completions, merged with document words/keywords. */
  getCompletions?: (context: CodeCompletionContext) => readonly CodeCompletion[];
}

const NO_LANGUAGES: readonly CodeLanguageDefinition[] = [];
const LINE_HEIGHT = 22;

function ToolButton({ children, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} onMouseDown={event => event.preventDefault()}>{children}</button>;
}

/** Native text editing with a safe, lexical highlight layer. No editor runtime or network. */
export const CodeEditor = React.forwardRef<HTMLTextAreaElement, CodeEditorProps>(function CodeEditor({
  value, onChange, language = 'javascript', languages = NO_LANGUAGES, label, helperText, error,
  id, className, containerClassName, style, height = 320, tabSize = 2,
  theme, defaultTheme = 'auto', onThemeChange, showThemeSelector = true, minimal = false, motion = false, getCompletions,
  disabled = false, readOnly = false, onKeyDown, onSelect, onScroll, onBlur, onFocus,
  onBeforeInput, onCompositionStart, onCompositionEnd, onPaste, ...textareaProps
}, forwardedRef) {
  const { messages: { codeEditor: ce }, format } = useI18n();
  const generatedId = React.useId();
  const editorId = id || generatedId;
  const helpId = `${editorId}-help`;
  const completionId = `${editorId}-completions`;
  const inputRef = React.useRef<HTMLTextAreaElement>(null);
  React.useImperativeHandle(forwardedRef, () => inputRef.current!, []);
  const clipRef = React.useRef<HTMLDivElement>(null);
  const highlightRef = React.useRef<HTMLPreElement>(null);
  const gutterRef = React.useRef<HTMLPreElement>(null);
  const activeLineRef = React.useRef<HTMLDivElement>(null);
  const motionRef = React.useRef<CodeMotionHandle>(null);
  const pointerSelectingRef = React.useRef(false);
  const findRef = React.useRef<HTMLInputElement>(null);
  const completionRef = React.useRef<HTMLDivElement>(null);
  const compositionRef = React.useRef<EditState | null>(null);
  const history = React.useRef(new EditorHistory());
  const lastValue = React.useRef(value);
  const motionValueRef = React.useRef(value);
  const previousInput = React.useRef<EditState | null>(null);
  const pending = React.useRef<EditState | null>(null);
  const cursorRef = React.useRef({ start: 0, end: 0 });
  const [cursor, setCursor] = React.useState(cursorRef.current);
  const [focused, setFocused] = React.useState(false);
  const [composing, setComposing] = React.useState(false);
  const reduceMotion = usePrefersReducedMotion();
  const forcedColors = useMediaQuery('(forced-colors: active)');
  const motionActive = motion && !reduceMotion && !forcedColors && focused && !composing && !disabled;
  const [revision, setRevision] = React.useState(0);
  const [captureTab, setCaptureTab] = React.useState(true);
  const [visible, setVisible] = React.useState({ first: 0, count: 32 });
  const motionWindowRef = React.useRef(visible);
  const visibleRef = React.useRef(visible);
  visibleRef.current = visible;
  const [internalTheme, setInternalTheme] = React.useState(defaultTheme);
  const editorTheme = theme ?? internalTheme;
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [query, setQuery] = React.useState('');
  const [replacement, setReplacement] = React.useState('');
  const [caseSensitive, setCaseSensitive] = React.useState(false);
  const [matchIndex, setMatchIndex] = React.useState(0);
  const [completion, setCompletion] = React.useState<{ from: number; to: number; items: readonly CodeCompletion[]; index: number; left: number; top: number; maxListHeight: number } | null>(null);
  const definition = typeof language === 'object' ? language : languages.find(item => item.id === language) ?? CODE_LANGUAGES.find(item => item.id === language) ?? CODE_LANGUAGES[0];
  const indentSize = Number.isFinite(tabSize) ? Math.max(1, Math.min(8, Math.round(tabSize))) : 2;
  const editable = !disabled && !readOnly;
  const tokens = React.useMemo(() => tokenizeCode(value, definition), [value, definition]);
  const matches = React.useMemo(() => searchOpen ? findMatches(value, query, caseSensitive) : [], [value, query, caseSensitive, searchOpen]);
  const activeMatch = matches.length ? Math.min(matchIndex, matches.length - 1) : -1;
  const lineStarts = React.useMemo(() => {
    const starts = [0];
    for (let i = 0; i < value.length; i++) if (value.charCodeAt(i) === 10) starts.push(i + 1);
    return starts;
  }, [value]);
  const lineCount = lineStarts.length;
  const lineNumbers = React.useMemo(() => Array.from({ length: Math.max(0, Math.min(visible.count, lineCount - visible.first)) }, (_, i) => visible.first + i + 1).join('\n'), [lineCount, visible]);
  const line = value.slice(0, cursor.start).split('\n').length;
  const column = cursor.start - value.slice(0, cursor.start).lastIndexOf('\n');

  function readState(): EditState {
    const input = inputRef.current;
    return { value: input?.value ?? value, start: input?.selectionStart ?? 0, end: input?.selectionEnd ?? 0 };
  }

  function updateCursor() {
    const state = readState();
    cursorRef.current = { start: state.start, end: state.end };
    setCursor(previous => previous.start === state.start && previous.end === state.end ? previous : cursorRef.current);
  }

  function syncLayers(snapMotion = pointerSelectingRef.current) {
    const input = inputRef.current;
    if (!input) return;
    const first = Math.max(0, Math.floor(input.scrollTop / LINE_HEIGHT) - 4);
    const count = Math.ceil(input.clientHeight / LINE_HEIGHT) + 8;
    setVisible(previous => previous.first === first && previous.count === count ? previous : { first, count });
    const offsetY = visibleRef.current.first * LINE_HEIGHT - input.scrollTop;
    if (highlightRef.current) highlightRef.current.style.transform = `translate(${-input.scrollLeft}px, ${offsetY}px)`;
    if (gutterRef.current) gutterRef.current.style.transform = `translateY(${offsetY}px)`;
    if (clipRef.current) {
      clipRef.current.style.width = `${input.clientWidth}px`;
      clipRef.current.style.height = `${input.clientHeight}px`;
    }
    if (activeLineRef.current) {
      const row = input.value.slice(0, input.selectionStart).split('\n').length - 1;
      activeLineRef.current.style.transform = `translateY(${12 + row * LINE_HEIGHT - input.scrollTop}px)`;
      activeLineRef.current.style.opacity = input.selectionStart === input.selectionEnd ? '1' : '0';
      activeLineRef.current.style.transition = snapMotion ? 'none' : '';
    }
    motionRef.current?.sync(snapMotion);
  }

  // Controlled parent updates are authoritative. Echoes of our own edits keep history.
  React.useLayoutEffect(() => {
    if (lastValue.current !== value) {
      history.current.reset();
      lastValue.current = value;
      previousInput.current = null;
      setCompletion(null);
    }
    const selection = pending.current;
    if (selection) {
      if (selection.value === value) {
        inputRef.current?.focus({ preventScroll: true });
        inputRef.current?.setSelectionRange(selection.start, selection.end);
      }
      pending.current = null;
    }
    updateCursor();
    // The scroll event first sees the previous highlight window. Its next
    // virtualized render must also snap, rather than animate recycled rows.
    const windowChanged = motionWindowRef.current !== visible;
    const textChanged = motionValueRef.current !== value;
    motionWindowRef.current = visible;
    motionValueRef.current = value;
    // Text edits must place the caret immediately after the new glyphs.
    // Animate navigation only; retargeting on every keystroke trails behind.
    syncLayers(windowChanged || textChanged || pointerSelectingRef.current);
  }, [value, revision, visible, cursor, motionActive]);

  // Al montar se sincroniza sin más; al cambiar de tamaño, recalculando las capas.
  const resized = React.useRef(false);
  useResizeObserver(() => [inputRef.current], () => { syncLayers(resized.current); resized.current = true; });

  React.useEffect(() => {
    if (!motion || !document.fonts) return;
    let mounted = true;
    const realign = () => { if (mounted) syncLayers(true); };
    document.fonts.ready.then(realign);
    document.fonts.addEventListener('loadingdone', realign);
    return () => {
      mounted = false;
      document.fonts.removeEventListener('loadingdone', realign);
    };
  }, [motion]);

  React.useEffect(() => {
    if (searchOpen) { findRef.current?.focus(); findRef.current?.select(); }
  }, [searchOpen]);

  React.useEffect(() => {
    if (disabled || readOnly) setCompletion(null);
  }, [disabled, readOnly]);

  React.useEffect(() => {
    if (!motion) return;
    const endSelection = () => { pointerSelectingRef.current = false; };
    // React onSelect deliberately waits until mouseup during a drag. Keep the
    // visual selection in sync with the browser while the pointer is down.
    const syncPointerSelection = () => {
      if (!pointerSelectingRef.current || document.activeElement !== inputRef.current) return;
      updateCursor();
      syncLayers(true);
    };
    window.addEventListener('pointerup', endSelection);
    window.addEventListener('pointercancel', endSelection);
    window.addEventListener('blur', endSelection);
    document.addEventListener('selectionchange', syncPointerSelection);
    return () => {
      window.removeEventListener('pointerup', endSelection);
      window.removeEventListener('pointercancel', endSelection);
      window.removeEventListener('blur', endSelection);
      document.removeEventListener('selectionchange', syncPointerSelection);
    };
  }, [motion]);

  React.useLayoutEffect(() => {
    const list = completionRef.current;
    const active = list?.children[completion?.index ?? -1] as HTMLElement | undefined;
    if (!list || !active) return;
    if (active.offsetTop < list.scrollTop) list.scrollTop = active.offsetTop;
    else if (active.offsetTop + active.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = active.offsetTop + active.offsetHeight - list.clientHeight;
    }
  }, [completion?.index, completion?.items]);

  function applyEdit(next: EditState, group = 'command', before = readState(), record = true) {
    if (!editable) return;
    if (record) history.current.record(before, next, group);
    lastValue.current = next.value;
    pending.current = next;
    previousInput.current = null;
    setCompletion(null);
    setRevision(version => version + 1);
    if (before.value !== next.value) onChange(next.value);
  }

  function travelHistory(redo = false) {
    if (!editable) return;
    const current = readState();
    const next = redo ? history.current.redo(current) : history.current.undo(current);
    if (next) applyEdit(next, 'command', current, false);
  }

  function openSearch() {
    setCompletion(null);
    setSearchOpen(true);
    const selected = readState();
    if (selected.start !== selected.end) { setQuery(selected.value.slice(selected.start, selected.end)); setMatchIndex(0); }
    if (searchOpen) { findRef.current?.focus(); findRef.current?.select(); }
  }

  function selectMatch(index: number, focus = false) {
    const match = matches[index];
    if (!match) return;
    setMatchIndex(index);
    const input = inputRef.current;
    if (!input) return;
    if (focus) input.focus({ preventScroll: true });
    input.setSelectionRange(match.start, match.end);
    const row = value.slice(0, match.start).split('\n').length - 1;
    input.scrollTop = Math.max(0, row * LINE_HEIGHT - input.clientHeight / 2);
    updateCursor();
    syncLayers();
  }

  function navigateMatch(delta: number) {
    if (matches.length) selectMatch((activeMatch + delta + matches.length) % matches.length);
  }

  function replaceMatches(all: boolean) {
    if (!editable || !matches.length) return;
    if (all) {
      let end = 0;
      const chunks = matches.map(match => {
        const chunk = value.slice(end, match.start) + replacement;
        end = match.end;
        return chunk;
      });
      const next = chunks.join('') + value.slice(end);
      applyEdit({ value: next, start: Math.min(cursor.start, next.length), end: Math.min(cursor.start, next.length) });
    } else {
      const match = matches[activeMatch];
      applyEdit(replaceRange(readState(), replacement, match.start, match.end));
    }
  }

  function makeCompletion(state = readState()) {
    if (!editable || state.start !== state.end) { setCompletion(null); return; }
    const result = completeAt(state.value, state.start, definition.keywords ?? []);
    const prefix = state.value.slice(result.from, state.start);
    let extras: readonly CodeCompletion[] = [];
    try { extras = getCompletions?.({ value: state.value, cursor: state.start, prefix, language: definition }) ?? []; } catch { /* Local provider failure leaves built-ins available. */ }
    const items = [...new Map([...result.items, ...extras].filter(item => item && typeof item.label === 'string').map(item => [item.label, item])).values()].slice(0, 50);
    if (!items.length) { setCompletion(null); return; }
    const input = inputRef.current!;
    const before = state.value.slice(0, state.start);
    const currentLine = before.slice(before.lastIndexOf('\n') + 1).replace(/\t/g, ' '.repeat(indentSize));
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (context) context.font = canvasFont(getComputedStyle(input));
    const x = 16 + (context?.measureText(currentLine).width ?? currentLine.length * 8) - input.scrollLeft;
    const y = 12 + before.split('\n').length * LINE_HEIGHT - input.scrollTop;
    const menuHeight = Math.min(6, items.length) * 26 + 32;
    const below = Math.max(0, input.clientHeight - y - 4);
    const above = Math.max(0, y - LINE_HEIGHT - 4);
    const placeBelow = below >= Math.min(menuHeight, 86) || below >= above;
    const maxListHeight = Math.max(34, Math.min(164, (placeBelow ? below : above) - 28));
    const actualHeight = Math.min(items.length * 26 + 8, maxListHeight) + 24;
    const preferredTop = placeBelow ? y + 4 : y - LINE_HEIGHT - actualHeight - 4;
    const top = Math.max(4, Math.min(preferredTop, input.clientHeight - actualHeight - 4));
    setCompletion({ ...result, items, index: 0, left: Math.max(4, Math.min(x, input.clientWidth - 260)), top, maxListHeight });
  }

  function acceptCompletion(index = completion?.index ?? 0) {
    if (!completion) return;
    const item = completion.items[index];
    if (item) applyEdit(replaceRange(readState(), item.insertText ?? item.label, completion.from, completion.to));
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    onKeyDown?.(event);
    if (event.defaultPrevented || compositionRef.current || event.nativeEvent.isComposing || event.keyCode === 229) return;
    previousInput.current = readState();
    const modifier = event.ctrlKey || event.metaKey;
    const key = event.key.toLowerCase();
    if (modifier && (key === 'f' || key === 'h')) { event.preventDefault(); openSearch(); return; }
    if (event.key === 'Escape') {
      if (completion) setCompletion(null);
      else if (searchOpen) setSearchOpen(false);
      else setCaptureTab(false);
      event.preventDefault();
      return;
    }
    if (completion && ['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Enter' || event.key === 'Tab') acceptCompletion();
      else setCompletion({ ...completion, index: (completion.index + (event.key === 'ArrowDown' ? 1 : -1) + completion.items.length) % completion.items.length });
      return;
    }
    if (!editable) return;
    if (modifier && (key === 'z' || key === 'y')) {
      event.preventDefault(); travelHistory(key === 'y' || event.shiftKey); return;
    }
    if (event.ctrlKey && event.code === 'Space') { event.preventDefault(); makeCompletion(); return; }
    if (modifier || event.altKey) { setCompletion(null); return; }
    if (event.key === 'Tab' && captureTab) { event.preventDefault(); applyEdit(indentSelection(readState(), indentSize, event.shiftKey)); return; }
    if (event.key === 'Enter') { event.preventDefault(); applyEdit(insertNewline(readState(), indentSize, definition.indentAfter ?? [])); return; }
    if (event.key.length === 1) {
      const paired = insertPair(readState(), event.key, definition.pairs ?? {});
      if (paired) { event.preventDefault(); applyEdit(paired); return; }
    }
    if (event.key === 'Backspace') {
      const current = readState();
      const close = definition.pairs?.[current.value[current.start - 1]];
      if (current.start === current.end && current.start > 0 && close && close === current.value[current.start]) {
        event.preventDefault(); applyEdit(replaceRange(current, '', current.start - 1, current.start + 1)); return;
      }
    }
    if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) setCompletion(null);
  }

  function changeTheme(next: CodeEditorThemeValue) {
    const input = inputRef.current;
    const selection = readState();
    const top = input?.scrollTop ?? 0;
    const left = input?.scrollLeft ?? 0;
    if (theme === undefined) setInternalTheme(next);
    onThemeChange?.(next);
    // Native select takes focus while open; return to the same code position.
    input?.focus({ preventScroll: true });
    input?.setSelectionRange(selection.start, selection.end);
    if (input) { input.scrollTop = top; input.scrollLeft = left; }
    syncLayers();
  }

  const themeId = typeof editorTheme === 'string' ? editorTheme : 'custom';
  const themeOptions = [
    { value: 'auto', label: ce.appTheme },
    ...Object.entries(CODE_EDITOR_THEMES).map(([key, preset]) => ({ value: key, label: preset.label })),
    ...(typeof editorTheme === 'object' ? [{ value: 'custom', label: editorTheme.label ?? ce.customTheme }] : []),
  ];
  const messageClass = error ? 'text-[var(--k-danger-fg)]' : 'text-[var(--fg-subtle,#657486)]';
  const description = [textareaProps['aria-describedby'], (error || helperText) && helpId, `${editorId}-keys`].filter(Boolean).join(' ');
  const keyboardHelp = captureTab ? ce.keysCapture : ce.keysRelease;
  return (
    <div className={cn('w-full min-w-0 flex flex-col gap-1.5', containerClassName)}>
      {label && <label htmlFor={editorId} className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]">{label}{textareaProps.required && <span aria-hidden="true" className="ml-0.5 text-[var(--k-danger-fg)]">*</span>}</label>}
      <div data-k-focus-surface="" className={cn('k-code-editor', className)} style={{ ...editorThemeStyle(editorTheme), tabSize: indentSize, ...style }} data-theme={themeId} data-k-code-motion={motionActive || undefined} data-disabled={disabled || undefined} data-error={!!error || undefined}>
        {!minimal && <div className="k-code-toolbar" role="toolbar" aria-label={ce.toolbar} aria-controls={editorId}>
          <span className="k-code-language">{definition.label}</span>
          <div className="k-code-tools">
            <ToolButton aria-label={ce.undo} title={ce.undoHint} disabled={!editable} onClick={() => travelHistory()}><UiIcon slot="undo-2" size={14} /></ToolButton>
            <ToolButton aria-label={ce.redo} title={ce.redoHint} disabled={!editable} onClick={() => travelHistory(true)}><UiIcon slot="redo-2" size={14} /></ToolButton>
            <ToolButton aria-label={ce.findReplace} title={ce.findReplaceHint} disabled={disabled} onClick={openSearch}><UiIcon slot="search" size={14} /></ToolButton>
          </div>
          {showThemeSelector && <div className="k-code-theme-control"><Select ariaLabel={ce.themeLabel} disabled={disabled} value={themeId} options={themeOptions}
            onChange={next => { if (next !== 'custom') changeTheme(next as CodeEditorThemeValue); }}
            dropdownClassName="k-code-theme-popup" dropdownStyle={editorThemeStyle(editorTheme)} /></div>}
        </div>}
        {searchOpen && <div className="k-code-find" onKeyDown={event => {
          if (event.key === 'Escape') { event.preventDefault(); setSearchOpen(false); inputRef.current?.focus({ preventScroll: true }); }
          if (event.key === 'Enter' && event.target === findRef.current) { event.preventDefault(); navigateMatch(event.shiftKey ? -1 : 1); }
        }}>
          <div className="k-code-find-row">
            <input ref={findRef} aria-label={ce.find} placeholder={ce.findPlaceholder} value={query} onChange={event => { setQuery(event.target.value); setMatchIndex(0); }} />
            <label className="k-code-case"><input type="checkbox" aria-label={ce.matchCase} checked={caseSensitive} onChange={event => { setCaseSensitive(event.target.checked); setMatchIndex(0); }} />{ce.matchCaseShort}</label>
            <span className="k-code-match-count" role="status">{activeMatch + 1}/{matches.length}</span>
            <ToolButton aria-label={ce.previousMatch} disabled={!matches.length} onClick={() => navigateMatch(-1)}><UiIcon slot="chevron-up" size={14} /></ToolButton>
            <ToolButton aria-label={ce.nextMatch} disabled={!matches.length} onClick={() => navigateMatch(1)}><UiIcon slot="chevron-down" size={14} /></ToolButton>
            <ToolButton aria-label={ce.closeFind} onClick={() => { setSearchOpen(false); inputRef.current?.focus({ preventScroll: true }); }}><UiIcon slot="x" size={14} /></ToolButton>
          </div>
          <div className="k-code-find-row">
            <input aria-label={ce.replaceWith} placeholder={ce.replaceWith} value={replacement} disabled={!editable} onChange={event => setReplacement(event.target.value)} />
            <ToolButton disabled={!editable || !matches.length} onClick={() => replaceMatches(false)}>{ce.replace}</ToolButton>
            <ToolButton disabled={!editable || !matches.length} onClick={() => replaceMatches(true)}>{ce.replaceAll}</ToolButton>
          </div>
        </div>}
        <div className="k-code-body">
          {!minimal && <div className="k-code-gutter" aria-hidden="true" style={{ width: `${Math.max(3, String(lineCount).length + 1)}ch` }}><pre ref={gutterRef}>{lineNumbers}</pre></div>}
          <div className="k-code-viewport">
            <div ref={clipRef} className="k-code-highlight" aria-hidden="true">
              <div ref={activeLineRef} className="k-code-active-line" />
              {motion && <CodeMotion ref={motionRef} inputRef={inputRef} highlightRef={highlightRef} clipRef={clipRef}
                start={lineStarts[visible.first] ?? value.length} stop={lineStarts[visible.first + visible.count] ?? value.length} active={motionActive} />}
              <pre ref={highlightRef} style={{ tabSize: indentSize }}><CodeHighlight value={value} tokens={tokens} matches={matches} active={activeMatch}
                start={lineStarts[visible.first] ?? value.length} stop={lineStarts[visible.first + visible.count] ?? value.length}
                selection={motionActive && cursor.start !== cursor.end ? cursor : undefined} /></pre>
            </div>
            <textarea {...textareaProps} data-k-focus-input="" ref={inputRef} id={editorId} value={value} disabled={disabled} readOnly={readOnly}
              aria-label={textareaProps['aria-label'] ?? (label ? undefined : ce.label)}
              aria-invalid={!!error || textareaProps['aria-invalid']} aria-describedby={description}
              aria-autocomplete="list" aria-controls={completion ? completionId : undefined}
              aria-activedescendant={completion ? `${completionId}-${completion.index}` : undefined}
              spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" wrap="off"
              style={{ height, tabSize: indentSize }}
              onKeyDown={handleKeyDown}
              onPointerDown={event => { pointerSelectingRef.current = true; textareaProps.onPointerDown?.(event); }}
              onBeforeInput={event => { previousInput.current = readState(); onBeforeInput?.(event); }}
              onPaste={event => { previousInput.current = readState(); setCompletion(null); onPaste?.(event); }}
              onChange={event => {
                const next = readState();
                const before = previousInput.current ?? { value: lastValue.current, ...cursorRef.current };
                if (compositionRef.current) {
                  lastValue.current = next.value;
                  onChange(next.value);
                } else {
                  const keepCompletion = !!completion;
                  const type = (event.nativeEvent as InputEvent).inputType;
                  applyEdit(next, type === 'insertText' || type === 'deleteContentBackward' ? 'typing' : 'command', before);
                  if (keepCompletion) makeCompletion(next);
                }
              }}
              onCompositionStart={event => { compositionRef.current = readState(); setComposing(true); setCompletion(null); onCompositionStart?.(event); }}
              onCompositionEnd={event => {
                const before = compositionRef.current;
                compositionRef.current = null;
                setComposing(false);
                if (before) { history.current.record(before, readState()); previousInput.current = readState(); }
                onCompositionEnd?.(event);
              }}
              onSelect={event => { updateCursor(); syncLayers(); onSelect?.(event); }}
              onScroll={event => { syncLayers(true); setCompletion(null); onScroll?.(event); }}
              onFocus={event => { setFocused(true); setCaptureTab(true); onFocus?.(event); }}
              onBlur={event => { setFocused(false); previousInput.current = null; setCompletion(null); onBlur?.(event); }} />
            {completion && <div className="k-code-completions" style={{ left: completion.left, top: completion.top }}>
              <div ref={completionRef} className="k-code-completion-list" id={completionId} role="listbox" aria-label={ce.suggestions} style={{ maxHeight: completion.maxListHeight }}>
                {completion.items.map((item, index) => <div role="option" aria-selected={index === completion.index} id={`${completionId}-${index}`} key={item.label}
                  onMouseDown={event => event.preventDefault()} onMouseEnter={() => setCompletion({ ...completion, index })} onClick={() => acceptCompletion(index)}>
                  <UiIcon slot="code-2" size={13} aria-hidden="true" className="k-code-completion-icon" /><span className="k-code-completion-label">{item.label}</span>{item.detail && <small>{item.detail}</small>}
                </div>)}
              </div>
              <div className="k-code-completion-help" aria-hidden="true"><span>{ce.completionMove}</span><span>{ce.completionInsert}</span></div>
            </div>}
          </div>
        </div>
        {!minimal ? <div className="k-code-status">
          <span>{format(ce.position, { line, column })}{readOnly ? ce.readOnly : ''}</span>
          <span id={`${editorId}-keys`}>{keyboardHelp}</span>
        </div> : <span className="sr-only" id={`${editorId}-keys`}>{keyboardHelp}</span>}
      </div>
      {(error || helperText) && <p id={helpId} className={cn('text-[11px]', messageClass)}>{error || helperText}</p>}
    </div>
  );
});
