import * as React from 'react';
import { cn } from '../utils';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  /** name compartido de los inputs radio. Default: useId(). */
  name?: string;
  label?: string;
  error?: string;
  orientation?: 'vertical' | 'horizontal';
  disabled?: boolean;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  options,
  value,
  onChange,
  name,
  label,
  error,
  orientation = 'vertical',
  disabled = false,
  className,
}) => {
  const generatedName = React.useId();
  const groupName = name || generatedName;

  return (
    <div role="radiogroup" aria-label={label} className={cn('flex flex-col gap-2', className)}>
      {label && (
        <span className="text-[12px] font-medium text-[var(--fg-body,#2d3a4a)]">
          {label}
        </span>
      )}
      <div className={cn('flex gap-1', orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap gap-x-5')}>
        {options.map((opt) => {
          const isDisabled = disabled || opt.disabled;
          const isChecked = value === opt.value;
          return (
            <label
              key={opt.value}
              className={cn(
                'group flex items-start gap-2.5 py-1',
                isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              )}
            >
              <span className="relative flex items-center justify-center mt-0.5">
                <input
                  type="radio"
                  name={groupName}
                  value={opt.value}
                  checked={isChecked}
                  disabled={isDisabled}
                  onChange={() => onChange(opt.value)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cn(
                    'h-4 w-4 rounded-full border transition-colors peer-focus-visible:ring-1 peer-focus-visible:ring-accent peer-focus-visible:ring-offset-1',
                    isChecked
                      ? 'border-accent bg-accent'
                      : 'border-[var(--k-ink-400)] dark:border-slate-600 bg-[var(--bg-card,#ffffff)] group-hover:border-accent',
                  )}
                />
                {isChecked && (
                  <span aria-hidden className="absolute h-1.5 w-1.5 rounded-full bg-white" />
                )}
              </span>
              <span className="flex flex-col">
                <span className="text-[13px] text-[var(--fg-default,#0a1628)] leading-tight">
                  {opt.label}
                </span>
                {opt.description && (
                  <span className="text-[11px] text-[var(--fg-subtle,#657486)] mt-0.5">
                    {opt.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {error && <p className="text-[11px] font-medium text-[#DC2626]">{error}</p>}
    </div>
  );
};
