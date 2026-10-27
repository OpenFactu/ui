import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Modal } from '../components/Modal';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { DropdownMenu } from '../components/DropdownMenu';
import { cn } from '../utils';
import type { AIConversationItem, AIUIProps } from './types';
import { aiLabels } from './labels';
import { AIStatus } from './internal/ui';

export interface AIConversationHistoryProps extends AIUIProps {
  conversations: AIConversationItem[]; value?: string; onSelect: (id: string) => void;
  onNew?: () => void; onRename?: (id: string, title: string) => void; onDelete?: (id: string) => void;
  onPin?: (id: string, pinned: boolean) => void; onSearch?: (query: string) => void; loading?: boolean;
}
export function AIConversationHistory({ conversations, value, onSelect, onNew, onRename, onDelete, onPin, onSearch, loading, labels, className }: AIConversationHistoryProps) {
  const l = aiLabels(labels); const [query, setQuery] = React.useState('');
  const [renaming, setRenaming] = React.useState<AIConversationItem>(); const [title, setTitle] = React.useState('');
  const [deleting, setDeleting] = React.useState<AIConversationItem>();
  const visible = onSearch ? conversations : conversations.filter(item => `${item.title} ${item.description ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  const ordered = [...visible.filter(item => item.pinned), ...visible.filter(item => !item.pinned)];
  return <nav className={cn('ai-surface ai-history', className)} aria-label={l.conversations}>
    <header><strong>{l.conversations}</strong>{onNew && <Button size="sm" variant="secondary" onClick={onNew}><UiIcon slot="plus" size={14} />{l.newConversation}</Button>}</header>
    <div className="ai-history-search"><UiIcon slot="search" size={14} /><Input aria-label={l.searchConversations} placeholder={l.searchConversations} value={query} onChange={event => { setQuery(event.target.value); onSearch?.(event.target.value); }} /></div>
    <div className="ai-history-list">{loading ? <AIStatus>{l.loading}</AIStatus> : !ordered.length ? <p className="ai-muted">{query ? l.noSearchResults : l.noConversations}</p> : ordered.map((item, index) => <React.Fragment key={item.id}>
      {(index === 0 || !!ordered[index - 1].pinned !== !!item.pinned || ordered[index - 1].group !== item.group) && (item.pinned || item.group) && <div className="ai-history-group">{item.pinned ? l.pinned : item.group}</div>}
      <div className="ai-history-item" data-selected={item.id === value || undefined}>
        <button type="button" onClick={() => onSelect(item.id)} aria-current={item.id === value ? 'page' : undefined}><UiIcon slot="message-square" size={14} /><span><strong>{item.title}</strong>{item.description && <small>{item.description}</small>}</span>{item.pinned && <UiIcon slot="pin" size={11} />}</button>
        {(onRename || onDelete || onPin) && <DropdownMenu items={[
          ...(onPin ? [{ label: item.pinned ? l.unpin : l.pin, icon: <UiIcon slot="pin" size={13} />, onClick: () => onPin(item.id, !item.pinned) }] : []),
          ...(onRename ? [{ label: l.rename, icon: <UiIcon slot="pencil" size={13} />, onClick: () => { setRenaming(item); setTitle(item.title); } }] : []),
          ...(onDelete ? [{ label: l.delete, icon: <UiIcon slot="trash-2" size={13} />, destructive: true, onClick: () => setDeleting(item) }] : []),
        ]}><button type="button" className="ai-icon-button" aria-label={`${l.conversations}: ${item.title}`}><UiIcon slot="more-horizontal" size={14} /></button></DropdownMenu>}
      </div>
    </React.Fragment>)}</div>
    <Modal isOpen={!!renaming} onClose={() => setRenaming(undefined)} title={l.rename} size="sm" hideCancel><form onSubmit={event => { event.preventDefault(); if (renaming && title.trim()) { onRename?.(renaming.id, title.trim()); setRenaming(undefined); } }}><Input label={l.rename} autoFocus value={title} onChange={event => setTitle(event.target.value)} /><div className="ai-inline-actions ai-dialog-actions"><Button type="submit" size="sm" disabled={!title.trim()}>{l.save}</Button><Button size="sm" variant="secondary" onClick={() => setRenaming(undefined)}>{l.cancel}</Button></div></form></Modal>
    <ConfirmDialog open={!!deleting} title={l.deleteConversation} message={<>{l.deleteConversationHint} <strong>{deleting?.title}</strong></>} confirmLabel={l.delete} cancelLabel={l.cancel} onCancel={() => setDeleting(undefined)} onConfirm={() => { if (deleting) onDelete?.(deleting.id); setDeleting(undefined); }} />
  </nav>;
}
