import * as React from 'react';
import { canvasFont } from './metrics';

export interface CodeMotionHandle { sync: (snap?: boolean) => void }
interface CodeMotionProps {
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  highlightRef: React.RefObject<HTMLPreElement | null>;
  clipRef: React.RefObject<HTMLDivElement | null>;
  start: number;
  stop: number;
  active: boolean;
}

interface Position { node: Text; offset: number }

/** Resolve offsets only against the small, visible highlight window. */
function positionAt(pre: HTMLElement, offset: number): Position | null {
  const walker = document.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
  let node: Text | null;
  let remaining = offset;
  let last: Text | null = null;
  while ((node = walker.nextNode() as Text | null)) {
    if (remaining < node.length) return { node, offset: remaining };
    remaining -= node.length;
    last = node;
  }
  return last && remaining === 0 ? { node: last, offset: last.length } : null;
}

function rangeAt(pre: HTMLElement, start: number, end: number): Range | null {
  const from = positionAt(pre, start);
  const to = positionAt(pre, end);
  if (!from || !to) return null;
  const range = document.createRange();
  range.setStart(from.node, from.offset);
  range.setEnd(to.node, to.offset);
  return range;
}

const TIMING: KeyframeAnimationOptions = { duration: 100, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' };

/** Presentation only; selection, navigation and composition remain native. */
export const CodeMotion = React.forwardRef<CodeMotionHandle, CodeMotionProps>(function CodeMotion({
  inputRef, highlightRef, clipRef, start, stop, active,
}, forwardedRef) {
  const caretRef = React.useRef<HTMLDivElement>(null);
  const selectionRef = React.useRef<HTMLDivElement>(null);
  const pool = React.useRef<HTMLDivElement[]>([]);
  const animations = React.useRef(new Map<HTMLElement, Animation>());

  function hide(element: HTMLElement) {
    animations.current.get(element)?.cancel();
    animations.current.delete(element);
    element.dataset.visible = 'false';
    element.style.opacity = '0';
  }

  function place(element: HTMLElement, transform: string, snap: boolean, selection = false) {
    const visible = element.dataset.visible === 'true';
    if (visible && element.style.transform === transform) {
      if (snap) { animations.current.get(element)?.cancel(); animations.current.delete(element); }
      return;
    }
    // Read presentation before cancelling: rapid reversals continue from the
    // current on-screen position rather than the previous logical target.
    const from = visible && !snap ? getComputedStyle(element).transform : transform;
    animations.current.get(element)?.cancel();
    element.style.transform = transform;
    element.style.opacity = '1';
    element.dataset.visible = 'true';
    if (!snap && (visible || selection)) {
      const frames = visible ? [{ transform: from }, { transform }] : [{ opacity: 0.8 }, { opacity: 1 }];
      animations.current.set(element, element.animate(frames, TIMING));
    }
  }

  function sync(snap = false) {
    const input = inputRef.current;
    const pre = highlightRef.current;
    const clip = clipRef.current;
    const caret = caretRef.current;
    const layer = selectionRef.current;
    if (!input || !pre || !clip || !caret || !layer) return;
    if (!active) { hide(caret); pool.current.forEach(hide); return; }

    const viewport = clip.getBoundingClientRect();
    const scaleX = viewport.width ? clip.clientWidth / viewport.width : 1;
    const scaleY = viewport.height ? clip.clientHeight / viewport.height : 1;
    const textStyle = getComputedStyle(input);
    const lineHeight = parseFloat(textStyle.lineHeight) || 22;
    const paddingTop = parseFloat(textStyle.paddingTop) || 12;
    const from = input.selectionStart;
    const to = input.selectionEnd;

    if (from === to) {
      pool.current.forEach(hide);
      if (from < start || from > stop) { hide(caret); return; }
      const range = rangeAt(pre, from - start, from - start);
      const rect = range?.getBoundingClientRect();
      let x: number;
      let y: number;
      let height: number;
      if (rect?.height) {
        x = (rect.left - viewport.left) * scaleX;
        y = (rect.top - viewport.top) * scaleY;
        height = rect.height * scaleY;
      } else {
        // Browsers can return an empty rectangle for a collapsed range on an
        // empty/trailing blank line. Use the native textarea's line metrics.
        const before = input.value.slice(0, from);
        const currentLine = before.slice(before.lastIndexOf('\n') + 1);
        const tabSize = parseFloat(textStyle.tabSize) || 2;
        let expanded = '';
        for (const character of currentLine) expanded += character === '\t' ? ' '.repeat(tabSize - expanded.length % tabSize) : character;
        const context = document.createElement('canvas').getContext('2d');
        if (context) context.font = canvasFont(textStyle);
        x = (parseFloat(textStyle.paddingLeft) || 16) + (context?.measureText(expanded).width ?? 0) - input.scrollLeft;
        height = Math.min(lineHeight, (parseFloat(textStyle.fontSize) || 13) * 1.2);
        y = paddingTop + (before.split('\n').length - 1) * lineHeight - input.scrollTop + (lineHeight - height) / 2;
      }
      caret.style.height = `${height}px`;
      const target = `translate3d(${x}px, ${y}px, 0)`;
      const moved = caret.style.transform !== target;
      place(caret, target, snap);
      if (moved) caret.firstElementChild?.getAnimations().forEach(animation => { animation.currentTime = 0; });
      return;
    }

    hide(caret);
    const selectedStart = Math.max(from, start);
    const selectedEnd = Math.min(to, stop);
    if (selectedEnd <= selectedStart) { pool.current.forEach(hide); return; }
    const range = rangeAt(pre, selectedStart - start, selectedEnd - start);
    // Merge per-token and newline rectangles into one background per visible
    // line. The pool is bounded by the viewport, never by document length.
    const rows = new Map<number, { left: number; right: number; top: number }>();
    for (const rect of Array.from(range?.getClientRects() ?? [])) {
      if (!rect.height) continue;
      const row = Math.round(((rect.top - viewport.top) * scaleY + input.scrollTop - paddingTop) / lineHeight);
      const left = (rect.left - viewport.left) * scaleX;
      const right = left + Math.max(4, rect.width * scaleX);
      const previous = rows.get(row);
      if (previous) { previous.left = Math.min(previous.left, left); previous.right = Math.max(previous.right, right); }
      else rows.set(row, { left, right, top: paddingTop + row * lineHeight - input.scrollTop });
    }
    let index = 0;
    for (const row of rows.values()) {
      let element = pool.current[index];
      if (!element) {
        element = document.createElement('div');
        element.dataset.visible = 'false';
        layer.appendChild(element);
        pool.current.push(element);
      }
      place(element, `translate3d(${row.left}px, ${row.top}px, 0) scale(${row.right - row.left}, ${lineHeight})`, snap, true);
      index++;
    }
    for (; index < pool.current.length; index++) hide(pool.current[index]);
  }

  React.useImperativeHandle(forwardedRef, () => ({ sync }));
  React.useEffect(() => () => { animations.current.forEach(animation => animation.cancel()); }, []);

  return <>
    <div ref={selectionRef} className="k-code-motion-selection" />
    <div ref={caretRef} className="k-code-motion-caret" data-visible="false"><span /></div>
  </>;
});
