export type CodeTokenType = 'keyword' | 'string' | 'number' | 'comment' | 'operator' | 'punctuation' | 'tag' | 'attribute';

/** UTF-16 offsets, sorted, non-overlapping, with an exclusive end. Gaps stay plain. */
export interface CodeToken {
  start: number;
  end: number;
  type: CodeTokenType;
}

export interface CodeLanguageDefinition {
  id: string;
  label: string;
  tokenize: (text: string) => readonly CodeToken[];
  keywords?: readonly string[];
  /** Characters after which Enter adds one indentation level. */
  indentAfter?: readonly string[];
  /** Opening and closing characters, for example { '(': ')' }. */
  pairs?: Readonly<Record<string, string>>;
}

export interface CodeCompletion {
  label: string;
  insertText?: string;
  detail?: string;
}

export interface CodeCompletionContext {
  value: string;
  cursor: number;
  prefix: string;
  language: CodeLanguageDefinition;
}

export interface CodeEditorColors extends Record<CodeTokenType, string> {
  background: string;
  foreground: string;
  muted: string;
  border: string;
  selection: string;
  selectionForeground: string;
  cursor: string;
  activeLine: string;
}

export type CodeEditorThemePreset = 'light' | 'dark' | 'high-contrast' | 'monokai' | 'dracula' | 'nord' | 'one-dark' | 'github-light' | 'solarized-light' | 'solarized-dark';

export interface CodeEditorTheme {
  label?: string;
  /** Defaults for any colors not supplied; auto inherits application colors. */
  base?: 'auto' | CodeEditorThemePreset;
  colors: Partial<CodeEditorColors>;
}

export type CodeEditorThemeValue = 'auto' | CodeEditorThemePreset | CodeEditorTheme;
