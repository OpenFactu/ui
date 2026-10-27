import type * as React from 'react';
import type { AILabels } from './labels';
import type { AIChangedFile, AIStepStatus, AITestSuite } from './internal/elements';
import type { AIContextUsageProps } from './AIContext';

export interface AIUIProps { className?: string; labels?: Partial<AILabels> }
export type AIRunStatus = 'idle' | 'submitting' | 'streaming' | 'waiting' | 'error' | 'cancelled';
export interface AIRun { status: AIRunStatus; error?: string; label?: string }
export interface AIModel {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
  /** Omitted capabilities are supported; false hides the corresponding input. */
  capabilities?: { attachments?: boolean; audio?: boolean; images?: boolean };
}
export interface AIAttachment {
  id: string;
  name: string;
  mediaType: string;
  size?: number;
  url?: string;
  file?: File;
  status?: 'ready' | 'uploading' | 'error';
  progress?: number;
  error?: string;
}
export interface AIMention { id: string; label: string; description?: string; insertText?: string }
export interface AICommand { id: string; label: string; description?: string; insertText?: string }
export interface AIDraft { text: string; attachments: AIAttachment[]; mentions?: AIMention[]; modelId?: string; /** Ids de herramientas del compositor activadas (ver registerComposerTool). */ tools?: string[] }
export interface AISource { id: string; title: string; url: string; description?: string }
export type AIToolStatus = 'pending' | 'running' | 'approval-required' | 'completed' | 'error' | 'cancelled' | 'denied';
export interface AITool { id: string; name: string; description?: string; status: AIToolStatus; input?: unknown; output?: unknown; error?: string; durationMs?: number }
export interface AIActivityStep { id: string; title: string; description?: string; status: AIToolStatus; durationMs?: number }

export type AIMessagePart =
  | { type: 'text'; text: string; format?: 'plain' | 'markdown' }
  | { type: 'code'; code: string; language?: string; title?: string }
  /** Cambio propuesto sobre un código; se acepta o descarta con `onAcceptDiff` / `onRejectDiff`. */
  | { type: 'diff'; id: string; original: string; modified: string; language?: string; title?: string; status?: 'pending' | 'accepted' | 'rejected' }
  | { type: 'file'; attachment: AIAttachment }
  | { type: 'image'; url: string; alt: string }
  | { type: 'audio'; src?: string; blob?: Blob; title?: string; transcript?: string }
  | { type: 'sources'; sources: AISource[] }
  | { type: 'tool'; tool: AITool }
  | { type: 'activity'; steps: AIActivityStep[] }
  | { type: 'artifact'; artifactId: string; title: string }
  /** Lo que el modelo «piensa»; se abre mientras `streaming` y se cierra al acabar. */
  | { type: 'reasoning'; text: string; streaming?: boolean; durationMs?: number }
  | { type: 'plan'; title?: string; steps: { id: string; title: string; description?: string; status: AIStepStatus }[] }
  | { type: 'queue'; items: { id: string; title: string; description?: string; status: 'todo' | 'running' | 'done' }[] }
  /** Resumen de pasos del agente («Investigó en 3 pasos»). */
  | { type: 'steps'; title?: string; steps: { id: string; title: string; description?: string; status?: 'pending' | 'running' | 'done' | 'error'; sources?: AISource[] }[] }
  | { type: 'terminal'; id?: string; command: string; output?: string; streaming?: boolean; exitCode?: number }
  /** Un `error.stack`; las trazas propias pueden abrir el archivo con `onOpenFile`. */
  | { type: 'stack'; id?: string; trace: string }
  | { type: 'tests'; suites: AITestSuite[]; durationMs?: number }
  | { type: 'files'; files: AIChangedFile[] }
  | { type: 'checkpoint'; id: string; label?: string; restored?: boolean }
  /** Parte de un plugin: se pinta con lo registrado en `registerMessagePart(kind, …)`. */
  | { type: 'custom'; kind: string; data?: unknown };
export interface AIMessageVersion { id: string; label?: string; parts: AIMessagePart[] }
export interface AIMessageData {
  id: string;
  role: 'user' | 'assistant' | 'system';
  name?: string;
  avatar?: string;
  parts: AIMessagePart[];
  status?: AIRunStatus;
  createdAt?: string;
  versions?: AIMessageVersion[];
  versionId?: string;
  feedback?: 'positive' | 'negative';
}
export interface AIConversationItem { id: string; title: string; description?: string; group?: string; pinned?: boolean; updatedAt?: string }
interface AIArtifactBase { id: string; title: string; filename?: string }
export type AIArtifact = AIArtifactBase & (
  | { kind: 'markdown' | 'code' | 'html'; content: string; language?: string; editable?: boolean }
  | { kind: 'table'; columns: { key: string; label: string }[]; rows: Record<string, unknown>[] }
  | { kind: 'image'; url: string; alt?: string }
  | { kind: 'file'; url: string; mediaType?: string; size?: number }
);
export type AIArtifactRenderer = (artifact: AIArtifact) => React.ReactNode;

export interface AIWorkspaceState {
  conversations: AIConversationItem[];
  conversationId?: string;
  messages: AIMessageData[];
  draft: AIDraft;
  models: AIModel[];
  modelId?: string;
  run: AIRun;
  artifacts: AIArtifact[];
  artifactId?: string;
  historyLoading?: boolean;
  hasOlderMessages?: boolean;
  olderMessagesLoading?: boolean;
  /** Uso de la ventana de contexto; se muestra en la cabecera del espacio de trabajo. */
  usage?: Omit<AIContextUsageProps, 'labels' | 'className'>;
}
export interface AIWorkspaceActions {
  onDraftChange: (draft: AIDraft) => void;
  onSubmit: (draft: AIDraft) => void | Promise<void>;
  onStop?: () => void;
  onRetry?: (messageId?: string) => void;
  onEditMessage?: (id: string, text: string) => void;
  onFeedback?: (id: string, feedback: 'positive' | 'negative') => void;
  onReadAloud?: (id: string, text: string) => void;
  onVersionChange?: (messageId: string, versionId: string) => void;
  onSelectConversation: (id: string) => void;
  onNewConversation?: () => void;
  onRenameConversation?: (id: string, title: string) => void;
  onDeleteConversation?: (id: string) => void;
  onPinConversation?: (id: string, pinned: boolean) => void;
  onSearchConversations?: (query: string) => void;
  onSelectModel?: (id: string) => void;
  onLoadOlderMessages?: () => void;
  onFiles?: (files: File[]) => void;
  onApproveTool?: (id: string) => void;
  onRejectTool?: (id: string) => void;
  onOpenArtifact?: (id: string) => void;
  onOpenCode?: (code: string, language?: string) => void;
  onCloseArtifact?: (id: string) => void;
  onArtifactChange?: (id: string, content: string) => void;
  onDownloadArtifact?: (artifact: AIArtifact) => void;
  onRecordAudio?: (blob: Blob) => void | Promise<void>;
  onCommand?: (command: AICommand) => void;
  /** «Aplicar» en los bloques de código. */
  /** Abre un archivo (desde una traza de error o el árbol de archivos). */
  onOpenFile?: (path: string, line?: number, column?: number) => void;
  /** Vuelve a un punto de control: conserva hasta ahí y descarta lo posterior. */
  onRestoreCheckpoint?: (id: string) => void | Promise<void>;
  onApplyCode?: (code: string, language?: string) => void | Promise<void>;
  /** «Ejecutar» en los bloques de código; la salida devuelta se muestra bajo el bloque. */
  onRunCode?: (code: string, language?: string) => string | void | Promise<string | void>;
  onAcceptDiff?: (id: string) => void | Promise<void>;
  onRejectDiff?: (id: string) => void | Promise<void>;
}
