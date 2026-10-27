import * as React from 'react';
import { UiIcon } from '../icons';
import { Modal } from '../components/Modal';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { cn } from '../utils';
import type { AIWorkspaceState, AIWorkspaceActions, AIArtifactRenderer, AIArtifact, AIUIProps } from './types';
import { aiLabels } from './labels';
import { AIIconButton, useStableCallbacks } from './internal/ui';
import { AIConversationHistory } from './AIConversationHistory';
import { AIConversation, type AIPromptSuggestion } from './AIConversation';
import { AIComposer, type AIComposerProps } from './AIComposer';
import { AIArtifactPanel } from './AIArtifactPanel';
import { AIContextUsage } from './AIContext';
import { AICodeProvider, type AICodeAction } from './codeActions';

export interface AIWorkspaceProps extends AIUIProps {
  state: AIWorkspaceState; actions: AIWorkspaceActions;
  title?: string; header?: React.ReactNode; children?: React.ReactNode;
  suggestions?: AIPromptSuggestion[];
  mentions?: AIComposerProps['mentions']; commands?: AIComposerProps['commands'];
  attachmentLimits?: { accept?: string; maxFiles?: number; maxSizeMb?: number };
  artifactRenderers?: Partial<Record<AIArtifact['kind'], AIArtifactRenderer>>;
  style?: React.CSSProperties;
  /** Acciones de IA sobre código solo para este espacio; se suman a las registradas. */
  codeActions?: AICodeAction[];
}
export function AIWorkspace({ state, actions: suppliedActions, title, header, children, suggestions, mentions, commands, attachmentLimits, artifactRenderers, codeActions, labels, className, style }: AIWorkspaceProps) {
  const l = aiLabels(labels); const actions = useStableCallbacks(suppliedActions);
  const narrow = useMediaQuery('(max-width: 1023px)');
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [desktopHistory, setDesktopHistory] = React.useState(true);
  const [mobilePane, setMobilePane] = React.useState<'conversation' | 'results'>('conversation');
  const [width, setWidth] = React.useState(40); const [resizing, setResizing] = React.useState(false);
  const root = React.useRef<HTMLDivElement>(null);
  const artifactOpen = !!state.artifactId && state.artifacts.some(artifact => artifact.id === state.artifactId);
  React.useEffect(() => { setMobilePane(state.artifactId ? 'results' : 'conversation'); }, [state.artifactId]);
  React.useEffect(() => { if (!narrow) setHistoryOpen(false); }, [narrow]);
  const selectConversation = React.useCallback((id: string) => { actions.onSelectConversation(id); setHistoryOpen(false); setMobilePane('conversation'); }, [actions]);
  // Las acciones de código «preguntan» al asistente con un mensaje nuevo, sin tocar el borrador.
  const ask = React.useCallback((text: string) => actions.onSubmit({ text, attachments: [], modelId: state.modelId }), [actions, state.modelId]);
  const fillPrompt = React.useCallback((text: string) => actions.onDraftChange({ ...state.draft, text }), [actions, state.draft]);
  const history = <AIConversationHistory conversations={state.conversations} value={state.conversationId} onSelect={selectConversation}
    onNew={actions.onNewConversation ? () => { actions.onNewConversation!(); setHistoryOpen(false); setMobilePane('conversation'); } : undefined}
    onRename={actions.onRenameConversation} onDelete={actions.onDeleteConversation} onPin={actions.onPinConversation} onSearch={actions.onSearchConversations} loading={state.historyLoading} labels={labels} />;
  return <AICodeProvider onAsk={ask} onApplyCode={suppliedActions.onApplyCode && actions.onApplyCode} onRunCode={suppliedActions.onRunCode && actions.onRunCode}
    onAcceptDiff={suppliedActions.onAcceptDiff && actions.onAcceptDiff} onRejectDiff={suppliedActions.onRejectDiff && actions.onRejectDiff} codeActions={codeActions}><div ref={root} className={cn('ai-surface ai-workspace', resizing && 'ai-workspace-resizing', className)} style={{ '--ai-artifact-width': `${width}%`, ...style } as React.CSSProperties}
    data-artifact-open={artifactOpen || undefined} data-history-hidden={!desktopHistory || undefined} data-mobile-pane={mobilePane}>
    <div className="ai-workspace-sidebar">{history}</div>
    <div className="ai-workspace-main"><header className="ai-workspace-header"><AIIconButton label={l.openHistory} aria-expanded={narrow ? historyOpen : desktopHistory} onClick={() => narrow ? setHistoryOpen(true) : setDesktopHistory(value => !value)}><UiIcon slot="panel-left" size={17} /></AIIconButton>
      <strong>{title ?? state.conversations.find(item => item.id === state.conversationId)?.title ?? l.newConversation}</strong>{state.usage && <AIContextUsage {...state.usage} labels={labels} />}{header}
      {!!state.artifacts.length && actions.onOpenArtifact && <AIIconButton label={l.results} onClick={() => { if (!artifactOpen) actions.onOpenArtifact!(state.artifacts[0].id); setMobilePane('results'); }}><UiIcon slot="panel-right" size={17} /></AIIconButton>}
    </header>
      <div className="ai-mobile-tabs" role="tablist" aria-label={l.conversation}><button type="button" role="tab" aria-selected={mobilePane === 'conversation'} onClick={() => setMobilePane('conversation')}><UiIcon slot="message-square" size={14} />{l.conversation}</button><button type="button" role="tab" aria-selected={mobilePane === 'results'} disabled={!artifactOpen} onClick={() => setMobilePane('results')}><UiIcon slot="panel-right" size={14} />{l.results}</button></div>
      <div className="ai-workspace-chat">{children ?? <>
        <AIConversation messages={state.messages} conversationId={state.conversationId} run={state.run} actions={actions}
          loading={state.historyLoading} hasOlder={state.hasOlderMessages} loadingOlder={state.olderMessagesLoading} onLoadOlder={actions.onLoadOlderMessages}
          suggestions={suggestions} onSelectPrompt={fillPrompt} onOpenCode={actions.onOpenCode} labels={labels} />
        <div className="ai-workspace-composer"><AIComposer draft={state.draft} onDraftChange={actions.onDraftChange} onSubmit={actions.onSubmit} run={state.run} onStop={actions.onStop}
          models={state.models} modelId={state.modelId} onSelectModel={actions.onSelectModel} mentions={mentions} commands={commands}
          onCommand={actions.onCommand} onFiles={actions.onFiles} onRecordAudio={actions.onRecordAudio} {...attachmentLimits} labels={labels} /></div>
      </>}</div>
    </div>
    {artifactOpen && <><div className="ai-workspace-separator" role="separator" tabIndex={0} aria-orientation="vertical" aria-label={l.resizeResults} aria-valuemin={25} aria-valuemax={60} aria-valuenow={width}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setResizing(true); }}
      onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const rect = root.current!.getBoundingClientRect(); setWidth(Math.max(25, Math.min(60, Math.round((rect.right - event.clientX) / rect.width * 100)))); }}
      onPointerUp={event => { event.currentTarget.releasePointerCapture(event.pointerId); setResizing(false); }} onPointerCancel={() => setResizing(false)}
      onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); setWidth(value => event.key === 'Home' ? 25 : event.key === 'End' ? 60 : Math.max(25, Math.min(60, value + (event.key === 'ArrowLeft' ? 2 : -2)))); } }} />
      <div className="ai-workspace-results"><AIArtifactPanel artifacts={state.artifacts} value={state.artifactId} onSelect={actions.onOpenArtifact ?? (() => {})} onClose={actions.onCloseArtifact}
        onChange={actions.onArtifactChange} onDownload={actions.onDownloadArtifact} renderers={artifactRenderers} labels={labels} /></div>
    </>}
    <Modal isOpen={narrow && historyOpen} onClose={() => setHistoryOpen(false)} title={l.conversations} size="sm" fullHeight noBodyPadding hideCancel>{history}</Modal>
  </div></AICodeProvider>;
}
