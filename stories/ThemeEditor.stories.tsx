import * as React from 'react';
import type { Story } from '@ladle/react';
import { THEME_PRESETS, FONT_OPTIONS, resolveTheme, themeFromJson, themeToAttrs, themeToJson, themeToPresetSource, themeToStyle, validateTheme, type ThemeInput } from '../src/theme';
import { MOTION_CHARACTERS, dampingRatio } from '../src/motion';
import { Button } from '../src/components/Button';
import { Badge } from '../src/components/Badge';
import { Card } from '../src/components/Card';
import { KpiCard } from '../src/components/KpiCard';
import { Input } from '../src/components/Input';
import { Switch } from '../src/components/Switch';
import { Progress } from '../src/components/Progress';
import { Table } from '../src/components/Table';
import { AIComposer, AIMessage, type AIDraft } from '../src/ai';

const rows = [
  { id: 1, cliente: 'Acme S.L.', total: '1.240,00 €', estado: 'Pagada' },
  { id: 2, cliente: 'Globex', total: '860,50 €', estado: 'Pendiente' },
  { id: 3, cliente: 'Initech', total: '3.015,90 €', estado: 'Pagada' },
];

/** Una pantalla con todo lo que el tema controla. */
function Preview({ theme }: { theme: ReturnType<typeof resolveTheme> }) {
  const [draft, setDraft] = React.useState<AIDraft>({ text: '', attachments: [] });
  const [on, setOn] = React.useState(true);
  return <div className={theme.mode === 'dark' ? 'dark' : undefined} style={{ ...(themeToStyle(theme) as React.CSSProperties), color: 'var(--fg-default)', borderRadius: 'var(--k-radius-lg)', padding: 20, minHeight: 560, background: theme.backdrop === 'none' ? 'var(--bg-app)' : undefined }} {...themeToAttrs(theme)}>
    <div className="grid gap-4 md:grid-cols-3"><KpiCard label="Facturación" value="48.210 €" /><KpiCard label="Pendiente" value="6.480 €" /><KpiCard label="Clientes" value="128" /></div>
    <div className="mt-4 grid gap-4 md:grid-cols-2">
      <Card title="Formulario" subtitle="Prueba el foco con Tab y selecciona este texto">
        <div className="flex flex-col gap-3 p-4">
          <Input label="Cliente" placeholder="Nombre fiscal" />
          <div className="flex items-center gap-3"><Switch checked={on} onChange={setOn} label="Enviar por correo" /><Badge variant="success">Activo</Badge></div>
          <Progress value={64} />
          <div className="flex gap-2"><Button variant="primary" size="sm">Guardar</Button><Button variant="secondary" size="sm">Cancelar</Button></div>
        </div>
      </Card>
      <div role="dialog" aria-label="Diálogo de ejemplo" className="rounded-[var(--k-radius-md)] border border-[var(--border-default)] bg-[var(--bg-card)] p-5 shadow-xl">
        <h3 className="text-[15px] font-semibold">Diálogo</h3>
        <p className="mt-1 text-[13px] text-[var(--fg-muted)]">Si el tema es de cristal, lo que hay detrás se difumina.</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="secondary" size="sm">Ahora no</Button><Button variant="accent" size="sm">Continuar</Button></div>
      </div>
    </div>
    <div className="mt-4"><Card title="Facturas"><Table data={rows} rowKey={row => row.id} columns={[{ id: 'c', header: 'Cliente', cell: row => row.cliente }, { id: 't', header: 'Total', cell: row => row.total }, { id: 'e', header: 'Estado', cell: row => <Badge variant={row.estado === 'Pagada' ? 'success' : 'neutral'}>{row.estado}</Badge> }]} /></Card></div>
    <div className="mt-4 ai-surface" style={{ display: 'grid', gap: 12 }}>
      <AIMessage message={{ id: 'm', role: 'assistant', parts: [{ type: 'text', text: 'Las **ventas** suben un `12 %` este trimestre.' }] }} />
      <AIComposer draft={draft} onDraftChange={setDraft} onSubmit={() => undefined} />
    </div>
  </div>;
}

const box: React.CSSProperties = { display: 'grid', gap: 8, padding: 12, border: '1px solid #94a3b8', borderRadius: 8, alignContent: 'start' };
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => <label style={{ display: 'grid', gap: 2, fontSize: 11 }}>{label}{children}</label>;
const Slider = ({ label, value, min, max, step, onChange, format }: { label: string; value: number; min: number; max: number; step: number; onChange: (value: number) => void; format?: (value: number) => string }) => (
  <Field label={`${label}: ${format ? format(value) : value}`}><input type="range" aria-label={label} min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))} /></Field>
);
const merge = (a: ThemeInput, b: ThemeInput): ThemeInput => ({ ...a, ...b, colors: { ...a.colors, ...b.colors } as ThemeInput['colors'], material: { ...a.material, ...b.material }, motion: { ...a.motion, ...b.motion }, typography: { ...a.typography, ...b.typography }, border: { ...a.border, ...b.border }, focus: { ...a.focus, ...b.focus }, selection: { ...a.selection, ...b.selection } });

/**
 * Editor de temas: parte de un preset, ajusta cada eje en vivo y exporta el
 * resultado como JSON o como el código que lo registra. También importa un JSON.
 */
export const Editor: Story = () => {
  const [presetId, setPresetId] = React.useState('keirost-glass-aurora');
  const preset = THEME_PRESETS.find(item => item.id === presetId)!;
  const [edit, setEdit] = React.useState<ThemeInput>({});
  const [imported, setImported] = React.useState<ThemeInput | null>(null);
  const [text, setText] = React.useState(''); const [notice, setNotice] = React.useState('');
  const base = imported ?? preset.theme;
  const input = React.useMemo(() => merge(base, edit), [base, edit]);
  const theme = React.useMemo(() => resolveTheme(input), [input]);
  const issues = React.useMemo(() => validateTheme(input).issues, [input]);
  const set = (patch: ThemeInput) => setEdit(current => merge(current, patch));
  const pick = (id: string) => { setPresetId(id); setImported(null); setEdit({}); setNotice(''); };
  const copy = async (value: string, what: string) => { try { await navigator.clipboard.writeText(value); setNotice(`${what} copiado.`); } catch { setNotice('No se pudo copiar; selecciona el texto de abajo.'); } };
  const source = themeToPresetSource({ id: 'mi-tema', label: 'Mi tema', description: 'Creado con el editor.' }, input);
  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{THEME_PRESETS.map(item => <button key={item.id} type="button" aria-pressed={!imported && item.id === presetId} onClick={() => pick(item.id)} style={{ padding: '4px 10px', fontSize: 11, cursor: 'pointer', fontWeight: !imported && item.id === presetId ? 700 : 400 }}>{item.label}</button>)}</div>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
      <div style={box}><strong style={{ fontSize: 12 }}>Color</strong>
        <Field label="Modo"><select aria-label="Modo" value={theme.mode} onChange={event => set({ mode: event.target.value as 'light' | 'dark' })}><option value="light">Claro</option><option value="dark">Oscuro</option></select></Field>
        <Field label="Primario"><input type="color" aria-label="Primario" value={theme.colors.primary} onChange={event => set({ colors: { primary: event.target.value } as ThemeInput['colors'] })} /></Field>
        <Field label="Acento"><input type="color" aria-label="Acento" value={theme.colors.accent} onChange={event => set({ colors: { accent: event.target.value } as ThemeInput['colors'] })} /></Field>
        <Field label="Redondez"><select aria-label="Redondez" value={['none', 'sm', 'md', 'lg'].find(key => resolveTheme({ radius: key as 'none' }).radius.md === theme.radius.md) ?? 'md'} onChange={event => set({ radius: event.target.value as 'none' })}><option value="none">Ninguna</option><option value="sm">Pequeña</option><option value="md">Media</option><option value="lg">Grande</option></select></Field>
        <Field label="Tipografía"><select aria-label="Tipografía" value={theme.typography.fontFamily} onChange={event => set({ typography: { fontFamily: event.target.value } })}>{FONT_OPTIONS.map(font => <option key={font.id} value={font.id}>{font.label}</option>)}</select></Field>
      </div>
      <div style={box}><strong style={{ fontSize: 12 }}>Material y fondo</strong>
        <Slider label="Desenfoque (px)" value={theme.material.blur} min={0} max={60} step={1} onChange={blur => set({ material: { blur } })} />
        <Slider label="Opacidad" value={theme.material.alpha} min={0.1} max={1} step={0.02} onChange={alpha => set({ material: { alpha } })} format={value => value.toFixed(2)} />
        <Slider label="Saturación" value={theme.material.saturate} min={0.5} max={2.5} step={0.05} onChange={saturate => set({ material: { saturate } })} format={value => value.toFixed(2)} />
        <Field label="Fondo en movimiento"><select aria-label="Fondo en movimiento" value={theme.backdropMotion} onChange={event => set({ backdropMotion: event.target.value as 'none' | 'drift' })}><option value="none">Quieto</option><option value="drift">Deriva suave</option></select></Field>
      </div>
      <div style={box}><strong style={{ fontSize: 12 }}>Espacio y movimiento</strong>
        <Slider label="Densidad" value={theme.density} min={0.8} max={1.25} step={0.01} onChange={density => set({ density })} format={value => value.toFixed(2)} />
        <Field label="Carácter del movimiento"><select aria-label="Carácter del movimiento" value={theme.motion.character} onChange={event => set({ motion: { character: event.target.value as keyof typeof MOTION_CHARACTERS, springs: undefined } })}>{Object.keys(MOTION_CHARACTERS).map(key => <option key={key} value={key}>{key}</option>)}</select></Field>
        <Slider label="Rebote de entradas y menús" value={Math.max(0, 1 - dampingRatio(theme.motion.springs.enter))} min={0} max={0.7} step={0.02} onChange={bounce => set({ motion: { springs: { enter: { bounce, duration: 0.45 }, pop: { bounce, duration: 0.4 } } } })} format={value => value.toFixed(2)} />
        <Slider label="Velocidad de movimiento" value={theme.motion.speed} min={0} max={2.5} step={0.1} onChange={speed => set({ motion: { speed } })} format={value => value === 0 ? 'sin movimiento' : `×${value.toFixed(1)}`} />
        <Slider label="Escala de texto" value={theme.typography.scale} min={0.85} max={1.25} step={0.01} onChange={scale => set({ typography: { scale } })} format={value => value.toFixed(2)} />
      </div>
      <div style={box}><strong style={{ fontSize: 12 }}>Bordes, foco y selección</strong>
        <Slider label="Grosor de borde (px)" value={theme.border.width} min={0.5} max={3} step={0.5} onChange={width => set({ border: { width } })} />
        <Slider label="Grosor del foco (px)" value={theme.focus.width} min={1} max={5} step={1} onChange={width => set({ focus: { width } })} />
        <Slider label="Separación del foco (px)" value={theme.focus.offset} min={0} max={6} step={1} onChange={offset => set({ focus: { offset } })} />
        <Field label="Color del foco"><input type="color" aria-label="Color del foco" value={/^#/.test(theme.focus.color) ? theme.focus.color : theme.colors.accent} onChange={event => set({ focus: { color: event.target.value } })} /></Field>
        <Field label="Fondo de la selección"><input type="color" aria-label="Fondo de la selección" value={/^#/.test(theme.selection.background) ? theme.selection.background : theme.colors.accentScale[100]} onChange={event => set({ selection: { background: event.target.value } })} /></Field>
      </div>
    </div>
    {issues.length > 0 && <ul style={{ margin: 0, fontSize: 11 }}>{issues.map(issue => <li key={issue.field + issue.message}><strong>{issue.field}</strong>: {issue.message}</li>)}</ul>}
    <Preview theme={theme} />
    <div style={{ ...box, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))' }}>
      <div style={{ display: 'grid', gap: 6 }}><strong style={{ fontSize: 12 }}>Exportar</strong>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}><button type="button" onClick={() => void copy(themeToJson(input), 'JSON')}>Copiar JSON</button><button type="button" onClick={() => void copy(source, 'Código')}>Copiar registerThemePreset</button></div>
        <textarea readOnly aria-label="Código exportado" value={source} rows={12} style={{ fontFamily: 'monospace', fontSize: 11, width: '100%' }} />
      </div>
      <div style={{ display: 'grid', gap: 6 }}><strong style={{ fontSize: 12 }}>Importar</strong>
        <textarea aria-label="JSON a importar" value={text} onChange={event => setText(event.target.value)} rows={9} placeholder='{ "mode": "dark", "colors": { "primary": "#0d0a24", "accent": "#8b7bff" } }' style={{ fontFamily: 'monospace', fontSize: 11, width: '100%' }} />
        <button type="button" onClick={() => { const result = themeFromJson(text); if (result.theme) { setImported(result.theme); setEdit({}); setNotice(`Tema importado${result.issues.length ? ` con ${result.issues.length} aviso(s)` : ''}.`); } else setNotice(result.issues.map(issue => issue.message).join(' ')); }}>Importar tema</button>
      </div>
    </div>
    {notice && <p role="status" style={{ margin: 0, fontSize: 12 }}>{notice}</p>}
  </div>;
};
