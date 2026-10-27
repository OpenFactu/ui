import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
const base = process.env.LADLE_URL || 'http://localhost:61000';
const errors = []; page.on('pageerror', error => errors.push(error.message)); page.setDefaultTimeout(8000);
await page.addInitScript(() => {
  window.__voiceStops = 0;
  Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop: () => window.__voiceStops++ }] }) } });
  window.MediaRecorder = class {
    static isTypeSupported() { return true; }
    state = 'inactive'; mimeType = 'audio/wav';
    start() { this.state = 'recording'; } pause() { this.state = 'paused'; } resume() { this.state = 'recording'; }
    stop() {
      this.state = 'inactive'; const buffer = new ArrayBuffer(8044); const view = new DataView(buffer);
      const str = (at, value) => [...value].forEach((char, index) => view.setUint8(at + index, char.charCodeAt(0)));
      str(0,'RIFF'); view.setUint32(4,8036,true); str(8,'WAVEfmt '); view.setUint32(16,16,true); view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,8000,true); view.setUint32(28,16000,true); view.setUint16(32,2,true); view.setUint16(34,16,true); str(36,'data'); view.setUint32(40,8000,true);
      setTimeout(() => { this.ondataavailable?.({data:new Blob([buffer],{type:'audio/wav'})}); this.onstop?.(); },10);
    }
  };
});
const go = async (story = 'mensajeria') => { await page.goto(`${base}/?story=chat--${story}&mode=preview`, {waitUntil:'networkidle'}); await page.locator('.k-chat-workspace').first().waitFor(); };
const field = () => page.getByRole('textbox',{name:'Mensaje',exact:true});
const article = id => page.locator(`[data-message-id="${id}"]`);
const check = async (name, run) => { await run(); console.log('✓ '+name); };
const menu = async id => { await article(id).hover(); await article(id).getByRole('button',{name:'Más acciones del mensaje',exact:true}).click(); };
const manage = async name => {
  await page.getByRole('button',{name:'Gestionar conversación',exact:true}).click();
  await page.getByRole('button',{name,exact:true}).click();
  await page.getByRole('dialog',{name:'Gestionar conversación',exact:true}).waitFor({state:'hidden'});
};
try {
  await go();
  await check('Los temas cambian forma y color sin perder borrador ni modificar el tema de Ladle', async () => {
    assert.equal(await page.locator('html').evaluate(el=>el.style.getPropertyValue('--bg-card')), '');
    const root = await page.locator('html').getAttribute('style');
    await field().fill('Borrador que conserva el tema');
    const select = page.getByLabel('Tema del chat',{exact:true});
    await select.selectOption('keirost-mono');
    assert.equal(await article('ana-1').locator('.k-chat-bubble').evaluate(el=>getComputedStyle(el).borderRadius),'0px');
    await select.selectOption('keirost-soft');
    assert.equal(await article('ana-1').locator('.k-chat-bubble').evaluate(el=>getComputedStyle(el).borderRadius),'16px');
    await select.selectOption('keirost-mono-dark'); await field().focus();
    assert.equal(await field().evaluate(el=>getComputedStyle(el).outlineStyle),'none');
    await select.selectOption('keirost-carbon'); assert.equal(await field().inputValue(),'Borrador que conserva el tema');
    assert.equal(await page.locator('html').getAttribute('style'),root);
    await page.getByRole('button',{name:'Insertar emoji',exact:true}).click();
    const popup = page.getByRole('dialog',{name:'Insertar emoji',exact:true});
    assert.equal(await popup.evaluate(el=>getComputedStyle(el).getPropertyValue('--bg-card')),await page.locator('.k-chat-workspace').evaluate(el=>getComputedStyle(el).getPropertyValue('--bg-card')));
    await page.keyboard.press('Escape');
    await page.evaluate(()=>document.documentElement.style.zoom='2');
    await page.getByRole('button',{name:'Insertar emoji',exact:true}).click();
    await page.waitForFunction(()=>{ const popup=document.querySelector('.k-chat-popover');return popup && popup.getBoundingClientRect().right<=innerWidth+1; });
    await page.keyboard.press('Escape'); await page.evaluate(()=>document.documentElement.style.zoom='');
  });
  await check('El selector inserta un emoji completo en la selección y devuelve el foco', async () => {
    await field().fill('Hola mundo'); await field().evaluate(el=>{el.focus();el.setSelectionRange(5,10)});
    await page.getByRole('button',{name:'Insertar emoji',exact:true}).click();
    await page.getByRole('searchbox',{name:'Buscar emoji',exact:true}).fill('familia');
    await page.getByRole('button',{name:'Familia',exact:true}).click();
    assert.equal(await field().inputValue(),'Hola 👨‍👩‍👧‍👦');
    await page.waitForFunction(()=>document.querySelector('textarea[aria-label="Mensaje"]')===document.activeElement);
  });
  await check('Las reacciones alternan solo al usuario actual y muestran sus participantes', async () => {
    const like = article('ana-1').getByRole('button',{name:'👍, 2 reacciones, incluida la tuya',exact:true});
    await like.click(); await article('ana-1').getByRole('button',{name:'👍, 1 reacciones',exact:true}).waitFor();
    await article('ana-1').getByRole('button',{name:'👍, 1 reacciones',exact:true}).click();
    await like.waitFor();
    await article('ana-1').getByRole('button',{name:'Ver quién ha reaccionado',exact:true}).click();
    await page.getByRole('dialog',{name:'Ver quién ha reaccionado',exact:true}).getByText(/Marcos Vidal/).waitFor(); await page.keyboard.press('Escape');
  });
  await check('Un rechazo de reacción recupera el contador y permite reintentar', async () => {
    await page.getByText('Simular eventos del chat',{exact:true}).click(); await page.getByRole('button',{name:'Fallar próxima acción',exact:true}).click();
    await article('ana-1').getByRole('button',{name:'👍, 2 reacciones, incluida la tuya',exact:true}).click();
    await page.getByRole('button',{name:'Reintentar reacción',exact:true}).waitFor();
    await page.getByRole('button',{name:'Reintentar reacción',exact:true}).click();
    await article('ana-1').getByRole('button',{name:'👍, 1 reacciones',exact:true}).waitFor();
  });
  await check('Editar no modifica el borrador y eliminar conserva una respuesta legible', async () => {
    await field().fill('No perder este borrador');
    await menu('ana-2'); await page.getByRole('button',{name:'Editar mensaje',exact:true}).click();
    await page.getByRole('textbox',{name:'Editar mensaje',exact:true}).fill('Texto editado'); await page.getByRole('button',{name:'Guardar cambios',exact:true}).click();
    await article('ana-2').getByText('Texto editado',{exact:true}).waitFor(); assert.equal(await field().inputValue(),'No perder este borrador');
    await menu('ana-2'); await page.getByRole('button',{name:'Eliminar mensaje',exact:true}).click(); await page.getByRole('button',{name:'Confirmar eliminación',exact:true}).click();
    await article('ana-2').getByText('Mensaje eliminado',{exact:true}).waitFor(); assert.equal(await field().inputValue(),'No perder este borrador');
  });
  await check('Los adjuntos reales se pueden subir, conservar entre conversaciones y enviar', async () => {
    await page.locator('input[type=file]').setInputFiles({name:'ejemplo.txt',mimeType:'text/plain',buffer:Buffer.from('Documento de prueba')});
    await page.waitForFunction(()=>!document.querySelector('progress'));
    await page.getByRole('region',{name:'Conversaciones',exact:true}).getByRole('button',{name:/Equipo de producto/}).click();
    assert.equal(await page.getByText('ejemplo.txt',{exact:true}).count(),0);
    await page.getByRole('region',{name:'Conversaciones',exact:true}).getByRole('button',{name:/Ana López/}).click();
    await page.getByText('ejemplo.txt',{exact:true}).waitFor();
    await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
    await page.getByRole('link',{name:'Descargar ejemplo.txt',exact:true}).waitFor();
    await page.locator('input[type=file]').setInputFiles({name:'contactos.xlsx',mimeType:'application/octet-stream',buffer:Buffer.from('Demo de hoja de cálculo')});
    await page.locator('[data-file-kind="spreadsheet"]').waitFor();
    await page.waitForFunction(()=>!document.querySelector('progress'));
    await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
    await page.getByRole('link',{name:'Descargar contactos.xlsx',exact:true}).waitFor();
  });
  await check('Mencionar con teclado inserta un participante sin enviar el mensaje', async () => {
    await field().fill('  @An'); await field().press('Enter');
    assert.equal(await field().inputValue(),'  @Ana López ');
    await page.getByRole('button',{name:'Enviar mensaje',exact:true}).click();
    await page.locator('.k-chat-message-text .k-chat-mention').getByText('@Ana López',{exact:true}).waitFor();
  });
  await check('Buscar mantiene un único resultado activo y fijar permite volver al mensaje', async () => {
    await page.getByRole('button',{name:'Buscar mensajes',exact:true}).click(); await page.getByRole('searchbox',{name:'Buscar en mensajes',exact:true}).fill('pedido');
    await page.getByRole('button',{name:'Coincidencia siguiente',exact:true}).click();
    assert.ok(await page.locator('.k-chat-message-focused').count()<=1);
    assert.notEqual(await page.locator('.k-chat-message-text mark').first().evaluate(el=>getComputedStyle(el).backgroundColor),'rgb(255, 255, 0)');
    await page.getByRole('button',{name:'Cerrar búsqueda de mensajes',exact:true}).click();
    await menu('ana-1'); await page.getByRole('button',{name:'Fijar mensaje',exact:true}).click(); await page.getByRole('button',{name:'Mensajes fijados (1)',exact:true}).click();
    await page.getByRole('dialog',{name:'Mensajes fijados (1)',exact:true}).getByRole('button').first().click();
  });
  await check('La conversación se archiva, se recupera y permite favoritos y silencio', async () => {
    await manage('Añadir a favoritos');
    await manage('Silenciar conversación');
    await page.getByLabel('Conversación silenciada',{exact:true}).waitFor();
    await manage('Archivar conversación');
    await page.getByRole('button',{name:'Archivadas',exact:true}).click(); await page.getByRole('region',{name:'Conversaciones',exact:true}).getByRole('button',{name:/Ana López/}).click();
    await manage('Desarchivar conversación');
    await page.getByRole('button',{name:'Activas',exact:true}).click();
  });
  await go();
  await check('La voz protege el cambio de hilo y ofrece reproducción, velocidad y envío sin controles nativos', async () => {
    await page.getByRole('button',{name:'Grabar nota de voz',exact:true}).click();
    await page.getByRole('region',{name:'Conversaciones',exact:true}).getByRole('button',{name:/Equipo de producto/}).click();
    await page.getByRole('alertdialog',{name:'Grabación en curso',exact:true}).waitFor(); await page.getByRole('button',{name:'Seguir aquí',exact:true}).click();
    await page.getByRole('button',{name:'Pausar grabación',exact:true}).click(); await page.getByRole('button',{name:'Continuar grabación',exact:true}).click();
    await page.getByRole('button',{name:'Terminar grabación',exact:true}).click(); await page.getByRole('button',{name:'Enviar nota de voz',exact:true}).waitFor();
    assert.ok(await page.evaluate(()=>window.__voiceStops)>0);
    assert.equal(await page.locator('audio[controls]').count(),0);
    await page.getByRole('button',{name:'Reproducir nota de voz',exact:true}).click(); await page.getByRole('button',{name:'Pausar nota de voz',exact:true}).waitFor();
    await page.getByRole('button',{name:'Velocidad de la nota de voz',exact:true}).click();
    assert.equal(await page.locator('audio').first().evaluate(el=>el.playbackRate),1.5);
    fs.mkdirSync('.shots/chat',{recursive:true}); await page.screenshot({path:'.shots/chat/voice-styled.png',fullPage:true});
    await page.getByRole('button',{name:'Enviar nota de voz',exact:true}).click(); await page.getByRole('link',{name:/Descargar nota-de-voz/}).waitFor();
  });
  await check('Cancelar una nota mientras sube no envía el audio ni el texto que ya estaba escrito', async () => {
    await go(); await field().fill('No enviar al cancelar la voz');
    await page.getByText('Simular eventos del chat',{exact:true}).click(); await page.getByRole('button',{name:'Pausar confirmaciones',exact:true}).click();
    await page.getByRole('button',{name:'Grabar nota de voz',exact:true}).click(); await page.getByRole('button',{name:'Terminar grabación',exact:true}).click();
    await page.getByRole('button',{name:'Enviar nota de voz',exact:true}).click(); await page.getByText('Acciones en curso: 1',{exact:true}).waitFor();
    await page.getByRole('region',{name:'Conversaciones',exact:true}).getByRole('button',{name:/Equipo de producto/}).click();
    await page.getByRole('button',{name:'Cancelar grabación y cambiar',exact:true}).click();
    await page.getByRole('button',{name:'Confirmar envíos',exact:true}).click(); await page.getByText('Acciones en curso: 0',{exact:true}).waitFor();
    await page.getByRole('region',{name:'Conversaciones',exact:true}).getByRole('button',{name:/Ana López/}).click();
    assert.equal(await field().inputValue(),'No enviar al cancelar la voz');
    assert.equal(await page.getByRole('link',{name:/Descargar nota-de-voz/}).count(),0);
    assert.equal(await page.locator('.k-chat-message-text').getByText('No enviar al cancelar la voz',{exact:true}).count(),0);
  });
  await check('La galería muestra seis temas aislados y el compositor cabe en móvil', async () => {
    await go('temas'); assert.equal(await page.locator('[data-chat-theme]').count(),6);
    await page.screenshot({path:'.shots/chat/themes.png',fullPage:true});
    await page.setViewportSize({width:390,height:844}); await go();
    await page.getByLabel('Tema del chat',{exact:true}).selectOption('keirost-carbon');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.equal(await field().evaluate(el=>getComputedStyle(el).resize),'none');
    await page.screenshot({path:'.shots/chat/mobile-styled.png',fullPage:true});
    await page.setViewportSize({width:1280,height:1000}); await go(); await page.screenshot({path:'.shots/chat/desktop-styled.png',fullPage:true});
  });
  await check('El movimiento reducido desactiva entradas y la búsqueda no acumula marcos', async () => {
    await page.getByText('Simular eventos del chat',{exact:true}).click(); await page.getByRole('button',{name:'Recibir mensaje',exact:true}).click();
    const incoming = page.locator('[data-message-id="incoming-1"]'); await incoming.waitFor();
    assert.equal(await incoming.evaluate(el=>getComputedStyle(el).animationName),'none');
    await page.getByRole('button',{name:'Buscar mensajes',exact:true}).click(); await page.getByRole('searchbox',{name:'Buscar en mensajes',exact:true}).fill('pedido');
    await page.getByRole('button',{name:'Coincidencia siguiente',exact:true}).click(); assert.ok(await page.locator('.k-chat-message-focused').count()<=1);
    await page.getByRole('button',{name:'Cerrar búsqueda de mensajes',exact:true}).click();
  });
  assert.deepEqual(errors,[]); console.log('Chat ampliado: todas las comprobaciones pasaron.');
} finally {await browser.close();}
