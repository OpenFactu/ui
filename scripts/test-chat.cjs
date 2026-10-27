const { spawnSync } = require('node:child_process');
const path = require('node:path');
let failed = false;
for (const script of ['check-chat.mjs', 'check-chat-features.mjs']) {
  const result = spawnSync(process.execPath, [path.join(__dirname, script)], { stdio: 'inherit', env: process.env });
  if (result.error) console.error(result.error);
  if (result.status !== 0) failed = true;
}
process.exitCode = failed ? 1 : 0;
