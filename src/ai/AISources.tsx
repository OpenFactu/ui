import * as React from 'react';
import { UiIcon } from '../icons';
import { cn } from '../utils';
import type { AISource, AIUIProps } from './types';
import { useAILabels } from './labels';
import { safeUrl } from './internal/helpers';

export interface AISourcesProps extends AIUIProps { sources: AISource[] }
export const AISources = React.memo(function AISources({ sources, labels, className }: AISourcesProps) {
  const l = useAILabels(labels);
  if (!sources.length) return null;
  return <section className={cn('ai-surface ai-sources', className)} aria-label={l.sources}><h4><UiIcon slot="link-2" size={13} />{l.sources}</h4>
    <ol>{sources.map((source, index) => {
      const url = safeUrl(source.url);
      const content = <><span className="ai-source-number">{index + 1}</span><span className="ai-source-content"><strong>{source.title}</strong>{source.description && <small>{source.description}</small>}</span>{url && <UiIcon slot="arrow-up-right" size={15} aria-hidden="true" />}</>;
      return <li key={source.id}>{url ? <a href={url} target="_blank" rel="noopener noreferrer">{content}</a> : <div className="ai-source-unlinked">{content}</div>}</li>;
    })}</ol>
  </section>;
});
