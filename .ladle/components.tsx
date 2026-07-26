import * as React from 'react';
import type { GlobalProvider as GlobalProviderType } from '@ladle/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../src/context/ToastContext';
import { PopupProvider } from '../src/context/PopupContext';
import './styles.css';

// Ladle exige que el export se llame exactamente `Provider`.
export const Provider: GlobalProviderType = ({ children, globalState }) => {
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', globalState.theme === 'dark');
  }, [globalState.theme]);

  return (
    <MemoryRouter>
      <ToastProvider>
        <PopupProvider>
          <div className="p-6 font-sans text-[var(--fg-default,#0a1628)] dark:text-slate-100">
            {children}
          </div>
        </PopupProvider>
      </ToastProvider>
    </MemoryRouter>
  );
};
