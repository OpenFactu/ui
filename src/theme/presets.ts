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
    id: 'keirost-mono',
    label: 'Blanco y Negro',
    description: 'Blanco puro y negro puro: esquinas rectas, sombras duras y foco grueso. Solo el estado conserva color.',
    theme: {
      mode: 'light',
      colors: {
        primary: '#000000',
        accent: '#000000',
        accentScale: { 50: '#f5f5f5', 100: '#e5e5e5', 500: '#000000', 600: '#262626', 900: '#000000' },
        bgApp: '#ffffff',
        bgCard: '#ffffff',
        bgSidebar: '#ffffff',
        sidebarActive: '#000000',
        bgMuted: '#f5f5f5',
        bgHover: '#ebebeb',
        fgDefault: '#000000',
        fgBody: '#1a1a1a',
        fgMuted: '#4a4a4a',
        fgSubtle: '#666666',
        borderDefault: '#cfcfcf',
        borderSubtle: '#e6e6e6',
        borderStrong: '#000000',
      },
      radius: 'none',
      shadows: {
        sm: '2px 2px 0 0 #000000',
        md: '3px 3px 0 0 #000000',
        lg: '5px 5px 0 0 #000000',
        xl: '6px 6px 0 0 #000000',
        overlay: '8px 8px 0 0 #000000',
      },
      focus: { width: 3, offset: 2, color: '#000000' },
      selection: { background: '#000000', color: '#ffffff' },
    },
  },
  {
    id: 'keirost-mono-dark',
    label: 'Negro y Blanco',
    description: 'La inversión de Blanco y Negro: negro puro, blanco como acento, esquinas rectas y foco grueso.',
    theme: {
      mode: 'dark',
      colors: {
        primary: '#000000',
        accent: '#ffffff',
        accentFg: '#000000',
        // En oscuro, 50/100 son los tonos CLAROS: los componentes los usan como texto sobre fondos oscuros (`dark:text-[var(--k-accent-100)]`).
        accentScale: { 50: '#f5f5f5', 100: '#e5e5e5', 500: '#ffffff', 600: '#d9d9d9', 900: '#ffffff' },
        bgApp: '#000000',
        bgCard: '#0a0a0a',
        bgSidebar: '#000000',
        sidebarActive: '#ffffff',
        bgMuted: '#141414',
        bgHover: '#1f1f1f',
        fgDefault: '#ffffff',
        fgBody: '#e6e6e6',
        fgMuted: '#b3b3b3',
        fgSubtle: '#8c8c8c',
        borderDefault: '#3a3a3a',
        borderSubtle: '#262626',
        borderStrong: '#ffffff',
      },
      radius: 'none',
      shadows: {
        sm: '2px 2px 0 0 #4d4d4d',
        md: '3px 3px 0 0 #4d4d4d',
        lg: '5px 5px 0 0 #4d4d4d',
        xl: '6px 6px 0 0 #4d4d4d',
        overlay: '8px 8px 0 0 #4d4d4d',
      },
      focus: { width: 3, offset: 2, color: '#ffffff' },
      selection: { background: '#ffffff', color: '#000000' },
    },
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
  {
    id: 'keirost-glass-aurora',
    label: 'Cristal Aurora',
    description: 'Cristal oscuro sobre una aurora violeta y turquesa.',
    theme: {
      mode: 'dark',
      colors: { primary: '#0d0a24', accent: '#8b7bff' },
      radius: 'lg',
      material: { blur: 22, alpha: 0.58, saturate: 1.5, border: 'rgb(255 255 255 / 0.16)', highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.14)' },
      backdrop: 'radial-gradient(60% 55% at 12% 8%, #4c2fb8 0%, transparent 70%), radial-gradient(50% 50% at 88% 14%, #0e8f9c 0%, transparent 70%), radial-gradient(60% 60% at 70% 100%, #a1306c 0%, transparent 70%), #0d0a24',
      backdropMotion: 'drift',
      focus: { width: 2, offset: 2, color: '#b7aeff' },
      selection: { background: '#5b4bd6', color: '#ffffff' },
      motion: { speed: 'normal', easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    },
  },
  {
    id: 'keirost-glass-frost',
    label: 'Cristal Escarcha',
    description: 'Cristal claro, translúcido, sobre un degradado frío.',
    theme: {
      mode: 'light',
      colors: { primary: '#10223f', accent: '#2f6fed' },
      radius: 'lg',
      material: { blur: 18, alpha: 0.7, saturate: 1.35, border: 'rgb(255 255 255 / 0.65)', highlight: 'inset 0 1px 0 rgb(255 255 255 / 0.8)' },
      backdrop: 'radial-gradient(55% 50% at 10% 0%, #c7dcff 0%, transparent 70%), radial-gradient(50% 50% at 95% 10%, #d9ccff 0%, transparent 70%), radial-gradient(60% 55% at 60% 100%, #bfeee5 0%, transparent 70%), #eef3fb',
      focus: { width: 2, offset: 2 },
      selection: { background: '#cfe0ff', color: '#10223f' },
      motion: { speed: 'normal', easing: 'cubic-bezier(0.23, 1, 0.32, 1)' },
    },
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
