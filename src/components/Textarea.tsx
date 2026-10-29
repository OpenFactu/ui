import { ControlField, describedBy } from './internal/ControlField';
import * as React from 'react';
import { cn } from '../utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
  inputRef?: React.Ref<HTMLTextAreaElement>;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className,
  containerClassName,
  id,
  inputRef,
  ...props
}) => {
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  return (
    <ControlField id={textareaId} label={label} helperText={helperText} error={error} required={props.required} className={containerClassName}>
      <textarea
        ref={inputRef}
        data-k-control="textarea"
        id={textareaId}
        className={cn(
          'flex w-full min-h-[80px] rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] text-[13px] text-[var(--fg-default,#0a1628)] px-3 py-2 transition-colors resize-y',
          'placeholder:text-[var(--fg-subtle,#657486)] focus-visible:outline-none focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-[var(--k-danger)] focus-visible:border-[var(--k-danger)]',
          className,
        )}
        {...props}
        aria-invalid={error ? true : props['aria-invalid']}
        aria-describedby={describedBy(textareaId, error, helperText, props['aria-describedby'])}
      />
    </ControlField>
  );
};
