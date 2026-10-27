import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import type { AISource, AIUIProps } from './types';
import { aiLabels } from './labels';
import { safeUrl } from './internal/helpers';

export interface AISourcesProps extends AIUIProps { sources: AISource[] }
export const AISources = React.memo(function AISources({ sources, labels, className }: AISourcesProps) {
  const l = aiLabels(labels);
  if (!sources.length) return null;
  return <section className={cn('ai-surface ai-sources', className)} aria-label={l.sources}><h4><UiIcon slot="link-2" size={13} />{l.sources}</h4>
    <ol>{sources.map((source, index) => <li key={source.id}>{safeUrl(source.url) ? <a href={safeUrl(source.url)} target="_blank" rel="noopener noreferrer"><span className="ai-source-number">{index + 1}</span><span><strong>{source.title}</strong>{source.description && <small>{source.description}</small>}</span><UiIcon slot="arrow-up-right" size={13} /></a> : <span>{source.title}</span>}</li>)}</ol>
  </section>;
});
