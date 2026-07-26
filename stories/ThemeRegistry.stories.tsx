import * as React from 'react';
import type { Story } from '@ladle/react';
import { Plug, Trash2 } from 'lucide-react';
import {
  registerThemePreset,
  registerTokens,
  unregisterThemeSource,
  validateTheme,
  resolveTheme,
  themeToStyle,
  type ThemeInput,
} from '../src/theme';
import { useThemePresets } from '../src/hooks/useThemePresets';
import { Badge } from '../src/components/Badge';
import { Button } from '../src/components/Button';
import { Card } from '../src/components/Card';
import { KpiCard } from '../src/components/KpiCard';

/** Temas de ejemplo, como los que aportaría un plugin instalado. */
const TEMAS_DE_PLUGIN: Parameters<typeof registerThemePreset>[0][] = [
  {
    id: 'acme-corporativo',
    label: 'Acme corporativo',
    description: 'Azul de marca sobre fondo claro.',
    theme: { mode: 'light', colors: { primary: '#1e3a8a', accent: '#2563eb' } },
  },
  {
    id: 'acme-nocturno',
    label: 'Acme nocturno',
    description: 'La misma marca en oscuro.',
    theme: { mode: 'dark', colors: { primary: '#0b1120', accent: '#60a5fa' } },
  },
  {
    id: 'vinedo',
    label: 'Viñedo',
    description: 'Granate con acento dorado, esquinas muy redondeadas.',
    theme: {
      mode: 'light',
      colors: { primary: '#5b1a2b', accent: '#b8860b' },
      radius: 'lg',
    },
  },
];

/**
 * Un plugin registra sus temas al activarse y los retira al desactivarse.
 * El selector se repinta solo: está suscrito al registro.
 */
export const TemasDePlugin: Story = () => {
  const presets = useThemePresets();
  const [instalado, setInstalado] = React.useState(false);
  const [activo, setActivo] = React.useState('keirost-classic');

  const instalar = () => {
    for (const preset of TEMAS_DE_PLUGIN) {
      registerThemePreset(preset, { source: 'plugin-acme' });
    }
    // Un plugin también puede aportar variables propias.
    registerTokens('plugin-acme', { '--acme-marca': '#2563eb' });
    setInstalado(true);
  };

  const desinstalar = () => {
    unregisterThemeSource('plugin-acme');
    setInstalado(false);
    if (presets.every((p) => p.id !== activo)) setActivo('keirost-classic');
  };

  const preset = presets.find((p) => p.id === activo) ?? presets[0];
  const theme = React.useMemo(() => resolveTheme(preset.theme), [preset]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        {instalado ? (
          <Button variant="danger" onClick={desinstalar}>
            <Trash2 className="h-3.5 w-3.5" /> Desactivar plugin
          </Button>
        ) : (
          <Button variant="accent" onClick={instalar}>
            <Plug className="h-3.5 w-3.5" /> Activar plugin «Acme»
          </Button>
        )}
        <span className="text-[12px] text-[var(--fg-muted,#52606f)]">
          {presets.length} temas disponibles
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {presets.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActivo(p.id)}
            className={
              'flex items-center gap-1.5 rounded-[2px] border px-2 py-1 text-[11px] transition-colors ' +
              (activo === p.id
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-slate-200 text-slate-500 hover:border-slate-400 dark:border-slate-700 dark:text-slate-400')
            }
          >
            <span className="h-3 w-3 rounded-full" style={{ background: p.theme.colors!.primary }} />
            <span className="h-3 w-3 rounded-full" style={{ background: p.theme.colors!.accent }} />
            {p.label}
            {p.source !== 'builtin' && (
              <Badge variant="teal" className="ml-1 scale-90">
                plugin
              </Badge>
            )}
          </button>
        ))}
      </div>

      <div
        style={themeToStyle(theme) as React.CSSProperties}
        className={theme.mode === 'dark' ? 'dark' : undefined}
      >
        <div className="rounded-[var(--k-radius-md)] border border-[var(--border-default)] bg-[var(--bg-app)] p-5 flex flex-col gap-4">
          <div>
            <p className="text-[13px] font-semibold text-[var(--fg-default)]">{preset.label}</p>
            <p className="text-[11px] text-[var(--fg-muted)]">{preset.description}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <KpiCard label="Facturado" value="48.320 €" trend={{ dir: 'up', text: '12,4%' }} />
            <Card title="Acciones">
              <div className="flex flex-wrap gap-2">
                <Button variant="accent" size="sm">
                  Principal
                </Button>
                <Button variant="secondary" size="sm">
                  Secundaria
                </Button>
                <Badge variant="teal">Acento</Badge>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
TemasDePlugin.storyName = 'Temas aportados por un plugin';

/** El registro comprueba el tema antes de aceptarlo. */
export const Validacion: Story = () => {
  const casos: Array<[string, ThemeInput]> = [
    ['Correcto', { mode: 'light', colors: { primary: '#1e3a8a', accent: '#2563eb' } }],
    ['Hex inválido', { mode: 'light', colors: { primary: 'azul', accent: '#2563eb' } }],
    ['Faltan obligatorios', { mode: 'light', colors: { primary: '#1e3a8a' } as any }],
    ['Acento sin contraste', { mode: 'light', colors: { primary: '#111111', accent: '#f5f5dc' } }],
  ];

  return (
    <div className="flex flex-col gap-3 max-w-2xl">
      {casos.map(([nombre, tema]) => {
        const r = validateTheme(tema);
        return (
          <div
            key={nombre}
            className="rounded-[var(--k-radius-sm,4px)] border border-[var(--border-default,#e2e8f0)] p-3"
          >
            <div className="flex items-center gap-2 mb-1">
              <Badge variant={r.ok ? 'success' : 'error'}>{r.ok ? 'aceptado' : 'rechazado'}</Badge>
              <span className="text-[13px] font-medium text-[var(--fg-default,#0a1628)]">
                {nombre}
              </span>
            </div>
            {r.issues.length === 0 ? (
              <p className="text-[11px] text-[var(--fg-muted,#52606f)]">Sin observaciones.</p>
            ) : (
              <ul className="flex flex-col gap-0.5">
                {r.issues.map((issue, i) => (
                  <li
                    key={i}
                    className={
                      'text-[11px] ' +
                      (issue.level === 'error'
                        ? 'text-[var(--k-danger-fg)]'
                        : 'text-[var(--k-warning-fg)]')
                    }
                  >
                    <span className="font-mono">{issue.field}</span> — {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
};
Validacion.storyName = 'Validación de temas';
