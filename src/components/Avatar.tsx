import * as React from 'react';
import { cn } from '../utils';

export interface AvatarProps {
  /** Nombre completo; se muestran las iniciales de las dos primeras palabras. */
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'busy' | 'away';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[9px]',
  sm: 'h-8 w-8 text-[11px]',
  md: 'h-10 w-10 text-[13px]',
  lg: 'h-12 w-12 text-[15px]',
};

const statusColors = {
  online: 'bg-[var(--k-success)]',
  offline: 'bg-slate-400',
  busy: 'bg-[var(--k-danger)]',
  away: 'bg-[var(--k-warning)]',
};

const statusSizes = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', status, className }) => {
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImage = src && !imgFailed;

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full overflow-hidden font-semibold text-white bg-gradient-to-br from-[var(--k-ink-700)] to-[var(--k-ink-900)] select-none',
          sizeClasses[size],
        )}
        title={name}
      >
        {showImage ? (
          <img
            src={src}
            alt={name}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          initials(name)
        )}
      </span>
      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 rounded-full ring-2 ring-white dark:ring-slate-900',
            statusColors[status],
            statusSizes[size],
          )}
          aria-label={status}
        />
      )}
    </span>
  );
};
