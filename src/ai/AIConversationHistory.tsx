import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DropdownMenu } from '../components/DropdownMenu';
import { cn } from '../utils';
import type { AIConversationItem, AIConversationProject, AIUIProps } from './types';
import { aiLabels } from './labels';
import { AIStatus } from './internal/ui';
import { conversationSections } from './internal/history';

export interface AIConversationHistoryProps extends AIUIProps {
  conversations: AIConversationItem[]; value?: string; onSelect: (id: string) => void;
  onNew?: (projectId?: string) => void; onRename?: (id: string, title: string) => void; onDelete?: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void; onSearch?: (query: string) => void; loading?: boolean;
  projects?: AIConversationProject[];
  onCreateProject?: (title: string) => void; onRenameProject?: (id: string, title: string) => void;
  /** Elimina el proyecto conservando sus conversaciones sin asignación. */
  onDeleteProject?: (id: string) => void; onMoveConversation?: (id: string, projectId?: string) => void;
}
export function AIConversationHistory({ conversations, projects, value, onSelect, onNew, onRename, onDelete, onPin, onSearch, onCreateProject, onRenameProject, onDeleteProject, onMoveConversation, loading, labels, className }: AIConversationHistoryProps) {
  const l = aiLabels(labels); const [query, setQuery] = React.useState('');
  const [renaming, setRenaming] = React.useState<AIConversationItem>(); const [title, setTitle] = React.useState('');
  const [deleting, setDeleting] = React.useState<AIConversationItem>();
  const [projectEditor, setProjectEditor] = React.useState<{ project?: AIConversationProject; title: string }>();
  const [deletingProject, setDeletingProject] = React.useState<AIConversationProject>();
  const [moving, setMoving] = React.useState<AIConversationItem>(); const [destination, setDestination] = React.useState('');
  const [collapsed, setCollapsed] = React.useState<Set<string>>(() => new Set());
  const sectionId = React.useId();
  const withProjects = projects !== undefined || !!onCreateProject;
  const sections = conversationSections(conversations, projects, onSearch ? '' : query);
  const selectedProject = conversations.find(item => item.id === value)?.projectId;
  React.useEffect(() => { if (selectedProject !== undefined) setCollapsed(current => { if (!current.has(selectedProject)) return current; const next = new Set(current); next.delete(selectedProject); return next; }); }, [value, selectedProject]);
  const toggle = (id: string) => setCollapsed(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const renderItems = (ordered: AIConversationItem[], legacyGroups = true) => ordered.map((item, index) => <React.Fragment key={item.id}>
      {legacyGroups && (index === 0 || !!ordered[index - 1].pinned !== !!item.pinned || ordered[index - 1].group !== item.group) && (item.pinned || item.group) && <div className="ai-history-group">{item.pinned ? l.pinned : item.group}</div>}
      <div className="ai-history-item" data-selected={item.id === value || undefined}>
        <button type="button" onClick={() => onSelect(item.id)} aria-current={item.id === value ? 'page' : undefined}><UiIcon slot="message-square" size={14} /><span><strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</span>{item.pinned && <UiIcon slot="pin" size={11} />}</button>
        {(onRename || onDelete || onPin || (withProjects && onMoveConversation)) && <DropdownMenu align="end" items={[
          ...(onPin ? [{ label: item.pinned ? l.unpin : l.pin, icon: <UiIcon slot="pin" size={13} />, onClick: () => onPin(item.id, !item.pinned) }] : []),
          ...(withProjects && onMoveConversation ? [{ label: l.moveToProject, icon: <UiIcon slot="folder" size={13} />, onClick: () => { setMoving(item); setDestination(projects?.some(project => project.id === item.projectId) ? item.projectId! : ''); } }] : []),
          ...(onRename ? [{ label: l.rename, icon: <UiIcon slot="pencil" size={13} />, onClick: () => { setRenaming(item); setTitle(item.title); } }] : []),
          ...(onDelete ? [{ label: l.delete, icon: <UiIcon slot="trash-2" size={13} />, destructive: true, onClick: () => setDeleting(item) }] : []),
        ]}><button type="button" className="ai-icon-button" aria-label={`${l.conversations}: ${item.title}`}><UiIcon slot="more-horizontal" size={14} /></button></DropdownMenu>}
      </div>
    </React.Fragment>);
  return <nav className={cn('ai-surface ai-history', className)} aria-label={l.conversations}>
    <header><strong>{l.conversations}</strong>{onNew && <Button size="sm" variant="secondary" onClick={() => onNew()}><UiIcon slot="plus" size={14} />{l.newConversation}</Button>}</header>
    <div className="ai-history-search"><UiIcon slot="search" size={14} /><Input aria-label={l.searchConversations} placeholder={l.searchConversations} value={query} onChange={event => { setQuery(event.target.value); onSearch?.(event.target.value); }} /></div>
    <div className="ai-history-list" aria-busy={loading || undefined}>
      {withProjects && <div className="ai-history-projects-heading"><strong>{l.projects}</strong>{onCreateProject && <button type="button" className="ai-icon-button" aria-label={l.newProject} title={l.newProject} onClick={() => setProjectEditor({ title: '' })}><UiIcon slot="plus" size={15} /></button>}</div>}
      {loading ? <AIStatus>{l.loading}</AIStatus> : !sections.length ? <p className="ai-muted">{query ? l.noSearchResults : l.noConversations}</p> : sections.map(({ project, conversations: items }) => {
        if (!project) return <section key="unassigned" aria-label={withProjects ? l.noProject : undefined}>{withProjects && !!items.length && <div className="ai-history-group">{l.noProject}</div>}{items.length ? renderItems(items) : <p className="ai-muted">{query ? l.noSearchResults : l.noConversations}</p>}</section>;
        const open = !!query.trim() || !collapsed.has(project.id);
        const contentId = `${sectionId}-${encodeURIComponent(project.id)}`;
        return <section className="ai-history-project" key={`project-${project.id}`} aria-label={project.title}>
          <div className="ai-history-project-header"><button type="button" className="ai-history-project-toggle" aria-label={project.title} aria-expanded={open} aria-controls={contentId} onClick={() => toggle(project.id)}>
            <UiIcon slot={open ? 'chevron-down' : 'chevron-right'} size={12} /><UiIcon slot={open ? 'folder-open' : 'folder'} size={15} /><span>{project.title}</span><small>{items.length}</small>
          </button>{(onNew || onRenameProject || onDeleteProject) && <DropdownMenu align="end" items={[
            ...(onNew ? [{ label: l.newConversation, icon: <UiIcon slot="plus" size={13} />, onClick: () => { setCollapsed(current => { const next = new Set(current); next.delete(project.id); return next; }); onNew(project.id); } }] : []),
            ...(onRenameProject ? [{ label: l.renameProject, icon: <UiIcon slot="pencil" size={13} />, onClick: () => setProjectEditor({ project, title: project.title }) }] : []),
            ...(onDeleteProject ? [{ label: l.deleteProject, icon: <UiIcon slot="trash-2" size={13} />, destructive: true, onClick: () => setDeletingProject(project) }] : []),
          ]}><button type="button" className="ai-icon-button" aria-label={`${l.project}: ${project.title}`}><UiIcon slot="more-horizontal" size={14} /></button></DropdownMenu>}</div>
          <div id={contentId} hidden={!open} className="ai-history-project-content">{items.length ? renderItems(items, false) : <p className="ai-history-project-empty">{l.emptyProject}</p>}</div>
        </section>;
      })}
    </div>
    <Modal isOpen={!!projectEditor} onClose={() => setProjectEditor(undefined)} title={projectEditor?.project ? l.renameProject : l.newProject} size="sm" hideCancel><form onSubmit={event => { event.preventDefault(); const name = projectEditor?.title.trim(); if (!name || !projectEditor) return; if (projectEditor.project) onRenameProject?.(projectEditor.project.id, name); else onCreateProject?.(name); setProjectEditor(undefined); }}>
      <Input label={l.projectName} autoFocus value={projectEditor?.title ?? ''} onChange={event => setProjectEditor(current => current && ({ ...current, title: event.target.value }))} /><div className="ai-inline-actions ai-dialog-actions"><Button type="submit" size="sm" disabled={!projectEditor?.title.trim()}>{l.save}</Button><Button type="button" size="sm" variant="secondary" onClick={() => setProjectEditor(undefined)}>{l.cancel}</Button></div>
    </form></Modal>
    <Modal isOpen={!!moving} onClose={() => setMoving(undefined)} title={l.moveToProject} size="sm" hideCancel><form onSubmit={event => { event.preventDefault(); if (moving) onMoveConversation?.(moving.id, projects?.some(project => project.id === destination) ? destination : undefined); setMoving(undefined); }}>
      <p className="ai-muted">{moving?.title}</p><Select label={l.project} value={destination} onChange={setDestination} options={[{ value: '', label: l.noProject }, ...(projects ?? []).map(project => ({ value: project.id, label: project.title }))]} /><div className="ai-inline-actions ai-dialog-actions"><Button type="submit" size="sm">{l.save}</Button><Button type="button" size="sm" variant="secondary" onClick={() => setMoving(undefined)}>{l.cancel}</Button></div>
    </form></Modal>
    <ConfirmDialog open={!!deletingProject} title={l.deleteProject} message={<><strong>{deletingProject?.title}</strong><p>{l.deleteProjectHint}</p></>} confirmLabel={l.delete} cancelLabel={l.cancel} onCancel={() => setDeletingProject(undefined)} onConfirm={() => { if (deletingProject) onDeleteProject?.(deletingProject.id); setDeletingProject(undefined); }} />
    <Modal isOpen={!!renaming} onClose={() => setRenaming(undefined)} title={l.rename} size="sm" hideCancel><form onSubmit={event => { event.preventDefault(); if (renaming && title.trim()) { onRename?.(renaming.id, title.trim()); setRenaming(undefined); } }}><Input label={l.rename} autoFocus value={title} onChange={event => setTitle(event.target.value)} /><div className="ai-inline-actions ai-dialog-actions"><Button type="submit" size="sm" disabled={!title.trim()}>{l.save}</Button><Button size="sm" variant="secondary" onClick={() => setRenaming(undefined)}>{l.cancel}</Button></div></form></Modal>
    <ConfirmDialog open={!!deleting} title={l.deleteConversation} message={<>{l.deleteConversationHint} <strong>{deleting?.title}</strong></>} confirmLabel={l.delete} cancelLabel={l.cancel} onCancel={() => setDeleting(undefined)} onConfirm={() => { if (deleting) onDelete?.(deleting.id); setDeleting(undefined); }} />
  </nav>;
}
