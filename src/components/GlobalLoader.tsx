import React from 'react';
import { Spinner } from './Spinner';

export interface GlobalLoaderProps {
  isLoading: boolean;
  message?: string;
}

/**
 * Velo de carga a pantalla completa.
 *
 * @deprecated Compón el tuyo con `Spinner` (por ejemplo `<Spinner size="xl" />` sobre un fondo); este se mantiene por
 * compatibilidad y se quitará en la próxima versión menor.
 */
export const GlobalLoader: React.FC<GlobalLoaderProps> = ({ isLoading, message }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 z-[var(--k-z-modal,99999)] flex flex-col items-center justify-center bg-[color-mix(in_srgb,var(--bg-app)_80%,transparent)] backdrop-blur-md animate-in fade-in duration-300">
      <Spinner size="xl" label={message ?? 'Cargando'} className="mb-4" />
      {message && (
        <p className="mt-4 text-sm font-bold text-[var(--fg-muted)] uppercase tracking-widest animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};
