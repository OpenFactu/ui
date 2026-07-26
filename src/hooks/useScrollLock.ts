import * as React from 'react';

/**
 * Bloquea el scroll de la página mientras haya algún overlay abierto.
 *
 * Lleva un contador global: con dos capas superpuestas (un diálogo abierto
 * desde otro), cerrar la de arriba ya no desbloquea el scroll de la de abajo,
 * que es lo que ocurre cuando cada componente escribe `body.style.overflow`
 * por su cuenta.
 *
 * También compensa el ancho de la barra de desplazamiento para que el contenido
 * no dé un salto horizontal al abrirse el overlay.
 */
let lockCount = 0;
let previousOverflow = '';
let previousPaddingRight = '';

function acquire(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    const body = document.body;
    previousOverflow = body.style.overflow;
    previousPaddingRight = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      const current = parseFloat(getComputedStyle(body).paddingRight) || 0;
      body.style.paddingRight = `${current + scrollbarWidth}px`;
    }
    body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function release(): void {
  if (typeof document === 'undefined') return;
  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = previousOverflow;
    document.body.style.paddingRight = previousPaddingRight;
  }
}

export function useScrollLock(enabled: boolean): void {
  React.useEffect(() => {
    if (!enabled) return;
    acquire();
    return release;
  }, [enabled]);
}

/** Número de bloqueos activos. Expuesto para depuración y pruebas. */
export function scrollLockCount(): number {
  return lockCount;
}
