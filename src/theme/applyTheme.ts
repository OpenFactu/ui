import type { ResolvedTheme, ThemeInput } from './types';
import { resolveTheme, themeToAttrs, themeToCssVars } from './tokens';
import { fontOptionFor, googleFontsUrl } from './fonts';
import { getRegisteredTokens } from './registry';

export interface ApplyThemeOptions {
  /** Alterna la clase `dark` en el elemento. Default true. */
  applyDarkClass?: boolean;
  /** Inyecta el `<link>` de Google Fonts de la tipografía elegida. Default true. */
  injectFontLink?: boolean;
  /**
   * Fija también `style.background` en modo oscuro, para que el navegador no
   * enseñe el fondo claro entre el primer paint y el pintado del layout.
   * Default true (solo aplica cuando el destino es `<html>`).
   */
  setBackground?: boolean;
  /**
   * Funde el cambio de tema en lugar de saltar. `true` usa 280 ms; un número fija los
   * milisegundos. No hace nada con movimiento reducido ni cuando el tema pone `motion.speed: 'none'`.
   */
  transition?: boolean | number;
}

const FONT_LINK_ATTR = 'data-openfactu-font';
const THEME_ATTRS = ['data-k-material', 'data-k-backdrop', 'data-k-backdrop-motion', 'data-k-focus', 'data-k-selection'];

function syncFontLink(fontFamily: string): void {
  if (typeof document === 'undefined') return;
  const url = googleFontsUrl(fontOptionFor(fontFamily));
  let link = document.head.querySelector<HTMLLinkElement>(`link[${FONT_LINK_ATTR}]`);
  if (url) {
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.setAttribute(FONT_LINK_ATTR, '');
      document.head.appendChild(link);
    }
    if (link.href !== url) link.href = url;
  } else if (link) {
    link.remove();
  }
}

const TRANSITION_CLASS = 'k-theme-transition';
const transitionTimers = new WeakMap<HTMLElement, ReturnType<typeof setTimeout>>();
/** Activa durante un instante la clase que anima colores, bordes y sombras (ver `material.css`). */
function startTransition(el: HTMLElement, theme: ResolvedTheme, ms: number): void {
  if (theme.motion.speed === 0 || typeof window === 'undefined' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  el.style.setProperty('--k-theme-transition', `${Math.round(ms * theme.motion.speed)}ms`);
  el.classList.add(TRANSITION_CLASS);
  clearTimeout(transitionTimers.get(el));
  transitionTimers.set(el, setTimeout(() => { el.classList.remove(TRANSITION_CLASS); el.style.removeProperty('--k-theme-transition'); }, ms * theme.motion.speed + 80));
}

/**
 * Escribe un tema como variables CSS sobre un elemento y devuelve el tema ya
 * resuelto. Es idempotente: llamarla dos veces con lo mismo no acumula estado.
 *
 * ```ts
 * applyTheme({ mode: 'dark', colors: { primary: '#1E102C', accent: '#EC4899' } });
 * ```
 *
 * Sin `target` escribe en `<html>`, que es lo habitual. Pasando un elemento se
 * tematiza solo ese subárbol, útil para previsualizar un tema dentro de la
 * propia interfaz.
 */
export function applyTheme(
  theme: ThemeInput | ResolvedTheme,
  target?: HTMLElement | null,
  options: ApplyThemeOptions = {},
): ResolvedTheme {
  const { applyDarkClass = true, injectFontLink = true, setBackground = true, transition = false } = options;

  const resolved = isResolved(theme) ? theme : resolveTheme(theme);
  if (typeof document === 'undefined') return resolved;

  const el = target ?? document.documentElement;
  const isRoot = el === document.documentElement;
  el.style.colorScheme = resolved.mode;
  if (transition) startTransition(el, resolved, typeof transition === 'number' ? transition : 280);

  // Los tokens de plugins van los últimos: pueden añadir variables propias y
  // también pisar una de la librería si lo necesitan.
  const vars = { ...themeToCssVars(resolved), ...getRegisteredTokens() };
  for (const [key, value] of Object.entries(vars)) {
    el.style.setProperty(key, value);
  }

  if (applyDarkClass) el.classList.toggle('dark', resolved.mode === 'dark');
  if (injectFontLink && isRoot) syncFontLink(resolved.typography.fontFamily);
  // Los atributos activan `material.css`; se sincronizan siempre, para que cambiar
  // de un tema de cristal a uno plano lo apague.
  for (const name of THEME_ATTRS) el.removeAttribute(name);
  for (const [name, value] of Object.entries(themeToAttrs(resolved))) el.setAttribute(name, value);
  if (setBackground && isRoot) {
    // Con fondo propio manda la hoja de estilos (`html[data-k-backdrop]`), no el color plano.
    if (resolved.backdrop === 'none' && resolved.mode === 'dark') el.style.background = resolved.colors.bgApp;
    else el.style.removeProperty('background');
  }

  return resolved;
}

/** Retira las variables inline puestas por {@link applyTheme}. */
export function clearTheme(target?: HTMLElement | null): void {
  if (typeof document === 'undefined') return;
  const el = target ?? document.documentElement;
  for (const key of Object.keys(themeToCssVars(resolveTheme()))) {
    el.style.removeProperty(key);
  }
  el.style.removeProperty('background');
  for (const name of THEME_ATTRS) el.removeAttribute(name);
}

function isResolved(theme: ThemeInput | ResolvedTheme): theme is ResolvedTheme {
  return (
    'zIndex' in theme &&
    !!theme.zIndex &&
    typeof (theme as ResolvedTheme).zIndex.modal === 'number' &&
    'radius' in theme &&
    typeof (theme as ResolvedTheme).radius?.xs === 'string'
  );
}
