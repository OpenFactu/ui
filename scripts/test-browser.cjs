/**
 * Ejecuta grupos de sondas de navegador (necesitan Ladle en marcha). Cada argumento es un grupo o un script:
 *
 *   node scripts/test-browser.cjs               → grupo `browser`
 *   node scripts/test-browser.cjs chat          → grupo `chat`
 *   node scripts/test-browser.cjs browser extra → varios grupos
 *   node scripts/test-browser.cjs probe-map.cjs → un script suelto
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const GROUPS = {
  browser: [
    'probe-theme-focus.cjs', 'probe-theme-controls.cjs', 'probe-select-contrast.cjs', 'probe-code-editor.cjs', 'probe-code-editor-edge.cjs',
    'probe-code-motion.cjs', 'probe-code-caret-position.cjs', 'probe-ai.cjs', 'probe-ai-voice.cjs', 'probe-ai-code.cjs', 'probe-ai-elements.cjs',
    'probe-icons.cjs', 'probe-toast-stack.cjs', 'probe-motion.cjs', 'probe-motion-extras.cjs', 'probe-map.cjs', 'probe-controls.cjs',
    'probe-mobile-sheets.cjs', 'probe-extras.cjs', 'probe-qr.cjs', 'probe-calendar.cjs', 'probe-kanban.cjs', 'probe-table.cjs', 'probe-virtual-list.cjs', 'probe-ai-layout.cjs', 'probe-notifications.cjs', 'probe-floating-actions.cjs', 'probe-mobile-redesign.cjs',
    'probe-mobile-gallery.cjs', 'probe-table-action-menu.cjs', 'probe-mobile-control-layout.cjs',
  ],
  chat: ['check-chat.mjs', 'check-chat-features.mjs'],
  // Sondas antiguas que no corren por defecto (más lentas o más frágiles); se lanzan a mano cuando se toca su zona.
  extra: [
    'probe-api.mjs', 'probe-buscador.mjs', 'probe-gantt.mjs', 'probe-infinite.mjs', 'probe-navmenu.mjs',
    'probe-tablero.mjs', 'probe-tabs.mjs', 'probe-toast.mjs', 'probe-toast-mobile.mjs',
  ],
};

const requested = process.argv.slice(2);
const scripts = (requested.length ? requested : ['browser']).flatMap((name) => GROUPS[name] ?? [name]);

let failed = 0;
for (const script of scripts) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit', env: process.env });
  if (result.error) console.error(result.error);
  if (result.status !== 0) { failed += 1; console.error(`✗ ${script}`); }
}
if (scripts.length > 1) console.log(failed ? `\n${failed} de ${scripts.length} sondas con fallos` : `\nLas ${scripts.length} sondas pasan`);
process.exitCode = failed ? 1 : 0;
