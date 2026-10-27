import * as React from 'react';
import type { CodeToken } from './types';
import type { CodeMatch } from './editing';

function firstEndingAfter(ranges: readonly { end: number }[], position: number) {
  let low = 0;
  let high = ranges.length;
  while (low < high) {
    const mid = (low + high) >>> 1;
    if (ranges[mid].end <= position) low = mid + 1;
    else high = mid;
  }
  return low;
}

export const CodeHighlight = React.memo(function CodeHighlight({ value, tokens, matches, active, start, stop, selection }: {
  value: string;
  tokens: readonly CodeToken[];
  matches: readonly CodeMatch[];
  active: number;
  start: number;
  stop: number;
  selection?: CodeMatch;
}) {
  const pieces: React.ReactNode[] = [];
  let position = start;
  let tokenIndex = firstEndingAfter(tokens, start);
  let matchIndex = firstEndingAfter(matches, start);
  while (position < stop && pieces.length < 1500) {
    while (tokens[tokenIndex]?.end <= position) tokenIndex++;
    while (matches[matchIndex]?.end <= position) matchIndex++;
    const token = tokens[tokenIndex];
    const match = matches[matchIndex];
    const inToken = token && token.start <= position;
    const inMatch = match && match.start <= position;
    const selected = selection && selection.start <= position && selection.end > position;
    const end = Math.min(
      token ? (inToken ? token.end : token.start) : stop,
      match ? (inMatch ? match.end : match.start) : stop,
      stop,
      selection && selection.start > position ? selection.start : selection && selection.end > position ? selection.end : stop,
    );
    pieces.push(
      <span key={position} data-token={inToken ? token.type : undefined}
        data-match={inMatch ? (matchIndex === active ? 'active' : 'match') : undefined}
        data-selection={selected || undefined}
        style={inToken ? { color: `var(--ce-${token.type})` } : undefined}>
        {value.slice(position, end)}
      </span>,
    );
    position = end;
  }
  // Very long minified lines remain readable without creating unbounded DOM.
  if (position < stop) {
    const boundaries = [...new Set([position, stop, ...(selection ? [Math.max(position, Math.min(stop, selection.start)), Math.max(position, Math.min(stop, selection.end))] : [])])].sort((a, b) => a - b);
    for (let i = 0; i < boundaries.length - 1; i++) {
      const from = boundaries[i];
      pieces.push(<span key={from} data-selection={selection && selection.start <= from && selection.end > from || undefined}>{value.slice(from, boundaries[i + 1])}</span>);
    }
  }
  return <>{pieces}{'\n'}</>;
});
