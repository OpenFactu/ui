import * as React from 'react';
import type { ResolvedTheme, ThemeInput, ThemeMode } from '../theme/types';
import { resolveTheme, themeToCssVars } from '../theme/tokens';
import { applyTheme } from '../theme/applyTheme';
import { detectPreset } from '../theme/presets';
import { getThemePreset, getRegisteredTokens } from '../theme/registry';

export interface ThemeContextValue {
  theme: ResolvedTheme;
  setTheme: (patch: ThemeInput | ((prev: ResolvedTheme) => ThemeInput)) => void;
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggleMode: () => void;
  applyPreset: (presetId: string) => void;
  /** Id del preset activo, o `null` si el tema es a medida. */
  activePresetId: string | null;
  /** Mapa `--variable` → valor del tema actual. */
  cssVars: Record<string, string>;
}

const ThemeCtx = React.createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  /** Tema controlado. Si se pasa, manda sobre el estado interno. */
  theme?: ThemeInput;
  /** Tema inicial cuando no está controlado. */
  defaultTheme?: ThemeInput;
  onThemeChange?: (theme: ResolvedTheme) => void;
  /** Dónde escribir las variables. Default `document.documentElement`. */
  target?: HTMLElement | null | (() => HTMLElement | null);
  applyDarkClass?: boolean;
  injectFontLink?: boolean;
  /** Clave de localStorage donde persistir. `false` (default) no persiste. */
  storageKey?: string | false;
  children: React.ReactNode;
}

function readStored(storageKey: string | false): ThemeInput | null {
  if (!storageKey || typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? (JSON.parse(raw) as ThemeInput) : null;
  } catch {
    return null;
  }
}

/**
 * Provider opcional del tema.
 *
 * Los componentes de la librería leen variables CSS, nunca este contexto, así
 * que montarlo no es obligatorio: sirve para quien quiera manejar el tema con
 * estado de React en lugar de llamar a `applyTheme()` por su cuenta.
 */
export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  theme: controlled,
  defaultTheme,
  onThemeChange,
  target,
  applyDarkClass = true,
  injectFontLink = true,
  storageKey = false,
  children,
}) => {
  const [internal, setInternal] = React.useState<ThemeInput>(
    () => readStored(storageKey) ?? defaultTheme ?? {},
  );
  const input = controlled ?? internal;
  const resolved = React.useMemo(() => resolveTheme(input), [input]);

  // useLayoutEffect: las variables tienen que estar escritas antes del pintado
  // para que no se vea un fogonazo con el tema anterior.
  React.useLayoutEffect(() => {
    const el = typeof target === 'function' ? target() : target;
    applyTheme(resolved, el ?? undefined, { applyDarkClass, injectFontLink });
    if (storageKey && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(storageKey, JSON.stringify(input));
      } catch {
        /* almacenamiento lleno o bloqueado: el tema ya está aplicado igualmente */
      }
    }
    onThemeChange?.(resolved);
  }, [resolved, target, applyDarkClass, injectFontLink, storageKey, input, onThemeChange]);

  const value = React.useMemo<ThemeContextValue>(() => {
    const setTheme: ThemeContextValue['setTheme'] = (patch) => {
      setInternal((prev) => {
        const next = typeof patch === 'function' ? patch(resolveTheme(prev)) : patch;
        return {
          ...prev,
          ...next,
          colors: { ...prev.colors, ...next.colors },
        };
      });
    };
    return {
      theme: resolved,
      setTheme,
      mode: resolved.mode,
      setMode: (mode) => setTheme({ mode }),
      toggleMode: () => setTheme({ mode: resolved.mode === 'dark' ? 'light' : 'dark' }),
      applyPreset: (presetId) => {
        // Busca en el registro, no en la lista fija: así también sirve para
        // los temas que aporte un plugin.
        const preset = getThemePreset(presetId);
        if (preset) setTheme(preset.theme);
      },
      activePresetId: detectPreset(resolved),
      cssVars: { ...themeToCssVars(resolved), ...getRegisteredTokens() },
    };
  }, [resolved]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
};

/** Lanza si no hay `ThemeProvider` por encima. */
export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeCtx);
  if (!ctx) throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  return ctx;
}

/** Devuelve `null` en lugar de lanzar cuando no hay provider. */
export function useThemeOptional(): ThemeContextValue | null {
  return React.useContext(ThemeCtx);
}

/**
 * Alias de {@link ThemeProvider} y {@link useTheme} con prefijo, para
 * aplicaciones que ya tienen su propio `ThemeProvider`/`useTheme` y necesitan
 * importar los dos en el mismo fichero durante una migración.
 */
export const UiThemeProvider = ThemeProvider;
export const useUiTheme = useTheme;
