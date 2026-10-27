import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import { aiLabels } from './labels';
import type { AIUIProps } from './types';
import { buildFileTree, type AIChangedFile, type AIFileNode } from './internal/elements';

export type { AIChangedFile } from './internal/elements';
export interface AIFileTreeProps extends AIUIProps {
  files: AIChangedFile[];
  selected?: string;
  onSelect?: (path: string) => void;
  /** Carpetas abiertas al montar. Por defecto, todas. */
  defaultExpanded?: 'all' | 'none';
  /** Contenido a la derecha de cada archivo (por ejemplo, un botón «Revertir»). */
  renderActions?: (file: AIChangedFile) => React.ReactNode;
}
const STATUS_LABEL = { added: 'fileAdded', modified: 'fileModified', deleted: 'fileDeleted' } as const;

/** Los archivos que tocó el agente, en carpetas plegables. Para un solo archivo, una línea de herramienta basta. */
export const AIFileTree = React.memo(function AIFileTree({ files, selected, onSelect, defaultExpanded = 'all', renderActions, labels, className }: AIFileTreeProps) {
  const l = aiLabels(labels);
  const tree = React.useMemo(() => buildFileTree(files), [files]);
  const [closed, setClosed] = React.useState<ReadonlySet<string>>(() => new Set());
  const [opened, setOpened] = React.useState<ReadonlySet<string>>(() => new Set());
  const isOpen = (path: string) => defaultExpanded === 'all' ? !closed.has(path) : opened.has(path);
  const toggle = (path: string) => (defaultExpanded === 'all' ? setClosed : setOpened)(current => { const next = new Set(current); if (!next.delete(path)) next.add(path); return next; });
  const render = (nodes: AIFileNode[], depth: number): React.ReactNode => nodes.map(node => {
    const indent = { paddingInlineStart: `calc(${depth} * 14px + 8px)` };
    if (node.kind === 'folder') {
      const open = isOpen(node.path);
      return <li key={node.path} role="treeitem" aria-expanded={open}>
        <button type="button" className="ai-tree-row" style={indent} onClick={() => toggle(node.path)}>
          <UiIcon slot="chevron-right" size={13} className="ai-tree-chevron" data-open={open || undefined} aria-hidden="true" />
          {open ? <UiIcon slot="folder-open" size={14} aria-hidden="true" /> : <UiIcon slot="folder" size={14} aria-hidden="true" />}<span className="ai-tree-name">{node.name}</span>
        </button>
        {open && <ul role="group" className="ai-tree-children">{render(node.children, depth + 1)}</ul>}
      </li>;
    }
    const { file } = node;
    return <li key={node.path} role="treeitem" aria-selected={selected === node.path}>
      <div className="ai-tree-file" data-selected={selected === node.path || undefined}>
        <button type="button" className="ai-tree-row" style={indent} onClick={() => onSelect?.(node.path)} data-status={file.status} title={file.status ? l[STATUS_LABEL[file.status]] : undefined}>
          <UiIcon slot="file" size={14} aria-hidden="true" /><span className="ai-tree-name">{node.name}</span>
          {file.status && <span className="ai-sr-only"> ({l[STATUS_LABEL[file.status]]})</span>}
          {(file.additions !== undefined || file.deletions !== undefined) && <span className="ai-tree-stats" aria-hidden="true">{!!file.additions && <span data-kind="add">+{file.additions}</span>}{!!file.deletions && <span data-kind="remove">−{file.deletions}</span>}</span>}
        </button>
        {renderActions && <div className="ai-tree-actions">{renderActions(file)}</div>}
      </div>
    </li>;
  });
  return <ul role="tree" aria-label={l.changedFiles} className={cn('ai-surface ai-tree', className)}>{render(tree, 0)}</ul>;
});
