/** @type {import('tailwindcss').Config} */
// El playground consume el mismo preset que se publica: si el preset está mal,
// Ladle se rompe y nos enteramos aquí y no en el consumidor.
import animated from 'tailwindcss-animated';
import uiPreset from './tailwind/preset.cjs';

export default {
  presets: [uiPreset],
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './stories/**/*.{js,ts,jsx,tsx}',
    './.ladle/**/*.{js,ts,jsx,tsx}',
  ],
  plugins: [animated],
};
