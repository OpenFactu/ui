/**
 * Listas ordenables y animadas, desplegables, mapa y microinteracciones, en Chrome real.
 *
 *   node scripts/probe-motion-extras.cjs        (con Ladle en marcha)
 */
const { BASE, launch, createChecker } = require('./probe-kit.cjs');


const { check, finish } = createChecker();
const story = (name) => `${BASE}/?story=${name}&mode=preview`;

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });

  console.log('\nLista ordenable');
  await page.goto(story('transiciones--lista-ordenable'), { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const names = () => page.locator('[role="listitem"]').allInnerTexts().then((t) => t.map((s) => s.replace(/[^\p{L}]/gu, '')));
  check('orden inicial', (await names()).join() === 'Cliente,Fecha,Importe,Estado,Responsable');
  const handle = page.locator('.k-sortable-handle').first();
  const hb = await handle.boundingBox();
  await page.mouse.move(hb.x + 5, hb.y + 5); await page.mouse.down();
  await page.mouse.move(hb.x + 5, hb.y + 60, { steps: 6 }); await page.mouse.move(hb.x + 5, hb.y + 110, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  check('arrastrar el primero hasta el tercer hueco lo reordena', (await names()).join() === 'Fecha,Importe,Cliente,Estado,Responsable', (await names()).join());
  await page.locator('.k-sortable-handle').nth(2).focus();
  await page.keyboard.press('Alt+ArrowUp');
  await page.waitForTimeout(200);
  check('Alt + ↑ sube el elemento con teclado', (await names()).join() === 'Fecha,Cliente,Importe,Estado,Responsable', (await names()).join());

  console.log('\nLista animada');
  await page.goto(story('transiciones--lista-animada'), { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const rows = () => page.locator('.flex.flex-col.gap-2 > div').count();
  check('empieza con 3', (await rows()) === 3);
  await page.getByRole('button', { name: 'Añadir arriba' }).click();
  await page.waitForTimeout(100);
  check('al añadir, el nuevo entra con animación', (await page.locator('.flex.flex-col.gap-2 > div').first().evaluate((e) => e.getAnimations().length)) > 0);
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Quitar' }).first().click();
  await page.waitForTimeout(60);
  check('al quitar, sigue montado mientras sale', (await rows()) === 4);
  await page.waitForTimeout(1000);
  check('y luego se retira', (await rows()) === 3);

  console.log('\nDesplegables');
  await page.goto(story('transiciones--desplegables'), { waitUntil: 'load' });
  await page.waitForTimeout(600);
  const second = page.getByRole('button', { name: /administración la rechaza/ });
  const panel = page.locator('.k-collapse').nth(1);
  check('cerrado: inerte y sin altura', (await panel.getAttribute('data-state')) === 'closed' && (await panel.evaluate((e) => e.offsetHeight)) === 0);
  await second.click();
  await page.waitForTimeout(80);
  const mid = await panel.evaluate((e) => e.offsetHeight);
  await page.waitForTimeout(1200);
  const full = await panel.evaluate((e) => e.offsetHeight);
  check('al abrir, la altura crece con transición', mid < full && full > 20, `${mid} → ${full}`);

  console.log('\nMapa');
  await page.goto(story('mapa--basico'), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const marker = page.locator('.k-map-marker').first();
  check('hay marcadores', (await page.locator('.k-map-marker').count()) === 2);
  await marker.click();
  await page.waitForTimeout(700);
  check('el marcador abre su popup', (await page.locator('.k-map-popup[data-state="open"]').count()) === 1);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(900);
  check('Escape lo cierra y se retira', (await page.locator('.k-map-popup').count()) === 0);
  const view = () => page.locator('.k-map').evaluate((e) => e.querySelector('.k-map-tile')?.style.transform ?? '');
  await page.locator('.k-map').focus();
  const t0 = await view();
  await page.keyboard.press('ArrowRight');
  await page.waitForTimeout(150);
  check('las flechas desplazan el mapa', (await view()) !== t0);
  const tiles0 = await page.locator('.k-map-tile').count();
  await page.getByRole('button', { name: 'Acercar' }).click();
  await page.waitForTimeout(1500);
  const bs = await page.locator('.k-map-tile').first().boundingBox();
  check('el botón acerca (las teselas se agrandan)', !!bs && (bs.width > 256 || (await page.locator('.k-map-tile').count()) !== tiles0), `tesela ${Math.round(bs?.width ?? 0)} px`);

  console.log('\nMicrointeracciones');
  await page.goto(story('microinteracciones--onda-y-confeti'), { waitUntil: 'load' });
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Solo onda' }).click();
  await page.waitForTimeout(80);
  check('la onda aparece donde se pulsa', (await page.locator('.k-ripple-wave').count()) >= 1);
  await page.getByRole('button', { name: 'Confeti' }).click();
  await page.waitForTimeout(300);
  check('el confeti se lanza', (await page.locator('.k-confetti-piece').count()) > 20);
  await page.waitForTimeout(3200);
  check('y se limpia solo', (await page.locator('.k-confetti-layer').count()) === 0);

  const reduced = await browser.newPage({ viewport: { width: 1000, height: 700 }, reducedMotion: 'reduce' });
  await reduced.goto(story('microinteracciones--onda-y-confeti'), { waitUntil: 'load' });
  await reduced.waitForTimeout(500);
  await reduced.getByRole('button', { name: 'Confeti' }).click();
  await reduced.waitForTimeout(200);
  check('con movimiento reducido no hay confeti', (await reduced.locator('.k-confetti-piece').count()) === 0);

  await browser.close();
  finish();
})().catch((error) => { console.error(error); process.exitCode = 1; });
