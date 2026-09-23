import type { ResolvedTheme, ThemeInput } from './types';
import { normalizeHex } from './derive';

export interface ThemePreset {
  id: string;
  label: string;
  description: string;
  /** Parche de tema completo: un preset puede traer radio o tipografía propios. */
  theme: ThemeInput;
}

/** Tres líneas visuales para ERP, también incluidas en THEME_PRESETS. */
export const ERP_THEME_PRESETS: ThemePreset[] = [
  {
    id: 'keirost-soft',
    label: 'Soft',
    description: 'Superficies claras, violeta, radios amplios y sombras suaves.',
    theme: {
      mode: 'light',
      colors: {
        primary: '#24243D',
        accent: '#6D28D9',
        bgApp: '#F5F5FA',
        bgCard: '#FFFFFF',
        bgSidebar: '#FFFFFF',
        bgMuted: '#F0EFF7',
        bgHover: '#EDE9FE',
        fgDefault: '#24243D',
        fgBody: '#414157',
        fgMuted: '#626278',
        fgSubtle: '#69697E',
        borderDefault: '#E4E1EF',
        borderSubtle: '#EFEDF5',
        borderStrong: '#C4BDDC',
      },
      radius: { xs: '8px', sm: '12px', md: '16px', lg: '24px' },
      typography: {
        sans: 'system-ui, -apple-system, sans-serif',
        display: 'system-ui, -apple-system, sans-serif',
      },
      shadows: {
        sm: '0 2px 8px rgb(36 36 61 / 0.04)',
        md: '0 8px 28px rgb(36 36 61 / 0.08)',
        lg: '0 20px 60px rgb(36 36 61 / 0.12)',
      },
    },
  },
  {
    id: 'keirost-ledger',
    label: 'Ledger',
    description: 'Papel cálido, títulos serif y líneas precisas. Estética editorial.',
    theme: {
      mode: 'light',
      colors: {
        primary: '#292524',
        accent: '#9A3412',
        bgApp: '#FAF8F4',
        bgCard: '#FFFEFC',
        bgSidebar: '#F3EFE7',
        bgMuted: '#F3EFE7',
        bgHover: '#ECE5D9',
        fgDefault: '#292524',
        fgBody: '#44403C',
        fgMuted: '#665E55',
        fgSubtle: '#746B61',
        borderDefault: '#D8D0C3',
        borderSubtle: '#E9E2D7',
        borderStrong: '#B5A795',
      },
      radius: 'none',
      typography: {
        sans: 'system-ui, -apple-system, sans-serif',
        display: "Georgia, 'Times New Roman', serif",
      },
      shadows: { sm: 'none', md: 'none', lg: '0 12px 32px rgb(41 37 36 / 0.12)' },
    },
  },
  {
    id: 'keirost-terminal',
    label: 'Terminal',
    description: 'Oscuro, monoespaciado y verde. Para operaciones y datos densos.',
    theme: {
      mode: 'dark',
      colors: {
        primary: '#111827',
        accent: '#4ADE80',
        bgApp: '#0B111B',
        bgCard: '#141E2C',
        bgSidebar: '#0D1520',
        bgMuted: '#101925',
        bgHover: '#1D2C3F',
        borderDefault: '#334155',
        borderSubtle: '#253246',
        borderStrong: '#64748B',
      },
      radius: 'sm',
      typography: { fontFamily: 'mono' },
      shadows: { sm: 'none', md: 'none', lg: '0 18px 40px rgb(0 0 0 / 0.4)' },
    },
  },
];

/** Catálogo completo; los presets históricos conservan su orden. */
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
  ...ERP_THEME_PRESETS,
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
