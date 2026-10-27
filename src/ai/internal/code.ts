import { CODE_LANGUAGES } from '../../components/code-editor/languages';

const ALIASES: Record<string, string> = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', yml: 'yaml', text: 'plaintext', txt: 'plaintext' };
export const resolveCodeLanguage = (language = 'plaintext') => ALIASES[language] ?? language;
export const codeLanguageDefinition = (language?: string) => CODE_LANGUAGES.find(item => item.id === resolveCodeLanguage(language)) ?? CODE_LANGUAGES[0];
export const codeExtension = (language?: string) => {
  const id = resolveCodeLanguage(language);
  return ({ javascript: 'js', typescript: 'ts', plaintext: 'txt' } as Record<string, string>)[id] ?? id.replace(/[^a-z]/g, '');
};
