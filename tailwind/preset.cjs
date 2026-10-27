/**
 * @openfactu/ui — preset de Tailwind.
 *
 *   // tailwind.config.js
 *   const uiPreset = require('@openfactu/ui/tailwind-preset');
 *   module.exports = { presets: [uiPreset], content: [...] };
 *
 * Mapea las utilidades de Tailwind a las variables de `@openfactu/ui/styles.css`,
 * así que hay que importar esa hoja para que los valores existan. Cada `var()`
 * lleva fallback: sin la hoja, se ve la marca por defecto en lugar de nada.
 *
 * Deliberadamente NO declara `plugins`: `tailwindcss-animated` (que aporta
 * `animate-in`, `fade-in-50`…) tiene que añadirlo el consumidor, para que este
 * preset no convierta una devDependency de la librería en dependencia dura.
 *
 * CommonJS explícito (.cjs) para que Node lo cargue igual con independencia del
 * campo `type` del package.json.
 *
 * @type {import('tailwindcss').Config}
 */
// Densidad, movimiento y escala de texto: las escalas de Tailwind se multiplican por
// una variable del tema. Con los valores de fábrica (1) no cambian ni un píxel.
let defaults = {};
try { defaults = require('tailwindcss/defaultTheme'); } catch { /* sin Tailwind resoluble no se escala nada */ }
const scaled = (table, variable, skip = () => false) => Object.fromEntries(
  Object.entries(table ?? {}).map(([key, value]) => [key, typeof value === 'string' && !skip(value) && value !== '0px' ? `calc(${value} * var(${variable}, 1))` : value]),
);
const sized = (table) => Object.fromEntries(
  Object.entries(table ?? {}).map(([key, value]) => {
    const [size, options] = Array.isArray(value) ? value : [value];
    return [key, [`calc(${size} * var(--k-text-scale, 1))`, options ?? {}]];
  }),
);

module.exports = {
  darkMode: 'class',
  theme: {
    extend: {
      spacing: scaled(defaults.spacing, '--k-density', value => value === '1px' || value === 'auto'),
      borderWidth: { DEFAULT: 'var(--k-border-width, 1px)' },
      transitionDuration: scaled(defaults.transitionDuration, '--k-motion'),
      transitionTimingFunction: { DEFAULT: 'var(--k-ease, cubic-bezier(0.4, 0, 0.2, 1))' },
      colors: {
        primary: 'rgb(var(--color-primary-rgb, 10 22 40) / <alpha-value>)',
        'primary-fg': 'rgb(var(--color-primary-fg-rgb, 255 255 255) / <alpha-value>)',
        'primary-hover': 'rgb(var(--color-primary-hover-rgb, 45 58 74) / <alpha-value>)',
        accent: 'rgb(var(--color-accent-rgb, 13 148 136) / <alpha-value>)',
        'accent-fg': 'rgb(var(--color-accent-fg-rgb, 255 255 255) / <alpha-value>)',

        line: 'var(--k-line, #e2e8f0)',
        'line-2': 'var(--k-line-2, #f1f5f9)',
        surface: 'var(--k-surface, #fafbfc)',
        ink: {
          900: 'var(--k-ink-900, #0a1628)',
          800: 'var(--k-ink-800, #1a2535)',
          700: 'var(--k-ink-700, #2d3a4a)',
          500: 'var(--k-ink-500, #64748b)',
          400: 'var(--k-ink-400, #94a3b8)',
        },
        // Nombre histórico de la escala del acento; se mantiene por compatibilidad.
        teal: {
          50: 'var(--k-teal-50, #f0fafa)',
          100: 'var(--k-teal-100, #ccefed)',
          500: 'var(--k-teal-500, #0d9488)',
          600: 'var(--k-teal-600, #0a6e63)',
          900: 'var(--k-teal-900, #042b26)',
        },

        // Superficies semánticas (responden al modo claro/oscuro por sí solas).
        'bg-app': 'var(--bg-app, #fafbfc)',
        'bg-card': 'var(--bg-card, #ffffff)',
        'bg-sidebar': 'var(--bg-sidebar, #0a1628)',
        'bg-muted': 'var(--bg-muted, #f8fafc)',
        'bg-hover': 'var(--bg-hover, #f1f5f9)',
        'fg-default': 'var(--fg-default, #0a1628)',
        'fg-body': 'var(--fg-body, #2d3a4a)',
        'fg-muted': 'var(--fg-muted, #52606f)',
        'fg-subtle': 'var(--fg-subtle, #657486)',
        'border-default': 'var(--border-default, #e2e8f0)',
        'border-subtle': 'var(--border-subtle, #f1f5f9)',
        'border-strong': 'var(--border-strong, #cbd5e1)',

        success: {
          DEFAULT: 'var(--k-success, #16a34a)',
          fg: 'var(--k-success-fg, #15803d)',
          bg: 'var(--k-success-bg, #f0fdf4)',
        },
        warning: {
          DEFAULT: 'var(--k-warning, #d97706)',
          fg: 'var(--k-warning-fg, #b45309)',
          bg: 'var(--k-warning-bg, #fffbeb)',
        },
        danger: {
          DEFAULT: 'var(--k-danger, #dc2626)',
          fg: 'var(--k-danger-fg, #b91c1c)',
          bg: 'var(--k-danger-bg, #fef2f2)',
        },
        info: {
          DEFAULT: 'var(--k-info, #2563eb)',
          fg: 'var(--k-info-fg, #1d4ed8)',
          bg: 'var(--k-info-bg, #eff6ff)',
        },
      },

      fontFamily: {
        app: 'var(--font-sans)',
        sans: 'var(--font-sans)',
        display: 'var(--font-display)',
        mono: 'var(--font-mono)',
      },

      borderRadius: {
        xs: 'var(--k-radius-xs, 2px)',
        sm: 'var(--k-radius-sm, 4px)',
        md: 'var(--k-radius-md, 8px)',
        lg: 'var(--k-radius-lg, 12px)',
      },

      boxShadow: {
        // Las utilidades de sombra de Tailwind siguen al tema: con los valores de fábrica son las mismas que las de Tailwind.
        DEFAULT: 'var(--k-shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
        sm: 'var(--k-shadow-sm, 0 1px 2px 0 rgb(0 0 0 / 0.05))',
        md: 'var(--k-shadow-md, 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1))',
        lg: 'var(--k-shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1))',
        xl: 'var(--k-shadow-xl, 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1))',
        '2xl': 'var(--k-shadow-overlay, 0 25px 50px -12px rgb(0 0 0 / 0.25))',
        'k-sm': 'var(--k-shadow-sm)',
        'k-md': 'var(--k-shadow-md)',
        'k-lg': 'var(--k-shadow-lg)',
        'k-overlay': 'var(--k-shadow-overlay)',
      },

      zIndex: {
        sticky: 'var(--k-z-sticky, 30)',
        dropdown: 'var(--k-z-dropdown, 50)',
        overlay: 'var(--k-z-overlay, 99999)',
        modal: 'var(--k-z-modal, 99999)',
        popover: 'var(--k-z-popover, 999999)',
        toast: 'var(--k-z-toast, 1000000)',
        tooltip: 'var(--k-z-tooltip, 1000001)',
      },

      // Escala tipográfica del brand guide.
      fontSize: {
        ...sized(defaults.fontSize),
        display: ['48px', { lineHeight: '1.05', letterSpacing: '-1px', fontWeight: '800' }],
        h1: ['32px', { lineHeight: '1.1', letterSpacing: '-0.5px', fontWeight: '700' }],
        h2: ['22px', { lineHeight: '1.2', fontWeight: '600' }],
        h3: ['16px', { lineHeight: '1.3', fontWeight: '600' }],
        body: ['14px', { lineHeight: '1.6' }],
        small: ['12px', { lineHeight: '1.5' }],
        label: ['10px', { lineHeight: '1.2', letterSpacing: '1.5px' }],
      },

      keyframes: {
        'k-row-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'k-card-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          to: { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'k-skeleton-shimmer': {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
      },
      animation: {
        'k-row-in': 'k-row-in 0.45s ease-out both',
        'k-card-in': 'k-card-in 0.45s cubic-bezier(0.2, 0, 0, 1) both',
        'k-skeleton-shimmer': 'k-skeleton-shimmer 1.6s linear infinite',
      },
    },
  },
};
