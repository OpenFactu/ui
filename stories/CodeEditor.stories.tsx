import * as React from 'react';
import type { Story } from '@ladle/react';
import { CodeEditor, CODE_EDITOR_THEMES, type CodeLanguageDefinition, type CodeEditorThemeValue } from '../src/components/CodeEditor';

const EXAMPLE = `interface Invoice {
  number: string;
  total: number;
}

// Calcula el total de las facturas pendientes.
const invoices: Invoice[] = [];
const total = invoices.reduce((sum, invoice) => {
  return sum + invoice.total;
}, 0);

console.log("Total", total);
`;

export const Basico: Story = () => {
  const [value, setValue] = React.useState(EXAMPLE);
  return <div className="max-w-4xl"><CodeEditor label="Código" value={value} onChange={setValue} language="typescript" defaultTheme="monokai" motion helperText="Ctrl/Espacio: sugerencias · Ctrl/F: buscar · Ctrl/Z: deshacer" /></div>;
};

export const Temas: Story = () => {
  const [value, setValue] = React.useState('const message = "Hola";\n// Un editor, varios temas.\nconsole.log(message);');
  const themes: CodeEditorThemeValue[] = ['auto', ...Object.keys(CODE_EDITOR_THEMES) as (keyof typeof CODE_EDITOR_THEMES)[]];
  return <div className="grid gap-6 max-w-5xl md:grid-cols-2">{themes.map(theme => <CodeEditor key={String(theme)} label={String(theme)} value={value} onChange={setValue} defaultTheme={theme} height={180} />)}</div>;
};

const formula: CodeLanguageDefinition = {
  id: 'formula', label: 'Fórmula', keywords: ['SUMA', 'IVA', 'TOTAL'], indentAfter: ['('], pairs: { '(': ')' },
  tokenize: text => [...text.matchAll(/\b(SUMA|IVA|TOTAL)\b/g)].map(match => ({ start: match.index!, end: match.index! + match[0].length, type: 'keyword' })),
};

export const Personalizado: Story = () => {
  const [value, setValue] = React.useState('TOTAL = SUMA(base, IVA)');
  const [theme, setTheme] = React.useState<CodeEditorThemeValue>({ label: 'Bosque', base: 'dark', colors: { background: '#10251c', keyword: '#bef264', foreground: '#f0fdf4', muted: '#b2c9bd', comment: '#b2c9bd' } });
  return <div className="max-w-3xl"><CodeEditor label="Fórmula" value={value} onChange={setValue} language="formula" languages={[formula]} theme={theme} onThemeChange={setTheme} getCompletions={() => [{ label: 'SUMA', insertText: 'SUMA()', detail: 'Función' }]} /></div>;
};

export const Lenguajes: Story = () => {
  const [language, setLanguage] = React.useState('sql');
  const [value, setValue] = React.useState('SELECT number, total\nFROM invoices\nWHERE total > 100;');
  return <div className="max-w-4xl flex flex-col gap-3"><label>Lenguaje <select aria-label="Lenguaje" value={language} onChange={event => setLanguage(event.target.value)}>{['javascript', 'typescript', 'html', 'css', 'json', 'sql', 'yaml', 'plaintext'].map(id => <option key={id}>{id}</option>)}</select></label><CodeEditor label="Código" value={value} onChange={setValue} language={language} /></div>;
};

export const Estados: Story = () => {
  const [value, setValue] = React.useState('');
  return <div className="max-w-3xl flex flex-col gap-6">
    <CodeEditor label="Vacío" value={value} onChange={setValue} placeholder="Escribe código…" height={140} />
    <CodeEditor label="Solo lectura" value={EXAMPLE} onChange={() => {}} readOnly height={140} />
    <CodeEditor label="Deshabilitado" value={EXAMPLE} onChange={() => {}} disabled height={140} />
    <CodeEditor label="Con error" value="{ invalid }" onChange={() => {}} language="json" error="Revisa la configuración antes de guardar." height={140} />
    <CodeEditor label="Solo código" value={value} onChange={setValue} minimal motion defaultTheme="monokai" height={180} />
  </div>;
};

export const DocumentoGrande: Story = () => {
  const [value, setValue] = React.useState(() => Array.from({ length: 3000 }, (_, index) => `const invoice${index} = { number: ${index}, total: 120 };`).join('\n'));
  return <div className="max-w-5xl"><CodeEditor label={`${value.split('\n').length.toLocaleString('es-ES')} líneas`} value={value} onChange={setValue} defaultTheme="monokai" motion height={440} /></div>;
};

