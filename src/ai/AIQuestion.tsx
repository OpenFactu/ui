import * as React from 'react';
import { UiIcon } from '../icons';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Progress } from '../components/Progress';
import { useComponentDefaults } from '../context/ComponentDefaults';
import { resolveItemClass, type ItemClassName, type ItemRenderState } from '../components/internal/optionStyle';
import { useI18n } from '../i18n/I18nProvider';
import { cn } from '../utils';
import { useAILabels } from './labels';
import type { AIQuestionAnswer, AIQuestionData, AIQuestionOption, AIUIProps } from './types';

export interface AIQuestionProps extends AIUIProps, Omit<AIQuestionData, 'id'> {
  /** Se llama con la respuesta. Si es asíncrona, los controles esperan; si falla, se ve el error y se puede repetir. */
  onAnswer?: (answer: AIQuestionAnswer) => void | Promise<void>;
  disabled?: boolean;
  /** Pinta cada opción. El botón, el teclado y el estado siguen siendo del componente. */
  renderOption?: (option: AIQuestionOption, state: ItemRenderState) => React.ReactNode;
  optionClassName?: ItemClassName<AIQuestionOption>;
}

/**
 * Una pregunta del asistente a la persona: opciones, varias a la vez, texto libre o todo junto, con «paso 2 de 5» en los
 * flujos guiados. Va como parte de un mensaje (`{ type: 'question', … }`), o suelta encima del compositor para que un
 * flujo guiado avance siempre en el mismo sitio.
 */
export function AIQuestion(rawProps: AIQuestionProps) {
  const { question, options = [], multiple, allowText, placeholder, step, answer: answerProp, onAnswer, disabled, renderOption, optionClassName, labels, className } = useComponentDefaults('AIQuestion', rawProps);
  const l = useAILabels(labels);
  const { format } = useI18n();
  const id = React.useId();
  const [selected, setSelected] = React.useState<ReadonlySet<string>>(() => new Set());
  const [text, setText] = React.useState('');
  const [sent, setSent] = React.useState<AIQuestionAnswer | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const answer = answerProp ?? sent;
  const locked = Boolean(disabled || busy || answer);
  const keyOf = (option: AIQuestionOption) => option.id ?? option.label;

  const send = async (next: AIQuestionAnswer) => {
    if (locked) return;
    setBusy(true); setError('');
    try { await onAnswer?.(next); setSent(next); } catch (reason) { setError(reason instanceof Error ? reason.message : l.error); } finally { setBusy(false); }
  };
  const fromOptions = (chosen: AIQuestionOption[], extra = ''): AIQuestionAnswer => ({
    optionIds: chosen.map(keyOf),
    ...(extra ? { text: extra } : null),
    label: [...chosen.map((option) => option.label), ...(extra ? [extra] : [])].join(', '),
  });
  const choose = (option: AIQuestionOption) => {
    if (locked || option.disabled) return;
    if (!multiple) { void send(fromOptions([option])); return; }
    setSelected((current) => { const next = new Set(current); if (next.has(keyOf(option))) next.delete(keyOf(option)); else next.add(keyOf(option)); return next; });
  };
  const confirm = () => {
    const chosen = options.filter((option) => selected.has(keyOf(option)));
    const extra = text.trim();
    if (chosen.length || extra) void send(fromOptions(chosen, extra));
  };

  if (answer) {
    return (
      <section className={cn('ai-surface ai-question', className)} data-answered="">
        <p className="ai-question-title">{question}</p>
        <p className="ai-question-answer"><UiIcon slot="check" size={13} /><span className="sr-only">{l.questionAnswered}: </span>{answer.label}</p>
      </section>
    );
  }

  const canConfirm = selected.size > 0 || Boolean(text.trim());
  return (
    <section className={cn('ai-surface ai-question', className)} role="group" aria-labelledby={`${id}-title`} aria-busy={busy || undefined}>
      {step && (
        <div className="ai-question-step">
          <div>
            <span>{step.title ?? l.questionGuided}</span>
            <span>{format(l.questionStep, { current: step.current, total: step.total })}</span>
          </div>
          <Progress size="sm" value={Math.min(100, (step.current / Math.max(1, step.total)) * 100)} />
        </div>
      )}
      <p className="ai-question-title" id={`${id}-title`}>{question}</p>
      {options.length > 0 && (
        <div className="ai-question-options">
          {options.map((option) => {
            const on = selected.has(keyOf(option));
            const content = (
              <>
                <span className="ai-question-option-label">{multiple && on && <UiIcon slot="check" size={12} />}{option.icon}{option.label}</span>
                {option.description && <small>{option.description}</small>}
              </>
            );
            const state: ItemRenderState = { selected: on, highlighted: false, disabled: Boolean(locked || option.disabled), query: '', label: option.label, content };
            return (
              <button
                key={keyOf(option)}
                type="button"
                className={cn('ai-question-option k-press', resolveItemClass(optionClassName, option, state))}
                aria-pressed={multiple ? on : undefined}
                disabled={state.disabled}
                onClick={() => choose(option)}
              >
                {renderOption ? renderOption(option, state) : content}
              </button>
            );
          })}
        </div>
      )}
      {allowText && (
        <div className="ai-question-text">
          <Input
            aria-label={placeholder ?? l.questionPlaceholder}
            placeholder={placeholder ?? l.questionPlaceholder}
            value={text}
            disabled={locked}
            containerClassName="flex-1"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return;
              event.preventDefault();
              if (multiple) confirm(); else if (text.trim()) void send(fromOptions([], text.trim()));
            }}
          />
          {!multiple && <Button size="sm" aria-label={l.questionSend} disabled={locked || !text.trim()} onClick={() => void send(fromOptions([], text.trim()))}><UiIcon slot="arrow-up" size={14} /></Button>}
        </div>
      )}
      {multiple && <div><Button size="sm" disabled={locked || !canConfirm} onClick={confirm}>{l.questionConfirm}</Button></div>}
      {error && <p className="ai-error" role="alert">{error}</p>}
    </section>
  );
}
