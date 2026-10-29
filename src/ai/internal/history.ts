import type { AIConversationItem, AIConversationProject } from '../types';

export interface ConversationSection { project?: AIConversationProject; conversations: AIConversationItem[] }
export function clampHistoryWidth(width: number): number { return Number.isFinite(width) ? Math.max(200, Math.min(420, Math.round(width))) : 240; }
/** Reserva al menos 320 px de conversación; los paneles comparten el mismo presupuesto. */
export function workspacePanelWidths(available: number, requestedHistory: number, requestedResults: number, hasHistory: boolean, hasResults: boolean) {
  const historyMax = hasHistory ? Math.max(200, Math.min(420, Math.floor(available - 320 - (hasResults ? available * .25 + 10 : 5)))) : 420;
  const history = Math.min(historyMax, clampHistoryWidth(requestedHistory));
  const resultsMax = Math.max(25, Math.min(60, Math.floor((available - 320 - (hasHistory ? history + 10 : 5)) / Math.max(1, available) * 100)));
  const results = Math.max(25, Math.min(resultsMax, Number.isFinite(requestedResults) ? Math.round(requestedResults) : 40));
  return { history, historyMax, results, resultsMax };
}
/** Agrupa sin mutar los datos. Un proyecto eliminado nunca oculta sus conversaciones. */
export function conversationSections(items: AIConversationItem[], projects?: AIConversationProject[], query = ''): ConversationSection[] {
  const search = query.trim().toLocaleLowerCase();
  const byId = new Map((projects ?? []).map(project => [project.id, project]));
  const groups = new Map<string, AIConversationItem[]>();
  const unassigned: AIConversationItem[] = [];
  for (const item of items) {
    const project = item.projectId === undefined ? undefined : byId.get(item.projectId);
    if (search && !`${item.title} ${item.description ?? ''} ${project?.title ?? ''}`.toLocaleLowerCase().includes(search)) continue;
    if (!project) unassigned.push(item);
    else { const group = groups.get(project.id) ?? []; group.push(item); groups.set(project.id, group); }
  }
  const order = (list: AIConversationItem[]) => [...list.filter(item => item.pinned), ...list.filter(item => !item.pinned)];
  const sections: ConversationSection[] = [...byId.values()].filter(project => !search || groups.has(project.id) || project.title.toLocaleLowerCase().includes(search))
    .map(project => ({ project, conversations: order(groups.get(project.id) ?? []) }));
  if (unassigned.length || (!search && !byId.size)) sections.push({ conversations: order(unassigned) });
  return sections;
}
