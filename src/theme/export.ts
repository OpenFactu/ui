import type { ThemeInput } from './types';
import { validateTheme, type ThemeIssue } from './registry';

/** Quita lo vacío para que lo exportado sea solo lo que el tema define de verdad. */
function prune(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(prune);
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, item]) => [key, prune(item)] as const)
      .filter(([, item]) => item !== undefined && !(item && typeof item === 'object' && !Array.isArray(item) && !Object.keys(item).length));
    return entries.length ? Object.fromEntries(entries) : undefined;
  }
  return value === '' ? undefined : value;
}

/** El tema como JSON legible, listo para guardar o compartir. */
export function themeToJson(theme: ThemeInput): string {
  return JSON.stringify(prune(theme) ?? {}, null, 2);
}

export interface ThemeImport { theme?: ThemeInput; issues: ThemeIssue[] }
/**
 * Lee un tema exportado con {@link themeToJson}. Solo acepta datos: nunca ejecuta
 * nada, y devuelve los avisos de `validateTheme` para enseñarlos en la interfaz.
 */
export function themeFromJson(text: string): ThemeImport {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { return { issues: [{ level: 'error', field: 'json', message: 'No es un JSON válido.' }] }; }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { issues: [{ level: 'error', field: 'json', message: 'Se esperaba un objeto de tema.' }] };
  const theme = parsed as ThemeInput;
  const { ok, issues } = validateTheme(theme);
  return { theme: ok ? theme : undefined, issues };
}

/** Código listo para pegar: registra el tema como preset, por ejemplo desde un plugin. */
export function themeToPresetSource(preset: { id: string; label: string; description?: string; source?: string }, theme: ThemeInput): string {
  const body = themeToJson(theme).split('\n').map((line, index) => index ? `  ${line}` : line).join('\n');
  const options = preset.source ? `, { source: ${JSON.stringify(preset.source)} }` : '';
  return `import { registerThemePreset } from '@openfactu/ui';\n\nregisterThemePreset({\n  id: ${JSON.stringify(preset.id)},\n  label: ${JSON.stringify(preset.label)},\n  description: ${JSON.stringify(preset.description ?? '')},\n  theme: ${body},\n}${options});\n`;
}
