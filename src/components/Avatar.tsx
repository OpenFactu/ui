import * as React from 'react';
import { cn } from '../utils';
import { useI18n, useMessages } from '../i18n/I18nProvider';
import { useComponentDefaults } from '../context/ComponentDefaults';

export interface AvatarProps {
  /** Nombre completo; se muestran las iniciales de las dos primeras palabras. */
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  /**
   * Color del fondo. `auto` (por defecto): un tono estable sacado del nombre, para distinguir a las personas de un vistazo.
   * `accent`: el del tema. `ink`: tinta oscura. O cualquier color CSS. El texto y el fondo se ajustan al modo claro u oscuro.
   */
  color?: 'auto' | 'accent' | 'ink' | (string & {});
  /** `circle` (por defecto), `rounded` o `square`, con los radios del tema. */
  shape?: 'circle' | 'rounded' | 'square';
  /** En lugar de las iniciales: un icono, para un asistente o una empresa. */
  fallback?: React.ReactNode;
  /** El nombre ya se lee al lado: el avatar no lo repite al lector de pantalla. */
  decorative?: boolean;
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
  xl: 'h-16 w-16 text-[length:calc(20px*var(--k-text-scale,1))]',
};

const shapeClasses = {
  circle: 'rounded-full',
  rounded: 'rounded-[var(--k-radius-md,8px)]',
  square: 'rounded-[var(--k-radius-xs,2px)]',
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
  xl: 'h-3.5 w-3.5',
};

const badgeSizes = {
  xs: 'min-w-3 h-3 text-[length:calc(7px*var(--k-text-scale,1))]',
  sm: 'min-w-3.5 h-3.5 text-[length:calc(8px*var(--k-text-scale,1))]',
  md: 'min-w-4 h-4 text-[length:calc(9px*var(--k-text-scale,1))]',
  lg: 'min-w-[18px] h-[18px] text-[length:calc(10px*var(--k-text-scale,1))]',
  xl: 'min-w-5 h-5 text-[length:calc(11px*var(--k-text-scale,1))]',
};

const badgePlacements = {
  'top-right': '-top-0.5 -right-0.5',
  'bottom-right': '-bottom-0.5 -right-0.5',
  'top-left': '-top-0.5 -left-0.5',
  'bottom-left': '-bottom-0.5 -left-0.5',
};

/** Iniciales de las dos primeras palabras, sin partir un emoji ni una letra compuesta. */
export function avatarInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((word) => (Array.from(word)[0] ?? '').toUpperCase()).join('');
}

/** Tono (0-359) estable para un nombre: la misma persona sale siempre del mismo color. */
export function avatarHue(name: string): number {
  let hash = 0;
  for (const char of name.trim().toLowerCase()) hash = (Math.imul(hash, 31) + (char.codePointAt(0) ?? 0)) | 0;
  // A saltos de 30°: tonos que se distinguen entre sí, no 360 casi iguales.
  return (Math.abs(hash) % 12) * 30;
}

/** La tinta oscura de siempre; fija, no se invierte con el modo. */
const INK_CLASSES = 'text-white bg-[var(--k-ink-900,#0a1628)] bg-gradient-to-br from-[var(--k-ink-700)] to-[var(--k-ink-900)] select-none';

export const Avatar: React.FC<AvatarProps> = (rawProps) => {
  const { name, src, size = 'md', color = 'auto', shape = 'circle', fallback, decorative, status, badge, badgeLabel, badgePlacement = 'top-right', className } = useComponentDefaults('Avatar', rawProps);
  const avatarTexts = useMessages('avatar');
  const [imgFailed, setImgFailed] = React.useState(false);
  // Otra imagen merece otra oportunidad.
  React.useEffect(() => setImgFailed(false), [src]);
  const image = React.useRef<HTMLImageElement>(null);
  // Se oculta solo si de verdad está cargando: la que ya está en caché, o sin JavaScript, se ve desde el principio.
  React.useLayoutEffect(() => { if (image.current && !image.current.complete) image.current.dataset.loading = ''; }, [src, imgFailed]);
  const showImage = src && !imgFailed;
  const known = color === 'auto' || color === 'accent' || color === 'ink';
  const faceStyle = (color === 'auto' ? { '--k-avatar-h': avatarHue(name) } : known ? undefined : { '--k-avatar-base': color }) as React.CSSProperties | undefined;

  return (
    <span className={cn('relative inline-flex shrink-0', className)}>
      <span
        className={cn(
          'k-avatar-face inline-flex items-center justify-center overflow-hidden font-semibold',
          shapeClasses[shape],
          color === 'ink' && INK_CLASSES,
          sizeClasses[size],
        )}
        data-color={known ? color : 'custom'}
        style={faceStyle}
        title={name}
        role={decorative || showImage ? undefined : 'img'}
        aria-label={decorative || showImage ? undefined : name}
        aria-hidden={decorative || undefined}
      >
        {showImage ? (
          <img
            src={src}
            ref={image}
            alt={decorative ? '' : name}
            loading="lazy"
            decoding="async"
            className="k-avatar-img h-full w-full object-cover"
            onLoad={(event) => { delete event.currentTarget.dataset.loading; }}
            onError={() => setImgFailed(true)}
          />
        ) : (
          fallback ?? avatarInitials(name)
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

export interface AvatarGroupProps {
  /** Las personas. */
  people: Array<Pick<AvatarProps, 'name' | 'src' | 'status' | 'color'> & { id?: string }>;
  /** Cuántas se ven antes de «+N». Default 4. */
  max?: number;
  /** Total real, si `people` es solo una muestra. */
  total?: number;
  size?: AvatarProps['size'];
  shape?: AvatarProps['shape'];
  /** Pinta cada persona. */
  renderAvatar?: (person: AvatarGroupProps['people'][number], defaults: React.ReactNode) => React.ReactNode;
  /** Pinta el «+N». */
  renderMore?: (hidden: number, defaults: React.ReactNode) => React.ReactNode;
  className?: string;
  'aria-label'?: string;
}

/** Varias personas apiladas, con «+N» si no caben; al pasar por encima se separan un poco. */
export const AvatarGroup: React.FC<AvatarGroupProps> = ({ people, max = 4, total, size = 'sm', shape = 'circle', renderAvatar, renderMore, className, 'aria-label': ariaLabel }) => {
  const { messages: { avatar: texts }, format } = useI18n();
  const shown = people.slice(0, max);
  const hidden = Math.max(0, (total ?? people.length) - shown.length);
  const more = (
    <span className={cn('k-avatar-more inline-flex items-center justify-center font-semibold', shapeClasses[shape], sizeClasses[size])} role="img" aria-label={format(texts.groupMore, { count: hidden })}>
      {format(texts.more, { count: hidden })}
    </span>
  );
  return (
    <span className={cn('k-avatar-group inline-flex items-center', className)} role="group" aria-label={ariaLabel} data-size={size}>
      {shown.map((person, index) => {
        const avatar = <Avatar name={person.name} src={person.src} status={person.status} color={person.color} size={size} shape={shape} />;
        return <React.Fragment key={person.id ?? `${person.name}-${index}`}>{renderAvatar ? renderAvatar(person, avatar) : avatar}</React.Fragment>;
      })}
      {hidden > 0 && (renderMore ? renderMore(hidden, more) : more)}
    </span>
  );
};
