import * as React from 'react';
import {
  getThemePresets,
  subscribeThemePresets,
  type RegisteredThemePreset,
} from '../theme/registry';

/**
 * Catálogo de temas disponibles, integrados y registrados por plugins.
 *
 * Se resuscribe al registro, así que un selector de temas construido con esto
 * se repinta solo en cuanto un plugin aporta o retira uno.
 */
export function useThemePresets(): RegisteredThemePreset[] {
  return React.useSyncExternalStore(
    subscribeThemePresets,
    getThemePresets,
    getThemePresets,
  );
}
