import * as React from 'react';
import { AIWorkspace, AIConversation, AIComposer, type AIMessageData, type AIDraft } from '../src/ai';
import { THEME_PRESETS, resolveTheme, themeToAttrs, themeToStyle, type ResolvedTheme } from '../src/theme';
import { useAIDemo, demoMentions, demoCommands, demoSuggestions } from './ai-demo';

/** Aplica un tema solo a su subárbol (mismo patrón que ThemeInUse). */
const Themed = ({ theme, children, style }: { theme: ResolvedTheme; children: React.ReactNode; style?: React.CSSProperties }) => (
  <div className={theme.mode === 'dark' ? 'dark' : undefined} {...themeToAttrs(theme)} style={{ ...(themeToStyle(theme) as React.CSSProperties), background: theme.backdrop === 'none' ? 'var(--bg-app, #fff)' : undefined, color: 'var(--fg-default, #0a1628)', padding: 14, borderRadius: 12, ...style }}>{children}</div>
);
const PresetPicker = ({ value, onChange }: { value: string; onChange: (id: string) => void }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
    {THEME_PRESETS.map(preset => <button key={preset.id} type="button" onClick={() => onChange(preset.id)} aria-pressed={value === preset.id}
      style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 9px', fontSize: 11, cursor: 'pointer', borderRadius: 6, border: `1px solid ${value === preset.id ? preset.theme.colors!.accent : '#94a3b8'}`, background: value === preset.id ? 'color-mix(in srgb, ' + preset.theme.colors!.accent + ' 14%, transparent)' : 'transparent', color: 'inherit' }}>
      <span style={{ width: 11, height: 11, borderRadius: '50%', background: preset.theme.colors!.primary }} /><span style={{ width: 11, height: 11, borderRadius: '50%', background: preset.theme.colors!.accent }} />{preset.label}
    </button>)}
  </div>
);
const useTheme = (initial: string) => {
  const [id, setId] = React.useState(initial);
  return { id, setId, theme: React.useMemo(() => resolveTheme(THEME_PRESETS.find(preset => preset.id === id)!.theme), [id]) };
};

function Workspace({ empty = false }: { empty?: boolean }) {
  const { state, actions } = useAIDemo(empty);
  return <AIWorkspace state={state} actions={actions} mentions={demoMentions} commands={demoCommands} suggestions={demoSuggestions} attachmentLimits={{ maxFiles: 4, maxSizeMb: 10 }} style={{ height: 'calc(100dvh - 190px)' }} />;
}
/** Espacio de trabajo completo con selector de tema. Envía un mensaje para ver «pensando», streaming y herramientas. */
export const Espacio = () => {
  const { id, setId, theme } = useTheme('keirost-teal');
  return <Themed theme={theme}><PresetPicker value={id} onChange={setId} /><Workspace /></Themed>;
};
export const EspacioVacio = () => {
  const { id, setId, theme } = useTheme('keirost-plum');
  return <Themed theme={theme}><PresetPicker value={id} onChange={setId} /><Workspace empty /></Themed>;
};

const sample: AIMessageData[] = [
  { id: 'u', role: 'user', parts: [{ type: 'text', text: 'Resume el trimestre y prepara el informe.' }] },
  { id: 'a', role: 'assistant', status: 'streaming', parts: [
    { type: 'text', text: 'Reviso los datos y preparo el **informe**. Las ventas suben un `12 %` respecto al trimestre anterior' },
    { type: 'tool', tool: { id: 't', name: 'Consultar ventas', status: 'running', input: { periodo: 'T3' } } },
  ] },
];
const noop = () => undefined;
function Mini({ draft }: { draft: AIDraft }) {
  return <div style={{ display: 'flex', flexDirection: 'column', height: 420, border: '1px solid var(--border-default, #e2e8f0)', borderRadius: 10, overflow: 'hidden', background: 'var(--bg-card, #fff)' }}>
    <AIConversation messages={sample} conversationId="mini" />
    <div style={{ padding: 10 }}><AIComposer draft={draft} onDraftChange={noop} onSubmit={noop} /></div>
  </div>;
}
/** El mismo mensaje en streaming bajo los nueve temas de fábrica. */
export const NueveTemas = () => {
  const draft: AIDraft = { text: '', attachments: [] };
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
    {THEME_PRESETS.map(preset => <Themed key={preset.id} theme={resolveTheme(preset.theme)}><p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 600 }}>{preset.label}</p><Mini draft={draft} /></Themed>)}
  </div>;
};

/** Estado vacío, «pensando» y streaming; el botón vuelve a montar todo para repetir las entradas. */
export const Animaciones = () => {
  const { id, setId, theme } = useTheme('keirost-nebula');
  const [run, setRun] = React.useState(0);
  const draft: AIDraft = { text: '', attachments: [] };
  return <Themed theme={theme}><PresetPicker value={id} onChange={setId} />
    <button type="button" onClick={() => setRun(value => value + 1)} style={{ marginBottom: 12, padding: '5px 12px', cursor: 'pointer' }}>Repetir animaciones</button>
    <div key={run} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 14 }}>
      <div className="ai-surface" style={{ border: '1px solid var(--border-default, #e2e8f0)', borderRadius: 10, height: 420, display: 'flex', flexDirection: 'column' }}><AIConversation messages={[]} suggestions={demoSuggestions} onSelectPrompt={noop} /></div>
      <div className="ai-surface" style={{ border: '1px solid var(--border-default, #e2e8f0)', borderRadius: 10, height: 420, display: 'flex', flexDirection: 'column' }}><AIConversation messages={sample.slice(0, 1)} run={{ status: 'waiting' }} /></div>
      <Mini draft={draft} />
    </div>
  </Themed>;
};
