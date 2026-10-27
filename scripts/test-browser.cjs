const { spawnSync } = require('node:child_process');
const path = require('node:path');
let failed = false;
for (const script of ['probe-select-contrast.cjs', 'probe-code-editor.cjs', 'probe-code-editor-edge.cjs', 'probe-code-motion.cjs', 'probe-code-caret-position.cjs', 'probe-ai.cjs', 'probe-ai-voice.cjs', 'probe-ai-code.cjs', 'probe-ai-elements.cjs', 'probe-icons.cjs', 'probe-toast-stack.cjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit', env: process.env });
  if (result.error) console.error(result.error);
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
