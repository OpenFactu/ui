import type { CSSProperties } from 'react';
import type { CodeEditorColors, CodeEditorThemePreset, CodeEditorThemeValue } from './types';

export const CODE_EDITOR_THEMES: Readonly<Record<CodeEditorThemePreset, { label: string; mode: 'light' | 'dark'; colors: CodeEditorColors }>> = {
  light: {
    label: 'Claro',
    mode: 'light',
    colors: {
      background: '#ffffff', foreground: '#172033', muted: '#52606f', border: '#cbd5e1',
      selection: '#bdd8ff', selectionForeground: '#172033', cursor: '#172033', activeLine: '#f4f7fa',
      keyword: '#6639a6', string: '#14643b', number: '#89510c', comment: '#52606f',
      operator: '#87344a', punctuation: '#44546a', tag: '#92354f', attribute: '#275b8e',
    },
  },
  dark: {
    label: 'Oscuro',
    mode: 'dark',
    colors: {
      background: '#101923', foreground: '#e2e8f0', muted: '#a4b3c5', border: '#3e5066',
      selection: '#334e70', selectionForeground: '#ffffff', cursor: '#e2e8f0', activeLine: '#172432',
      keyword: '#c4b5fd', string: '#86d9a4', number: '#f7c57c', comment: '#a4b3c5',
      operator: '#f4a7be', punctuation: '#b7c7db', tag: '#f4a7be', attribute: '#89c9f5',
    },
  },
  'high-contrast': {
    label: 'Alto contraste',
    mode: 'dark',
    colors: {
      background: '#000000', foreground: '#ffffff', muted: '#c8c8c8', border: '#ffffff',
      selection: '#ffff00', selectionForeground: '#000000', cursor: '#ffffff', activeLine: '#191919',
      keyword: '#ffff00', string: '#80ff80', number: '#ffffff', comment: '#c8c8c8',
      operator: '#ffb4ed', punctuation: '#ffffff', tag: '#80ffff', attribute: '#ffdf80',
    },
  },
  // Classic palettes adapted for small-text AA, including comments and the active line.
  monokai: {
    label: 'Monokai', mode: 'dark',
    colors: {
      background: '#272822', foreground: '#f8f8f2', muted: '#b6b29a', border: '#626454',
      selection: '#494b40', selectionForeground: '#f8f8f2', cursor: '#f8f8f0', activeLine: '#32332b',
      keyword: '#ff6b9d', string: '#e6db74', number: '#c7a4ff', comment: '#b6b29a',
      operator: '#ff6b9d', punctuation: '#f8f8f2', tag: '#ff6b9d', attribute: '#a6e22e',
    },
  },
  dracula: {
    label: 'Dracula', mode: 'dark',
    colors: {
      background: '#282a36', foreground: '#f8f8f2', muted: '#a9b4d9', border: '#6272a4',
      selection: '#44475a', selectionForeground: '#f8f8f2', cursor: '#f8f8f2', activeLine: '#333544',
      keyword: '#ff79c6', string: '#f1fa8c', number: '#bd93f9', comment: '#a9b4d9',
      operator: '#ff79c6', punctuation: '#f8f8f2', tag: '#ff79c6', attribute: '#50fa7b',
    },
  },
  nord: {
    label: 'Nord', mode: 'dark',
    colors: {
      background: '#2e3440', foreground: '#eceff4', muted: '#acb8ce', border: '#66758d',
      selection: '#4c566a', selectionForeground: '#eceff4', cursor: '#eceff4', activeLine: '#3b4252',
      keyword: '#a4c6e3', string: '#a3be8c', number: '#d6b1d1', comment: '#acb8ce',
      operator: '#a4c6e3', punctuation: '#eceff4', tag: '#88c0d0', attribute: '#8fbcbb',
    },
  },
  'one-dark': {
    label: 'One Dark', mode: 'dark',
    colors: {
      background: '#282c34', foreground: '#d4d9e2', muted: '#abb3c2', border: '#606b80',
      selection: '#424b5b', selectionForeground: '#f4f6fa', cursor: '#61afef', activeLine: '#333943',
      keyword: '#d4a0eb', string: '#a6cf8e', number: '#e8bc90', comment: '#abb3c2',
      operator: '#78cbd8', punctuation: '#d4d9e2', tag: '#f0959e', attribute: '#e5c07b',
    },
  },
  'github-light': {
    label: 'GitHub Light', mode: 'light',
    colors: {
      background: '#ffffff', foreground: '#24292f', muted: '#57606a', border: '#d0d7de',
      selection: '#c8e1ff', selectionForeground: '#24292f', cursor: '#0969da', activeLine: '#f6f8fa',
      keyword: '#cf222e', string: '#0a3069', number: '#0550ae', comment: '#57606a',
      operator: '#cf222e', punctuation: '#24292f', tag: '#116329', attribute: '#953800',
    },
  },
  'solarized-light': {
    label: 'Solarized Light', mode: 'light',
    colors: {
      background: '#fdf6e3', foreground: '#4b6269', muted: '#566c73', border: '#b7baa7',
      selection: '#e3d9bb', selectionForeground: '#073642', cursor: '#073642', activeLine: '#eee8d5',
      keyword: '#5e7000', string: '#147370', number: '#b03a74', comment: '#566c73',
      operator: '#7b6700', punctuation: '#4b6269', tag: '#1d6d9c', attribute: '#9c561b',
    },
  },
  'solarized-dark': {
    label: 'Solarized Dark', mode: 'dark',
    colors: {
      background: '#002b36', foreground: '#c4ceca', muted: '#9bb1b5', border: '#52767c',
      selection: '#205462', selectionForeground: '#fdf6e3', cursor: '#fdf6e3', activeLine: '#073642',
      keyword: '#b4ba49', string: '#63b4a7', number: '#e38bb4', comment: '#9bb1b5',
      operator: '#d1ac45', punctuation: '#c4ceca', tag: '#68afd4', attribute: '#e49760',
    },
  },
};

const AUTO_COLORS: CodeEditorColors = {
  background: 'var(--bg-card,#ffffff)', foreground: 'var(--fg-default,#0a1628)',
  muted: 'var(--fg-subtle,#657486)', border: 'var(--border-default,#e2e8f0)',
  selection: 'var(--color-accent,#0d9488)', selectionForeground: 'var(--k-accent-on,#0f172a)',
  cursor: 'var(--fg-default,#0a1628)', activeLine: 'var(--bg-hover,#f1f5f9)',
  keyword: 'var(--fg-default,#0a1628)', string: 'var(--k-success-fg,#15803d)',
  number: 'var(--k-warning-fg,#b45309)', comment: 'var(--fg-subtle,#657486)',
  operator: 'var(--k-danger-fg,#b91c1c)', punctuation: 'var(--fg-body,#2d3a4a)',
  tag: 'var(--k-info-fg,#1d4ed8)', attribute: 'var(--fg-body,#2d3a4a)',
};

export function editorThemeStyle(theme: CodeEditorThemeValue): CSSProperties {
  const base = typeof theme === 'string' ? theme : theme.base ?? 'auto';
  const colors = { ...(base === 'auto' ? AUTO_COLORS : CODE_EDITOR_THEMES[base].colors), ...(typeof theme === 'object' ? theme.colors : {}) };
  const style: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) {
    // Public colors use camelCase; CSS stays private to this component.
    style['--ce-' + key.replace(/[A-Z]/g, letter => '-' + letter.toLowerCase())] = value;
  }
  if (base !== 'auto') style.colorScheme = CODE_EDITOR_THEMES[base].mode;
  return style as CSSProperties;
}
