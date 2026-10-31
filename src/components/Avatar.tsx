import * as React from 'react';
import { cn } from '../utils';
import { useMessages } from '../i18n/I18nProvider';

export interface AvatarProps {
  /** Nombre completo; se muestran las iniciales de las dos primeras palabras. */
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  status?: 'online' | 'offline' | 'busy' | 'away';
  /** Distintivo sobre la esquina (verificado, un icono de tipo, un contador…), como en las apps de mensajería. */
  badge?: React.ReactNode;
  /** Nombre accesible del distintivo cuando es solo un icono. */
  badgeLabel?: string;
  /** Esquina del distintivo. Default `top-right` (abajo a la derecha va el estado). */
  badgePlacement?: 'top-right' | 'bottom-right' | 'top-left' | 'bottom-left';
  className?: string;
}

const sizeClasses = {
  xs: 'h-6 w-6 text-[length:calc(9px*var(--k-text-scale,1))]',
  sm: 'h-8 w-8 text-[length:calc(11px*var(--k-text-scale,1))]',
  md: 'h-10 w-10 text-[length:calc(13px*var(--k-text-scale,1))]',
  lg: 'h-12 w-12 text-[length:calc(15px*var(--k-text-scale,1))]',
};

const statusColors = {
  online: 'bg-[var(--k-success)]',
  offline: 'bg-[var(--fg-subtle,#657486)]',
  busy: 'bg-[var(--k-danger)]',
  away: 'bg-[var(--k-warning)]',
};

const statusSizes = {
  xs: 'h-1.5 w-1.5',
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

const badgeSizes = {
  xs: 'min-w-3 h-3 text-[length:calc(7px*var(--k-text-scale,1))]',
  sm: 'min-w-3.5 h-3.5 text-[length:calc(8px*var(--k-text-scale,1))]',
  md: 'min-w-4 h-4 text-[length:calc(9px*var(--k-text-scale,1))]',
  lg: 'min-w-[18px] h-[18px] text-[length:calc(10px*var(--k-text-scale,1))]',
};

const badgePlacements = {
  'top-right': '-top-0.5 -right-0.5',
  'bottom-right': '-bottom-0.5 -right-0.5',
  'top-left': '-top-0.5 -left-0.5',
  'bottom-left': '-bottom-0.5 -left-0.5',
};

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

export const Avatar: React.FC<AvatarProps> = ({ name, src, size = 'md', status, badge, badgeLabel, badgePlacement = 'top-right', className }) => {
  const avatarTexts = useMessages('avatar');
  const [imgFailed, setImgFailed] = React.useState(false);
  const showImage = src && !imgFailed;

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'inline-flex items-center justify-center rounded-full overflow-hidden font-semibold text-white bg-[var(--k-ink-900,#0a1628)] bg-gradient-to-br from-[var(--k-ink-700)] to-[var(--k-ink-900)] select-none',
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
            'absolute bottom-0 right-0 rounded-full ring-2 ring-[var(--bg-card)]',
            statusColors[status],
            statusSizes[size],
          )}
          role="img"
          aria-label={avatarTexts.status[status]}
        />
      )}
      {badge != null && badge !== false && (
        <span
          className={cn(
            'k-avatar-badge absolute inline-flex items-center justify-center px-[2px] rounded-full ring-2 ring-[var(--bg-card)] bg-[var(--bg-card)] text-[var(--fg-default)] font-semibold leading-none [&_svg]:h-[78%] [&_svg]:w-[78%]',
            badgeSizes[size],
            badgePlacements[badgePlacement],
          )}
          role={badgeLabel ? 'img' : undefined}
          aria-label={badgeLabel}
        >
          {badge}
        </span>
      )}
    </span>
  );
};
