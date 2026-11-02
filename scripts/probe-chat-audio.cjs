// Sonda de la animación de las notas de voz: la onda tiene forma, se mueve solo mientras suena, se posa al pausar, se
// recoge al acabar y, sin movimiento, solo cambia el color.
// Uso: node scripts/probe-chat-audio.cjs (necesita Ladle en marcha).
const { run, storyUrl, collectErrors, shotsDir } = require('./probe-kit.cjs');
const path = require('node:path');

const heights = (wave) => wave.locator('i').evaluateAll(bars => bars.map(bar => parseFloat(bar.style.height)));
const played = (wave) => wave.locator('i[data-played="true"]').count();

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1024, height: 720 }, deviceScaleFactor: 2 });
  const errors = collectErrors(page);
  await page.goto(storyUrl('chat--adjuntos-compactos'));
  const player = page.locator('.k-chat-audio-player').first();
  await player.scrollIntoViewIfNeeded();
  const wave = player.locator('.k-chat-audio-wave');
  await wave.waitFor();
  await page.waitForTimeout(500);
  const rest = await heights(wave);
  check('la onda tiene forma, no es una raya', Math.max(...rest) - Math.min(...rest) > 4);
  check('en reposo no hay nada sonado ni animándose', await played(wave) === 0 && await wave.getAttribute('data-live') === null);

  await player.getByRole('button', { name: 'Reproducir nota de voz', exact: true }).click();
  await page.waitForTimeout(1500);
  check('al reproducir, el bucle está en marcha', await wave.getAttribute('data-live') === '');
  check('el reproductor lo sabe (data-playing)', await player.getAttribute('data-playing') === 'true');
  check('el botón lleva el aro', await player.locator('.k-chat-audio-play').evaluate(el => getComputedStyle(el, '::after').animationName) === 'k-chat-audio-ring');
  const first = await heights(wave);
  const firstPlayed = await played(wave);
  await page.screenshot({ path: path.join(shotsDir('chat-audio'), 'sonando.png'), clip: await player.boundingBox().then(b => ({ x: b.x - 12, y: b.y - 12, width: b.width + 24, height: b.height + 24 })) });
  await page.waitForTimeout(300);
  const second = await heights(wave);
  check('las barras se mueven', first.some((h, i) => Math.abs(h - second[i]) > 0.3));
  check('el color avanza con el audio', firstPlayed > 0 && await played(wave) >= firstPlayed);
  const head = await played(wave);
  check('la cresta va en el cabezal', second[head] > rest[head] + 2);
  check('lo que aún no ha sonado está quieto', second.slice(head + 8).every((h, i) => Math.abs(h - rest[head + 8 + i]) < 0.6));
  check('ninguna barra se sale de la onda', second.every(h => h <= 27));

  await player.getByRole('button', { name: 'Pausar nota de voz', exact: true }).click();
  await page.waitForTimeout(100);
  check('al pausar no salta: aún se está posando', await wave.getAttribute('data-live') === '');
  await page.waitForTimeout(1000);
  check('y luego se para y vuelve a su altura', await wave.getAttribute('data-live') === null && (await heights(wave)).every((h, i) => Math.abs(h - rest[i]) < 0.6));
  check('la parte sonada sigue marcada', await played(wave) >= firstPlayed);

  // Hasta el final: vuelve al principio.
  await player.getByRole('button', { name: 'Reproducir nota de voz', exact: true }).click();
  await player.locator('input[type=range]').evaluate(el => { const a = el.closest('.k-chat-audio-player').querySelector('audio'); a.currentTime = Math.max(0, a.duration - 0.3); });
  await page.waitForTimeout(1200);
  check('al acabar vuelve al principio y recoge el color', await played(wave) === 0 && await wave.getAttribute('data-rewind') === 'true');
  check('la hora vuelve a ser la duración', (await player.locator('.k-chat-audio-time').textContent()) === '0:06');
  check('sin errores de consola', errors.length === 0, errors.join('\n'));
  await page.close();

  // Sin movimiento: suena y colorea, pero nada se mueve.
  const calm = await browser.newPage({ viewport: { width: 1024, height: 720 }, reducedMotion: 'reduce' });
  await calm.goto(storyUrl('chat--adjuntos-compactos'));
  const calmPlayer = calm.locator('.k-chat-audio-player').first();
  await calmPlayer.scrollIntoViewIfNeeded();
  const calmWave = calmPlayer.locator('.k-chat-audio-wave');
  await calm.waitForTimeout(500);
  const calmRest = await heights(calmWave);
  await calmPlayer.getByRole('button', { name: 'Reproducir nota de voz', exact: true }).click();
  await calm.waitForTimeout(1500);
  check('con movimiento reducido no hay bucle', await calmWave.getAttribute('data-live') === null);
  check('las barras no se mueven', (await heights(calmWave)).every((h, i) => h === calmRest[i]));
  check('pero el color sigue avanzando', await played(calmWave) > 0);
  await calm.close();
});
