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
import { clampHistoryWidth, workspacePanelWidths } from './internal/history';

export interface AIWorkspaceProps extends AIUIProps {
  state: AIWorkspaceState; actions: AIWorkspaceActions;
  title?: string; header?: React.ReactNode; children?: React.ReactNode;
  /** Piezas de AIComposer en el orden y distribución del consumidor. */
  composer?: React.ReactNode;
  /** Ancho controlado del historial en escritorio, entre 200 y 420 px. Sin él se conserva localmente. */
  sidebarWidth?: number;
  onSidebarWidthChange?: (width: number) => void;
  suggestions?: AIPromptSuggestion[];
  mentions?: AIComposerProps['mentions']; commands?: AIComposerProps['commands'];
  attachmentLimits?: { accept?: string; maxFiles?: number; maxSizeMb?: number };
  artifactRenderers?: Partial<Record<AIArtifact['kind'], AIArtifactRenderer>>;
  style?: React.CSSProperties;
  /** Acciones de IA sobre código solo para este espacio; se suman a las registradas. */
  codeActions?: AICodeAction[];
}
export function AIWorkspace({ state, actions: suppliedActions, title, header, children, composer, sidebarWidth, onSidebarWidthChange, suggestions, mentions, commands, attachmentLimits, artifactRenderers, codeActions, labels, className, style }: AIWorkspaceProps) {
  const l = aiLabels(labels); const actions = useStableCallbacks(suppliedActions);
  const narrowViewport = useMediaQuery('(max-width: 1023px)');
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [desktopHistory, setDesktopHistory] = React.useState(true);
  const [mobilePane, setMobilePane] = React.useState<'conversation' | 'results'>('conversation');
  const [width, setWidth] = React.useState(40); const [resizing, setResizing] = React.useState(false);
  const [localSidebarWidth, setLocalSidebarWidth] = React.useState(240);
  const [resizingHistory, setResizingHistory] = React.useState(false);
  const historyId = React.useId();
  const root = React.useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = React.useState(0);
  const artifactOpen = !!state.artifactId && state.artifacts.some(artifact => artifact.id === state.artifactId);
  const narrow = narrowViewport || (availableWidth > 0 && availableWidth < (artifactOpen ? 720 : 560));
  const panels = workspacePanelWidths(availableWidth || 1440, sidebarWidth ?? localSidebarWidth, width, desktopHistory && !narrow, artifactOpen);
  const historyWidth = panels.history;
  const resizeHistory = (width: number) => { const next = Math.min(panels.historyMax, clampHistoryWidth(width)); if (sidebarWidth === undefined) setLocalSidebarWidth(next); onSidebarWidthChange?.(next); };
  const resizeResults = (next: number) => setWidth(Math.max(25, Math.min(panels.resultsMax, Math.round(next))));
  React.useLayoutEffect(() => {
    const element = root.current; if (!element) return;
    const measure = () => setAvailableWidth(Math.floor(element.clientWidth));
    measure(); const observer = new ResizeObserver(measure); observer.observe(element);
    return () => observer.disconnect();
  }, []);
  React.useEffect(() => { setMobilePane(state.artifactId ? 'results' : 'conversation'); }, [state.artifactId]);
  React.useEffect(() => { if (!narrow) setHistoryOpen(false); }, [narrow]);
  const selectConversation = React.useCallback((id: string) => { actions.onSelectConversation(id); setHistoryOpen(false); setMobilePane('conversation'); }, [actions]);
  // Las acciones de código «preguntan» al asistente con un mensaje nuevo, sin tocar el borrador.
  const ask = React.useCallback((text: string) => actions.onSubmit({ text, attachments: [], modelId: state.modelId }), [actions, state.modelId]);
  const fillPrompt = React.useCallback((text: string) => actions.onDraftChange({ ...state.draft, text }), [actions, state.draft]);
  const history = <AIConversationHistory conversations={state.conversations} projects={state.projects} value={state.conversationId} onSelect={selectConversation}
    onNew={actions.onNewConversation ? projectId => { actions.onNewConversation!(projectId); setHistoryOpen(false); setMobilePane('conversation'); } : undefined}
    onCreateProject={actions.onCreateProject} onRenameProject={actions.onRenameProject} onDeleteProject={actions.onDeleteProject} onMoveConversation={actions.onMoveConversation}
    onRename={actions.onRenameConversation} onDelete={actions.onDeleteConversation} onPin={actions.onPinConversation} onSearch={actions.onSearchConversations} loading={state.historyLoading} labels={labels} />;
  return <AICodeProvider onAsk={ask} onApplyCode={suppliedActions.onApplyCode && actions.onApplyCode} onRunCode={suppliedActions.onRunCode && actions.onRunCode}
    onAcceptDiff={suppliedActions.onAcceptDiff && actions.onAcceptDiff} onRejectDiff={suppliedActions.onRejectDiff && actions.onRejectDiff} codeActions={codeActions}><div ref={root} className={cn('ai-surface ai-workspace', (resizing || resizingHistory) && 'ai-workspace-resizing', className)} style={{ '--ai-artifact-width': `${panels.results}%`, '--ai-history-width': `${historyWidth}px`, ...style } as React.CSSProperties}
    data-artifact-open={artifactOpen || undefined} data-history-hidden={!desktopHistory || narrow || undefined} data-mobile-pane={mobilePane}>
    <div id={historyId} className="ai-workspace-sidebar">{history}</div>
    <div className="ai-workspace-history-separator" role="separator" tabIndex={0} aria-orientation="vertical" aria-label={l.resizeHistory} aria-controls={historyId} aria-valuemin={200} aria-valuemax={panels.historyMax} aria-valuenow={historyWidth}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setResizingHistory(true); }}
      onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId) && root.current) resizeHistory(event.clientX - root.current.getBoundingClientRect().left); }}
      onPointerUp={event => { event.currentTarget.releasePointerCapture(event.pointerId); setResizingHistory(false); }} onPointerCancel={() => setResizingHistory(false)} onLostPointerCapture={() => setResizingHistory(false)}
      onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); resizeHistory(event.key === 'Home' ? 200 : event.key === 'End' ? panels.historyMax : historyWidth + (event.key === 'ArrowRight' ? 16 : -16)); } }} />
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
          onCommand={actions.onCommand} onFiles={actions.onFiles} onRecordAudio={actions.onRecordAudio} {...attachmentLimits} labels={labels}>{composer}</AIComposer></div>
      </>}</div>
    </div>
    {artifactOpen && <><div className="ai-workspace-separator" role="separator" tabIndex={0} aria-orientation="vertical" aria-label={l.resizeResults} aria-valuemin={25} aria-valuemax={panels.resultsMax} aria-valuenow={panels.results}
      onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); setResizing(true); }}
      onPointerMove={event => { if (!event.currentTarget.hasPointerCapture(event.pointerId)) return; const rect = root.current!.getBoundingClientRect(); resizeResults((rect.right - event.clientX) / rect.width * 100); }}
      onPointerUp={event => { event.currentTarget.releasePointerCapture(event.pointerId); setResizing(false); }} onPointerCancel={() => setResizing(false)}
      onKeyDown={event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) { event.preventDefault(); resizeResults(event.key === 'Home' ? 25 : event.key === 'End' ? panels.resultsMax : panels.results + (event.key === 'ArrowLeft' ? 2 : -2)); } }} />
      <div className="ai-workspace-results"><AIArtifactPanel artifacts={state.artifacts} value={state.artifactId} onSelect={actions.onOpenArtifact ?? (() => {})} onClose={actions.onCloseArtifact}
        onChange={actions.onArtifactChange} onDownload={actions.onDownloadArtifact} renderers={artifactRenderers} labels={labels} /></div>
    </>}
    <Modal isOpen={narrow && historyOpen} onClose={() => setHistoryOpen(false)} title={l.conversations} size="sm" fullHeight noBodyPadding hideCancel className="ai-history-dialog" overlayClassName="ai-history-dialog-overlay">{history}</Modal>
  </div></AICodeProvider>;
}
