import * as React from 'react';
import { cn } from '../utils';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  className?: string;
  id?: string;
}

const sizeClasses = {
  sm: { track: 'w-7 h-4', thumb: 'w-3 h-3', translate: 'translate-x-3' },
  md: { track: 'w-9 h-5', thumb: 'w-4 h-4', translate: 'translate-x-4' },
};

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  size = 'md',
  className,
  id,
}) => {
  const generatedId = React.useId();
  const switchId = id || generatedId;
  const s = sizeClasses[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 items-center rounded-full p-0.5 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent focus-visible:ring-offset-1',
          s.track,
          checked ? 'bg-accent' : 'bg-[var(--border-strong)]',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block rounded-full bg-white shadow transition-transform duration-200',
            s.thumb,
            checked ? s.translate : 'translate-x-0',
          )}
        />
      </button>
      {label && (
        <label
          htmlFor={switchId}
          className={cn(
            'text-[13px] text-[var(--fg-body,#2d3a4a)] select-none',
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};
