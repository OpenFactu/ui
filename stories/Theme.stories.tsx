import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  THEME_PRESETS,
  applyTheme,
  detectPreset,
  resolveTheme,
  themeToStyle,
  type ThemeInput,
} from '../src/theme';
import { Button } from '../src/components/Button';
import { Badge } from '../src/components/Badge';
import { Card } from '../src/components/Card';
import { Input } from '../src/components/Input';
import { Switch } from '../src/components/Switch';
import { Progress } from '../src/components/Progress';

/** Muestra de componentes para juzgar un tema de un vistazo. */
const Sample: React.FC = () => (
  <div className="flex flex-col gap-3">
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="primary" size="sm">
        Primary
      </Button>
      <Button variant="accent" size="sm">
        Accent
      </Button>
      <Button variant="secondary" size="sm">
        Secondary
      </Button>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="teal">Acento</Badge>
      <Badge variant="success">Pagada</Badge>
      <Badge variant="neutral">Borrador</Badge>
    </div>
    <Progress value={62} />
  </div>
);

/**
 * Cada preset se aplica a su propio contenedor con `themeToStyle`, sin tocar
 * el documento: así se ven los nueve a la vez.
 */
export const Presets: Story = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
    {THEME_PRESETS.map((preset) => {
      const resolved = resolveTheme(preset.theme);
      return (
        <div
          key={preset.id}
          style={themeToStyle(resolved) as React.CSSProperties}
          className={resolved.mode === 'dark' ? 'dark' : undefined}
        >
          <div className="rounded-[var(--k-radius-sm)] border border-[var(--border-default)] bg-[var(--bg-card)] p-4 flex flex-col gap-3">
            <div>
              <p className="text-[13px] font-semibold text-[var(--fg-default)]">{preset.label}</p>
              <p className="text-[11px] text-[var(--fg-muted)] mt-0.5">{preset.description}</p>
            </div>
            <div className="flex gap-1.5">
              <span
                className="h-6 w-6 rounded-full border border-[var(--border-default)]"
                style={{ background: resolved.colors.primary }}
                title={`primary ${resolved.colors.primary}`}
              />
              <span
                className="h-6 w-6 rounded-full border border-[var(--border-default)]"
                style={{ background: resolved.colors.accent }}
                title={`accent ${resolved.colors.accent}`}
              />
            </div>
            <Sample />
          </div>
        </div>
      );
    })}
  </div>
);

/** Editor en vivo: los cambios se escriben sobre `<html>` con `applyTheme`. */
export const Playground: Story = () => {
  const [theme, setTheme] = React.useState<ThemeInput>({
    mode: 'light',
    colors: { primary: '#0A1628', accent: '#0D9488' },
  });
  const resolved = React.useMemo(() => resolveTheme(theme), [theme]);

  React.useEffect(() => {
    applyTheme(resolved);
  }, [resolved]);

  const patch = (colors: Partial<ThemeInput['colors']>) =>
    setTheme((prev) => ({ ...prev, colors: { ...prev.colors!, ...colors } }));

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex flex-wrap items-end gap-5">
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--fg-default)]">Primario</span>
          <input
            type="color"
            value={resolved.colors.primary}
            onChange={(e) => patch({ primary: e.target.value })}
            className="h-9 w-16 cursor-pointer rounded-[var(--k-radius-xs)] border border-[var(--border-default)] bg-transparent"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[12px] font-medium text-[var(--fg-default)]">Acento</span>
          <input
            type="color"
            value={resolved.colors.accent}
            onChange={(e) => patch({ accent: e.target.value })}
            className="h-9 w-16 cursor-pointer rounded-[var(--k-radius-xs)] border border-[var(--border-default)] bg-transparent"
          />
        </label>
        <Switch
          checked={resolved.mode === 'dark'}
          onChange={(v) => setTheme((prev) => ({ ...prev, mode: v ? 'dark' : 'light' }))}
          label="Modo oscuro"
        />
        <span className="text-[11px] font-mono text-[var(--fg-muted)]">
          preset: {detectPreset(resolved) ?? 'a medida'}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {THEME_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setTheme(p.theme)}
            className="flex items-center gap-1.5 rounded-[var(--k-radius-xs)] border border-[var(--border-default)] px-2 py-1 text-[11px] text-[var(--fg-default)] hover:border-accent transition-colors"
          >
            <span
              className="h-3 w-3 rounded-full"
              style={{ background: p.theme.colors!.primary }}
            />
            <span className="h-3 w-3 rounded-full" style={{ background: p.theme.colors!.accent }} />
            {p.label}
          </button>
        ))}
      </div>

      <Card title="Muestra" subtitle="Todo lo de abajo se repinta solo al cambiar el tema.">
        <div className="flex flex-col gap-4">
          <Sample />
          <Input label="Cliente" placeholder="Buscar…" />
        </div>
      </Card>
    </div>
  );
};

/** Referencia: valor efectivo de cada token en el documento actual. */
export const Tokens: Story = () => {
  const groups: Array<[string, string[]]> = [
    ['Marca', ['--color-primary-rgb', '--color-accent-rgb', '--color-accent-fg-rgb']],
    ['Acento', ['--k-accent-50', '--k-accent-100', '--k-accent-500', '--k-accent-600', '--k-accent-900']],
    ['Tinta', ['--k-ink-900', '--k-ink-800', '--k-ink-700', '--k-ink-500', '--k-ink-400']],
    ['Superficie', ['--bg-app', '--bg-card', '--bg-muted', '--bg-hover', '--border-default', '--border-strong']],
    ['Texto', ['--fg-default', '--fg-muted', '--fg-subtle']],
    ['Estado', ['--k-success', '--k-warning', '--k-danger', '--k-info']],
    ['Radio', ['--k-radius-xs', '--k-radius-sm', '--k-radius-md', '--k-radius-lg']],
    ['Apilado', ['--k-z-dropdown', '--k-z-modal', '--k-z-popover', '--k-z-toast']],
  ];
  const [values, setValues] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const next: Record<string, string> = {};
    for (const [, keys] of groups) for (const k of keys) next[k] = cs.getPropertyValue(k).trim();
    setValues(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {groups.map(([label, keys]) => (
        <div key={label}>
          <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--fg-muted)] mb-2">
            {label}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {keys.map((key) => (
              <div
                key={key}
                className="flex items-center gap-2 rounded-[var(--k-radius-xs)] border border-[var(--border-default)] px-2 py-1.5"
              >
                <span
                  className="h-5 w-5 shrink-0 rounded-[var(--k-radius-xs)] border border-[var(--border-default)]"
                  style={{ background: `var(${key})` }}
                />
                <span className="font-mono text-[11px] text-[var(--fg-default)] truncate">{key}</span>
                <span className="ml-auto font-mono text-[10px] text-[var(--fg-muted)] shrink-0">
                  {values[key]}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};
