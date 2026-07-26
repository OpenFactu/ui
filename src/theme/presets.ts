import type { ResolvedTheme, ThemeInput } from './types';
import { normalizeHex } from './derive';

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  /** Parche de tema completo: un preset puede traer radio o tipografía propios. */
  theme: ThemeInput;
}

/** Temas listos para usar. `applyPreset(id)` los aplica de una pieza. */
export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'keirost-classic',
    label: 'Keirost Clásico',
    description: 'Ink + Teal — el predeterminado del brand guide.',
    theme: { mode: 'light', colors: { primary: '#0A1628', accent: '#0D9488' } },
  },
  {
    id: 'keirost-teal',
    label: 'Teal Fuerte',
    description: 'Teal protagonista, ink secundario. Para marcas activas.',
    theme: { mode: 'light', colors: { primary: '#0D9488', accent: '#0A6E63' } },
  },
  {
    id: 'keirost-slate',
    label: 'Slate Monocromo',
    description: 'Gris neutro, sin acento de marca. Look discreto.',
    theme: { mode: 'light', colors: { primary: '#1E293B', accent: '#64748B' } },
  },
  {
    id: 'keirost-midnight',
    label: 'Midnight',
    description: 'Base oscura con acento teal. Ideal para salas de control.',
    theme: { mode: 'dark', colors: { primary: '#0A1628', accent: '#0D9488' } },
  },
  {
    id: 'keirost-carbon',
    label: 'Carbon',
    description: 'Grafito profundo con acento ámbar. Sobrio, industrial.',
    theme: { mode: 'dark', colors: { primary: '#18181B', accent: '#F59E0B' } },
  },
  {
    id: 'keirost-deep-ocean',
    label: 'Deep Ocean',
    description: 'Azul abisal con acento cyan. Fresco y tecnológico.',
    theme: { mode: 'dark', colors: { primary: '#0C1E3A', accent: '#22D3EE' } },
  },
  {
    id: 'keirost-forest',
    label: 'Forest',
    description: 'Verde bosque con acento lima. Natural, calmado.',
    theme: { mode: 'dark', colors: { primary: '#0F1F1A', accent: '#84CC16' } },
  },
  {
    id: 'keirost-plum',
    label: 'Plum',
    description: 'Ciruela oscuro con acento rosa. Elegante y contrastado.',
    theme: { mode: 'dark', colors: { primary: '#1E102C', accent: '#EC4899' } },
  },
  {
    id: 'keirost-nebula',
    label: 'Nebula',
    description: 'Azul noche con acento violeta. Inmersivo, premium.',
    theme: { mode: 'dark', colors: { primary: '#0F1430', accent: '#8B5CF6' } },
  },
];

export function themePresetById(id: string): ThemePreset | undefined {
  return THEME_PRESETS.find((p) => p.id === id);
}

/**
 * Id del preset que coincide con el tema dado, o `null` si es a medida.
 * Compara solo modo + primario + acento, que es lo que define un preset.
 */
export function detectPreset(theme: ThemeInput | ResolvedTheme): string | null {
  const mode = theme.mode ?? 'light';
  const primary = theme.colors?.primary;
  const accent = theme.colors?.accent;
  if (!primary || !accent) return null;
  const match = THEME_PRESETS.find(
    (p) =>
      p.theme.mode === mode &&
      normalizeHex(p.theme.colors!.primary!) === normalizeHex(primary) &&
      normalizeHex(p.theme.colors!.accent!) === normalizeHex(accent),
  );
  return match?.id ?? null;
}
