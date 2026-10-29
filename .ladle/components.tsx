import * as React from 'react';
import type { GlobalProvider as GlobalProviderType } from '@ladle/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../src/context/ToastContext';
import { PopupProvider } from '../src/context/PopupContext';
import { I18nProvider } from '../src/i18n/I18nProvider';
import { registerTranslations } from '../src/i18n/registry';
import { pseudoMessages } from '../src/i18n/pseudo';
import './styles.css';

// `?k-locale=pseudo` envuelve cada texto del catálogo en ⟦…⟧: lo que se vea sin corchetes no pasa por las
// traducciones (o es contenido de la propia historia). Lo usa `scripts/probe-i18n.cjs`.
registerTranslations('pseudo', pseudoMessages(), { source: 'ladle' });
const locale = typeof location === 'undefined' ? undefined : new URLSearchParams(location.search).get('k-locale') ?? undefined;

// Ladle exige que el export se llame exactamente `Provider`.
export const Provider: GlobalProviderType = ({ children, globalState }) => {
  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', globalState.theme === 'dark');
  }, [globalState.theme]);

  return (
    <I18nProvider locale={locale}>
      <MemoryRouter>
        <ToastProvider>
          <PopupProvider>
            <div className="p-6 font-sans text-[var(--fg-default,#0a1628)] dark:text-slate-100">
              {children}
            </div>
          </PopupProvider>
        </ToastProvider>
      </MemoryRouter>
    </I18nProvider>
  );
};
