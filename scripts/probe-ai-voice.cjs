const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const base = process.env.LADLE_URL || 'http://localhost:61000';
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  try {
    const page = await browser.newPage(); const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.__media = { mode: 'ok', stops: 0, created: 0, revoked: 0 };
      const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
      URL.createObjectURL = blob => { window.__media.created++; return create(blob); };
      URL.revokeObjectURL = url => { window.__media.revoked++; return revoke(url); };
      const stream = () => ({ getTracks: () => [{ stop: () => window.__media.stops++ }] });
      Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => {
        if (window.__media.mode === 'denied') throw new DOMException('Denied', 'NotAllowedError');
        if (window.__media.mode === 'missing') throw new DOMException('Missing', 'NotFoundError');
        if (window.__media.mode === 'pending') return new Promise(resolve => { window.__resolveMedia = () => resolve(stream()); });
        return stream();
      } } });
      class Recorder {
        static isTypeSupported() { return true; }
        state = 'inactive'; mimeType = 'audio/wav';
        constructor() { window.__recorder = this; }
        start() { this.state = 'recording'; }
        pause() { this.state = 'paused'; }
        resume() { this.state = 'recording'; }
        stop() {
          this.state = 'inactive';
          const buffer = new ArrayBuffer(8044), view = new DataView(buffer);
          const str = (at, value) => [...value].forEach((char, index) => view.setUint8(at + index, char.charCodeAt(0)));
          str(0, 'RIFF'); view.setUint32(4, 8036, true); str(8, 'WAVEfmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, 8000, true); view.setUint32(28, 16000, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); str(36, 'data'); view.setUint32(40, 8000, true);
          setTimeout(() => { this.ondataavailable?.({ data: new Blob([buffer], { type: 'audio/wav' }) }); this.onstop?.(); }, 10);
        }
      }
      window.MediaRecorder = Recorder;
    });
    const goto = async story => { await page.goto(`${base}/?story=ai-components--${story}&mode=preview`); await page.locator('.ai-surface').first().waitFor(); };
    await goto('grabacion');
    await page.getByRole('button', { name: 'Grabar audio', exact: true }).click();
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__recorder.state), 'paused');
    await page.getByRole('button', { name: 'Continuar', exact: true }).click();
    assert.equal(await page.evaluate(() => window.__recorder.state), 'recording');
    await page.getByRole('button', { name: 'Terminar grabación' }).click();
    await page.getByRole('button', { name: 'Usar grabación' }).waitFor();
    assert.ok(await page.evaluate(() => window.__media.stops > 0));
    assert.equal(await page.locator('audio').evaluate(el => el.autoplay), false);
    await page.getByRole('button', { name: 'Usar grabación' }).click();
    await page.getByText('Audio recibido: 8044 bytes').waitFor();
    await page.getByRole('button', { name: 'Grabar audio', exact: true }).click();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.ok(await page.evaluate(() => window.__media.stops >= 2));
    const before = await page.evaluate(() => window.__media.revoked);
    await page.getByRole('button', { name: 'Grabar audio', exact: true }).click();
    await page.getByRole('button', { name: 'Terminar grabación' }).click();
    await page.getByRole('button', { name: 'Usar grabación' }).waitFor();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.ok(await page.evaluate(previous => window.__media.revoked > previous, before), 'cancel revokes temporary recording URLs');
    await page.evaluate(() => window.__media.mode = 'denied');
    await page.getByRole('button', { name: 'Grabar audio', exact: true }).click();
    await page.getByText('Permite el micrófono para grabar audio.').waitFor();
    await page.evaluate(() => window.__media.mode = 'missing');
    await page.getByRole('button', { name: 'Grabar audio', exact: true }).click();
    await page.getByText('No se pudo acceder al micrófono.').waitFor();
    await page.evaluate(() => window.__media.mode = 'pending');
    await page.getByRole('button', { name: 'Grabar audio', exact: true }).click();
    await page.waitForFunction(() => !!window.__resolveMedia);
    await page.getByRole('button', { name: 'Mostrar u ocultar grabadora' }).click();
    const stops = await page.evaluate(() => window.__media.stops);
    await page.evaluate(() => window.__resolveMedia());
    await page.waitForFunction(previous => window.__media.stops > previous, stops);
    await page.evaluate(() => window.MediaRecorder = undefined);
    await page.getByRole('button', { name: 'Mostrar u ocultar grabadora' }).click();
    await page.getByText('La grabación de audio no está disponible en este navegador.').waitFor();
    assert.ok(await page.getByRole('button', { name: 'Grabar audio', exact: true }).isDisabled());
    console.log('OK recording pause/resume/stop/send/cancel, denied/missing/unsupported devices, pending permission race and URL cleanup');
    await goto('audio');
    await page.waitForFunction(() => document.querySelector('audio')?.duration === 3);
    assert.ok(await page.locator('audio').evaluate(el => el.paused), 'never autoplay');
    await page.getByRole('button', { name: 'Reproducir', exact: true }).click();
    await page.getByRole('button', { name: 'Pausar', exact: true }).click();
    assert.ok(await page.locator('audio').evaluate(el => el.paused));
    await page.getByRole('slider', { name: 'Posición del audio' }).fill('1');
    assert.ok(Math.abs(await page.locator('audio').evaluate(el => el.currentTime) - 1) < .2);
    await page.getByRole('combobox', { name: 'Velocidad' }).click();
    await page.getByRole('option', { name: '1.5×', exact: true }).click();
    assert.equal(await page.locator('audio').evaluate(el => el.playbackRate), 1.5);
    assert.deepEqual(errors, []);
    console.log('OK playback, seeking and speed without autoplay; no browser exceptions');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
