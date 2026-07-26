import type { ResolvedTheme, ThemeInput } from './types';
import { THEME_PRESETS, type ThemePreset } from './presets';
import { resolveTheme } from './tokens';
import { contrastRatio, hexToRgb, isValidHex, normalizeHex } from './derive';

/**
 * Registro de temas y tokens.
 *
 * Los temas integrados son solo la semilla: un plugin puede aportar los suyos
 * en tiempo de ejecución sin tocar la librería ni recompilar nada.
 *
 * ```ts
 * const baja = registerThemePreset({
 *   id: 'acme-corporativo',
 *   label: 'Acme corporativo',
 *   description: 'Azul de marca sobre fondo claro.',
 *   theme: { mode: 'light', colors: { primary: '#123456', accent: '#0aa' } },
 * }, { source: 'plugin-acme' });
 *
 * baja(); // al desactivar el plugin
 * ```
 */

export interface RegisteredThemePreset extends ThemePreset {
  /** Quién lo aportó. Los integrados llevan 'builtin'. */
  source: string;
}

type Listener = () => void;

const registered = new Map<string, RegisteredThemePreset>();
const listeners = new Set<Listener>();

/** Tokens extra por espacio de nombres, para que un plugin pueda quitar los suyos. */
const tokenNamespaces = new Map<string, Record<string, string>>();

function notify(): void {
  for (const listener of listeners) listener();
}

export interface RegisterThemeOptions {
  /** Identificador de quien registra; sirve para dar de baja en bloque. */
  source?: string;
  /** Sustituye un id ya registrado en lugar de avisar. Default false. */
  replace?: boolean;
}

/**
 * Añade un tema al catálogo. Devuelve la función de baja, para poder llamarla
 * al desactivar el plugin.
 */
export function registerThemePreset(
  preset: ThemePreset,
  { source = 'plugin', replace = false }: RegisterThemeOptions = {},
): () => void {
  if (THEME_PRESETS.some((p) => p.id === preset.id)) {
    console.warn(
      `[openfactu/ui] El tema «${preset.id}» choca con uno integrado; usa otro id.`,
    );
    return () => {};
  }
  if (registered.has(preset.id) && !replace) {
    console.warn(`[openfactu/ui] El tema «${preset.id}» ya estaba registrado; se ignora.`);
    return () => {};
  }

  const report = validateTheme(preset.theme);
  for (const issue of report.issues) {
    if (issue.level === 'error') {
      console.error(`[openfactu/ui] Tema «${preset.id}»: ${issue.message}`);
    } else {
      console.warn(`[openfactu/ui] Tema «${preset.id}»: ${issue.message}`);
    }
  }
  if (!report.ok) return () => {};

  registered.set(preset.id, { ...preset, source });
  notify();
  return () => unregisterThemePreset(preset.id);
}

export function unregisterThemePreset(id: string): void {
  if (registered.delete(id)) notify();
}

/** Da de baja de golpe todo lo aportado por una misma fuente. */
export function unregisterThemeSource(source: string): void {
  let changed = false;
  for (const [id, preset] of registered) {
    if (preset.source === source) {
      registered.delete(id);
      changed = true;
    }
  }
  if (changed) notify();
}

/** Catálogo completo: primero los integrados, después los registrados. */
export function getThemePresets(): RegisteredThemePreset[] {
  return [
    ...THEME_PRESETS.map((p) => ({ ...p, source: 'builtin' })),
    ...registered.values(),
  ];
}

export function getThemePreset(id: string): RegisteredThemePreset | undefined {
  return getThemePresets().find((p) => p.id === id);
}

/** Avisa cuando entra o sale un tema, para repintar el selector. */
export function subscribeThemePresets(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// ── Tokens aportados por plugins ────────────────────────────────────────

/**
 * Registra variables CSS propias de un plugin. Se aplican después de las de la
 * librería, así que también sirven para sobreescribir un token concreto.
 *
 * ```ts
 * registerTokens('plugin-acme', { '--acme-sidebar-width': '280px' });
 * ```
 */
export function registerTokens(
  namespace: string,
  vars: Record<string, string | number>,
): () => void {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(vars)) {
    normalized[key.startsWith('--') ? key : `--${key}`] = String(value);
  }
  tokenNamespaces.set(namespace, normalized);
  notify();
  return () => unregisterTokens(namespace);
}

export function unregisterTokens(namespace: string): void {
  if (tokenNamespaces.delete(namespace)) notify();
}

/** Todos los tokens registrados, ya mezclados. Lo consume `applyTheme`. */
export function getRegisteredTokens(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const vars of tokenNamespaces.values()) Object.assign(out, vars);
  return out;
}

// ── Validación ──────────────────────────────────────────────────────────

export interface ThemeIssue {
  level: 'error' | 'warning';
  field: string;
  message: string;
}

export interface ThemeValidation {
  ok: boolean;
  issues: ThemeIssue[];
  resolved?: ResolvedTheme;
}

/** Contraste mínimo del texto sobre su fondo (WCAG AA para texto normal). */
const MIN_TEXT_CONTRAST = 4.5;
/** Mínimo para elementos no textuales, como bordes o marcas. */
const MIN_UI_CONTRAST = 3;

/**
 * Comprueba que un tema es aplicable y que se va a poder leer.
 *
 * Los colores mal formados son error (el tema no se registra); los problemas
 * de contraste son aviso, porque a veces son deliberados y el consumidor puede
 * corregirlos con `colors.accentFg` y compañía.
 */
export function validateTheme(theme: ThemeInput): ThemeValidation {
  const issues: ThemeIssue[] = [];
  const colors = theme.colors ?? {};

  for (const [field, value] of Object.entries(colors)) {
    if (typeof value !== 'string') continue;
    if (!isValidHex(normalizeHex(value))) {
      issues.push({
        level: 'error',
        field: `colors.${field}`,
        message: `«${value}» no es un color hexadecimal válido.`,
      });
    }
  }
  if (issues.some((i) => i.level === 'error')) return { ok: false, issues };

  if (!colors.primary || !colors.accent) {
    issues.push({
      level: 'error',
      field: 'colors',
      message: 'Faltan `primary` y/o `accent`, que son los dos únicos obligatorios.',
    });
    return { ok: false, issues };
  }

  const resolved = resolveTheme(theme);
  const pair = (fg: string, bg: string) => contrastRatio(hexToRgb(fg), hexToRgb(bg));

  const checks: Array<[string, number, number, string]> = [
    ['colors.fgDefault', pair(resolved.colors.fgDefault, resolved.colors.bgCard), MIN_TEXT_CONTRAST, 'el texto principal sobre las tarjetas'],
    ['colors.fgBody', pair(resolved.colors.fgBody, resolved.colors.bgCard), MIN_TEXT_CONTRAST, 'el texto corriente sobre las tarjetas'],
    ['colors.fgSubtle', pair(resolved.colors.fgSubtle, resolved.colors.bgCard), MIN_TEXT_CONTRAST, 'el texto atenuado sobre las tarjetas'],
    ['colors.accentFg', pair(resolved.colors.accentFg, resolved.colors.accent), MIN_TEXT_CONTRAST, 'el texto sobre el color de acento'],
    ['colors.primaryFg', pair(resolved.colors.primaryFg, resolved.colors.primary), MIN_TEXT_CONTRAST, 'el texto sobre el color primario'],
    ['colors.borderDefault', pair(resolved.colors.borderDefault, resolved.colors.bgCard), 1.3, 'los bordes sobre las tarjetas'],
    ['colors.accent', pair(resolved.colors.accent, resolved.colors.bgCard), MIN_UI_CONTRAST, 'el acento sobre las tarjetas'],
  ];

  for (const [field, ratio, min, what] of checks) {
    if (ratio < min) {
      issues.push({
        level: 'warning',
        field,
        message: `${what} queda en ${ratio.toFixed(2)}:1, por debajo de ${min}:1.`,
      });
    }
  }

  return { ok: true, issues, resolved };
}
