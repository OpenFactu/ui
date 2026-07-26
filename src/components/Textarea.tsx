import * as React from 'react';
import { cn } from '../utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className,
  containerClassName,
  id,
  ...props
}) => {
  const generatedId = React.useId();
  const textareaId = id || generatedId;

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={textareaId}
          className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(
          'flex w-full min-h-[80px] rounded-[var(--k-radius-xs,2px)] border border-[var(--border-default,#e2e8f0)] bg-[var(--bg-card,#ffffff)] text-[13px] text-[var(--fg-default,#0a1628)] px-3 py-2 transition-colors resize-y',
          'placeholder:text-[var(--fg-subtle,#657486)] focus-visible:outline-none focus-visible:border-accent',
          'disabled:cursor-not-allowed disabled:opacity-50',
          error && 'border-[#DC2626] focus-visible:border-[#DC2626]',
          className,
        )}
        {...props}
      />
      {error && <p className="text-[11px] font-medium text-[#DC2626] mt-0.5">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-[var(--fg-subtle,#657486)] mt-0.5">
          {helperText}
        </p>
      )}
    </div>
  );
};
