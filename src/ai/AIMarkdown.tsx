import * as React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '../utils';
import { AICodeBlock } from './AICodeBlock';
import { safeUrl } from './internal/helpers';
import type { AIUIProps } from './types';
import { useAILabels } from './labels';
import { closeIncompleteMarkdown, splitMarkdownBlocks } from './internal/markdownStream';

export interface AIMarkdownProps extends AIUIProps {
  children: string;
  onOpenCode?: (code: string, language?: string) => void;
  /** El texto aún está llegando: lo que el último bloque tenga a medias se cierra para que no se vea su sintaxis. */
  streaming?: boolean;
}
const PLUGINS = [remarkGfm];
const URL_TRANSFORM = (url: string, key: string) => safeUrl(url, key === 'src' ? 'media' : 'link');
/** Un bloque terminado no cambia su texto, así que no se vuelve a procesar aunque siga llegando respuesta. */
const MarkdownBlock = React.memo(function MarkdownBlock({ text, components }: { text: string; components: Components }) {
  return <ReactMarkdown remarkPlugins={PLUGINS} skipHtml urlTransform={URL_TRANSFORM} components={components}>{text}</ReactMarkdown>;
});
function MarkdownImage({ src, alt, unavailable }: { src?: string; alt?: string; unavailable: string }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  return !src || failed ? <span className="ai-muted">{alt || unavailable}</span> : <img src={src} alt={alt ?? ''} loading="lazy" onError={() => setFailed(true)} />;
}
export const AIMarkdown = React.memo(function AIMarkdown({ children, onOpenCode, streaming, labels, className }: AIMarkdownProps) {
  const l = useAILabels(labels);
  // Una función nueva en cada render no debe rehacer los bloques: se llama a la última, y solo importa si la hay o no.
  const openCode = React.useRef(onOpenCode);
  openCode.current = onOpenCode;
  const hasOpenCode = Boolean(onOpenCode);
  const components = React.useMemo<Components>(() => ({
    a: ({ href, children }) => href ? <a href={href} target="_blank" rel="noopener noreferrer">{children}</a> : <span>{children}</span>,
    img: ({ src, alt }) => <MarkdownImage src={typeof src === 'string' ? src : undefined} alt={alt} unavailable={l.imageUnavailable} />,
    table: ({ children }) => <div className="ai-md-table"><table>{children}</table></div>,
    pre: ({ children }) => {
      const child = React.Children.toArray(children).find(React.isValidElement) as React.ReactElement<{ children?: React.ReactNode; className?: string }> | undefined;
      const code = String(child?.props.children ?? '').replace(/\n$/, '');
      const language = /language-([^\s]+)/.exec(child?.props.className ?? '')?.[1];
      return <AICodeBlock code={code} language={language} labels={labels} onOpen={hasOpenCode ? (...args) => openCode.current?.(...args) : undefined} />;
    },
  }), [hasOpenCode, labels, l.imageUnavailable]);
  const blocks = React.useMemo(() => {
    const list = splitMarkdownBlocks(children);
    if (streaming && list.length) list[list.length - 1] = closeIncompleteMarkdown(list[list.length - 1]);
    return list;
  }, [children, streaming]);
  return <div className={cn('ai-surface ai-markdown', className)}>{blocks.map((text, index) => (text ? <MarkdownBlock key={index} text={text} components={components} /> : null))}</div>;
});
