import * as React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils';
import { AICodeBlock } from './AICodeBlock';
import { safeUrl } from './internal/helpers';
import type { AIUIProps } from './types';
import { useAILabels } from './labels';

export interface AIMarkdownProps extends AIUIProps { children: string; onOpenCode?: (code: string, language?: string) => void }
const PLUGINS = [remarkGfm];
function MarkdownImage({ src, alt, unavailable }: { src?: string; alt?: string; unavailable: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  return !src || failed ? <span className="ai-muted">{alt || unavailable}</span> : <img src={src} alt={alt ?? ''} loading="lazy" onError={() => setFailed(true)} />;
}
export const AIMarkdown = React.memo(function AIMarkdown({ children, onOpenCode, labels, className }: AIMarkdownProps) {
  const l = useAILabels(labels);
  const components = React.useMemo<Components>(() => ({
    a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
    img: ({ src, alt }) => <MarkdownImage src={typeof src === 'string' ? src : undefined} alt={alt} unavailable={l.imageUnavailable} />,
    table: ({ children }) => <div className="ai-md-table"><table>{children}</table></div>,
    pre: ({ children }) => {
      const child = React.Children.toArray(children).find(React.isValidElement) as React.ReactElement<{ children?: React.ReactNode; className?: string }> | undefined;
      const code = String(child?.props.children ?? '').replace(/\n$/, '');
      const language = /language-([^\s]+)/.exec(child?.props.className ?? '')?.[1];
      return <AICodeBlock code={code} language={language} labels={labels} onOpen={onOpenCode} />;
    },
  }), [onOpenCode, labels, l.imageUnavailable]);
  return <div className={cn('ai-surface ai-markdown', className)}><ReactMarkdown remarkPlugins={PLUGINS} skipHtml
    urlTransform={(url, key) => safeUrl(url, key === 'src' ? 'media' : 'link')} components={components}>{children}</ReactMarkdown></div>;
});
