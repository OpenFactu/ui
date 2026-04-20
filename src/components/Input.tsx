import * as React from 'react';
import { cn } from '../utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  containerClassName?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  helperText,
  leftIcon,
  rightIcon,
  className,
  containerClassName,
  id,
  ...props
}) => {
  const inputId = id || React.useId();

  return (
    <div className={cn('flex flex-col gap-1.5 w-full', containerClassName)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[12px] font-medium text-[var(--k-ink-700)] dark:text-slate-300"
        >
          {label}
        </label>
      )}
      <div className="relative group">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--k-ink-400)] dark:text-slate-500 group-focus-within:text-accent transition-colors">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={cn(
            'flex w-full rounded-[2px] border border-[var(--k-line)] dark:border-slate-700 bg-white dark:bg-slate-900 text-[13px] text-[var(--k-ink-900)] dark:text-slate-100 px-3 py-2 transition-colors',
            'file:border-0 file:bg-transparent file:text-sm file:font-medium',
            'placeholder:text-[var(--k-ink-400)] dark:placeholder:text-slate-500 focus-visible:outline-none focus-visible:border-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            leftIcon && 'pl-10',
            rightIcon && 'pr-10',
            error && 'border-[#DC2626] focus-visible:border-[#DC2626]',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--k-ink-400)] dark:text-slate-500 group-focus-within:text-accent transition-colors">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="text-[11px] font-medium text-[#DC2626] mt-0.5">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p className="text-[11px] text-[var(--k-ink-400)] dark:text-slate-500 mt-0.5">
          {helperText}
        </p>
      )}
    </div>
  );
};
