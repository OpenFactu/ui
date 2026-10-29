/**
 * Mapa: estilos (incluidos blanco y negro), buscador, controles integrados y propios, medir y pantalla completa.
 *
 *   node scripts/probe-map.cjs        (con Ladle en marcha; las teselas se piden a internet, el buscador se simula)
 */
const { BASE, launch, createChecker } = require('./probe-kit.cjs');

const OUT = process.env.PROBE_OUT;

const { check, finish } = createChecker();
const story = (name) => `${BASE}/?story=${name}&mode=preview`;

(async () => {
  const browser = await launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));

  console.log('\nEstilos');
  await page.goto(story('mapa--estilos'), { waitUntil: 'load' });
  await page.waitForTimeout(3500);
  const filters = await page.locator('.k-map-tiles').evaluateAll((els) => els.map((e) => e.style.filter));
  check('seis mapas', filters.length === 6);
  check('el estándar va sin filtro; claro y oscuro llevan el suyo', !filters[0] && /saturate/.test(filters[1]) && /invert/.test(filters[2]), JSON.stringify(filters.slice(0, 3)));
  check('«mono» es gris', /grayscale/.test(filters[3]));
  check('«mono-dark» es gris e invertido', /grayscale/.test(filters[4]) && /invert/.test(filters[4]));
  const tones = await page.locator('.k-map').evaluateAll((els) => els.map((e) => e.getAttribute('data-tone')));
  check('los oscuros se marcan', tones[2] === 'dark' && tones[4] === 'dark' && tones[0] === 'light', tones.join());
  const sources = await page.locator('.k-map').evaluateAll((els) => els.map((e) => e.querySelector('.k-map-tile')?.getAttribute('src') ?? ''));
  check('todos los incluidos usan teselas sin clave (OSM)', sources.every((src) => /tile\.openstreetmap\.org/.test(src)), sources.join(' '));
  if (OUT) await page.screenshot({ path: `${OUT}/mapa-estilos.png`, fullPage: true });

  console.log('\nMapa completo');
  // Nominatim simulado: solo se llama cuando la búsqueda propia no encuentra nada.
  let remote = 0;
  await page.route('**/nominatim.openstreetmap.org/**', (route) => {
    remote += 1;
    route.fulfill({ contentType: 'application/json', body: JSON.stringify([{ place_id: 7, lat: '38.5', lon: '-0.5', display_name: 'Elche, Alicante, España', name: 'Elche', boundingbox: ['38.2', '38.3', '-0.8', '-0.6'] }]) });
  });
  await page.goto(story('mapa--completo'), { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  const map = page.locator('.k-map');

  check('hay buscador, controles y botones propios', (await page.locator('.k-map-search input').count()) === 1 && (await page.locator('.k-map-controls').count()) === 6 && (await page.getByRole('button', { name: 'Ver todas las sedes' }).count()) === 1);
  check('los botones propios están en su esquina', (await page.locator('[data-map-corner="bottom-left"] .k-map-button').count()) === 1 && (await page.locator('[data-map-corner="top-left"] .k-map-button').count()) === 1);

  const search = page.locator('.k-map-search input');
  await search.fill('sevi');
  await page.waitForTimeout(700);
  const options = await page.locator('.k-map-search-results [role="option"]').allInnerTexts();
  check('busca en tus datos sin red', options.length === 1 && /Sevilla/.test(options[0]) && remote === 0, JSON.stringify(options));
  await search.press('Enter');
  await page.waitForTimeout(1800);
  check('elegir un resultado deja una chincheta con su nombre', (await page.locator('.k-map-found').count()) === 1 && /Sevilla/.test(await page.locator('.k-map-popup').first().innerText()));

  await search.fill('zzzz elche');
  await page.waitForTimeout(900);
  check('si no hay nada propio, consulta al buscador externo', remote >= 1 && /Elche/.test((await page.locator('.k-map-search-results').first().innerText())), `peticiones ${remote}`);
  await search.press('Escape');

  await page.getByRole('button', { name: 'Medir distancia' }).click();
  const box = await map.boundingBox();
  await page.mouse.click(box.x + 300, box.y + 300); await page.mouse.click(box.x + 600, box.y + 300);
  await page.waitForTimeout(200);
  const text = await page.locator('.k-map-measure').innerText();
  check('medir enseña la distancia', /\d+(,\d+)? km/.test(text), text.replace(/\s+/g, ' '));
  await page.getByRole('button', { name: 'Medir distancia' }).click();
  check('al terminar de medir se limpia', (await page.locator('.k-map-measure').count()) === 0);

  await page.getByRole('button', { name: 'Estilo del mapa' }).click();
  const items = await page.locator('.k-map-styles-menu [role="menuitemradio"]').allInnerTexts();
  check('el selector lista los estilos', items.includes('Blanco y negro') && items.includes('Negro') && items.includes('Automático'), items.join());
  await page.getByRole('menuitemradio', { name: 'Blanco y negro' }).click();
  await page.waitForTimeout(400);
  check('al elegir uno, el mapa cambia', /grayscale/.test(await page.locator('.k-map-tiles').evaluate((e) => e.style.filter)));
  if (OUT) await page.screenshot({ path: `${OUT}/mapa-completo-mono.png` });

  await page.getByRole('button', { name: 'Pantalla completa' }).click();
  await page.waitForTimeout(400);
  const full = await map.boundingBox();
  check('pantalla completa cubre la ventana', Math.round(full.width) === 1100 && Math.round(full.height) === 800, `${Math.round(full.width)}×${Math.round(full.height)}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  check('Escape sale de pantalla completa', (await map.getAttribute('data-fullscreen')) === null);

  await page.locator('.k-map').click({ position: { x: 700, y: 400 } });
  await page.waitForTimeout(300);
  check('un clic en el mapa llega a onMapClick (marca un punto)', (await page.getByRole('button', { name: 'Punto elegido' }).count()) === 1);

  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await browser.close();
  finish();
})().catch((error) => { console.error(error); process.exitCode = 1; });
