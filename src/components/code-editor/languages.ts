import type { CodeLanguageDefinition, CodeToken, CodeTokenType } from './types';

const JS = 'async await break case catch class const continue debugger default delete do else export extends false finally for from function get if import in instanceof let new null of return set static super switch this throw true try typeof undefined var void while with yield';
const TS = JS + ' abstract any as asserts boolean constructor declare enum implements infer interface is keyof module namespace never number private protected public readonly require satisfies string symbol type unknown';
const SQL = 'SELECT FROM WHERE AS JOIN LEFT RIGHT INNER OUTER ON GROUP BY ORDER HAVING LIMIT OFFSET INSERT INTO VALUES UPDATE SET DELETE CREATE ALTER DROP TABLE INDEX VIEW DISTINCT UNION ALL NULL TRUE FALSE AND OR NOT IN IS LIKE BETWEEN CASE WHEN THEN ELSE END ASC DESC WITH RETURNING PRIMARY KEY DEFAULT REFERENCES';
const PAIRS = { '(': ')', '[': ']', '{': '}', '"': '"', "'": "'" };

function lexer(id: string, keywords: readonly string[]) {
  const words = new Set(keywords.map(word => word.toLowerCase()));
  // One left-to-right pass: quoted strings take precedence over comment markers.
  const blockComment = /\/\*[\s\S]*?(?:\*\/|$)/;
  const comments = id === 'javascript' || id === 'typescript' ? [blockComment.source, /\/\/[^\n]*/.source]
    : id === 'css' ? [blockComment.source]
    : id === 'sql' ? [blockComment.source, /--[^\n]*/.source]
    : id === 'yaml' ? [/#[^\n]*/.source] : [];
  const strings = /"(?:\\[\s\S]|[^"\\])*(?:"|$)|'(?:\\[\s\S]|[^'\\])*(?:'|$)|`(?:\\[\s\S]|[^`\\])*(?:`|$)/;
  const identifiers = id === 'css' || id === 'yaml' ? /[A-Za-z_$-][\w$-]*/ : /[A-Za-z_$][\w$]*/;
  const pattern = id === 'html'
    ? /<!--[\s\S]*?(?:-->|$)|<\/?[\w:-]+|\b[\w:-]+(?=\s*=)|"(?:\\.|[^"\\])*(?:"|$)|'(?:\\.|[^'\\])*(?:'|$)|\/?>|=/g
    : new RegExp([
      ...comments, strings.source,
      ...(id === 'css' ? [/#[\da-fA-F]{3,8}\b/.source] : []),
      /\b(?:0[xX][\da-fA-F]+|\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)\b/.source,
      identifiers.source, /[{}()[\],;:.]/.source, /[+*=!<>?&|%/~^-]+/.source,
    ].join('|'), 'g');
  return (text: string): CodeToken[] => {
    const result: CodeToken[] = [];
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text))) {
      const token = match[0];
      let type: CodeTokenType | undefined;
      if (id === 'html') {
        type = token.startsWith('<!--') ? 'comment' : token.startsWith('<') ? 'tag' : /^["']/.test(token) ? 'string' : /^[\w:-]/.test(token) ? 'attribute' : 'punctuation';
      } else {
        const comment = token.startsWith('/*') || (token.startsWith('//') && ['javascript', 'typescript'].includes(id)) ||
          (token.startsWith('--') && id === 'sql') || (token.startsWith('#') && id === 'yaml');
        if (comment) type = 'comment';
        else if (/^["'`]/.test(token)) type = 'string';
        else if (/^\d/.test(token) || (id === 'css' && token.startsWith('#'))) type = 'number';
        else if (words.has(token.toLowerCase())) type = 'keyword';
        else if (id === 'css' && /^[\w-]+$/.test(token) && /^\s*:/.test(text.slice(pattern.lastIndex))) type = 'attribute';
        else if (id === 'yaml' && /^[\w-]+$/.test(token) && /^\s*:/.test(text.slice(pattern.lastIndex))) type = 'attribute';
        else if (/^[{}()[\],;:.]/.test(token)) type = 'punctuation';
        else if (/^[+*=!<>?&|%/~^-]/.test(token)) type = 'operator';
      }
      if (type) result.push({ start: match.index, end: pattern.lastIndex, type });
    }
    return result;
  };
}

const definition = (id: string, label: string, words = ''): CodeLanguageDefinition => {
  const keywords = words.split(' ').filter(Boolean);
  return { id, label, keywords, tokenize: lexer(id, keywords), pairs: PAIRS, indentAfter: ['{', '[', '('] };
};

export const CODE_LANGUAGES: readonly CodeLanguageDefinition[] = [
  { id: 'plaintext', label: 'Texto plano', tokenize: () => [], keywords: [], pairs: {}, indentAfter: [] },
  { ...definition('javascript', 'JavaScript', JS), pairs: { ...PAIRS, '`': '`' } },
  { ...definition('typescript', 'TypeScript', TS), pairs: { ...PAIRS, '`': '`' } },
  definition('html', 'HTML'),
  definition('css', 'CSS', 'important inherit initial unset auto none block flex grid solid'),
  definition('json', 'JSON', 'true false null'),
  { ...definition('sql', 'SQL', SQL), indentAfter: ['('] },
  { ...definition('yaml', 'YAML', 'true false null yes no'), indentAfter: [':', '-'] },
];

const TOKEN_TYPES = new Set<CodeTokenType>(['keyword', 'string', 'number', 'comment', 'operator', 'punctuation', 'tag', 'attribute']);

/** A bad consumer grammar degrades to editable plain text, never broken markup. */
export function tokenizeCode(text: string, language: CodeLanguageDefinition): readonly CodeToken[] {
  try {
    const tokens = language.tokenize(text);
    if (!Array.isArray(tokens)) return [];
    let end = 0;
    for (const token of tokens) {
      if (!token || !Number.isInteger(token.start) || !Number.isInteger(token.end) ||
        token.start < end || token.end <= token.start || token.end > text.length || !TOKEN_TYPES.has(token.type)) return [];
      end = token.end;
    }
    return tokens;
  } catch { return []; }
}
