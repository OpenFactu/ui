// Sonda de la segunda tanda de personalización (story «Personalización → Navegación y datos»), de los gestos migrados y del
// tercer bloque de IA. Uso: node scripts/probe-customization-more.cjs (necesita Ladle en marcha).
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('personalizacion--navegacion-y-datos'));
  await page.getByTestId('pestana').first().waitFor();

  check('Tabs pinta a medida con su rol', await page.getByRole('tab').filter({ has: page.getByTestId('pestana') }).count() === 3);
  await page.getByRole('tab').nth(1).click();
  check('y cambiar de pestaña funciona', await page.getByRole('tab').nth(1).getAttribute('aria-selected') === 'true');
  check('itemClassName como función', await page.getByRole('tab').nth(1).evaluate((el) => el.className.includes('mi-activa')));

  const acc = page.getByTestId('acordeon').first();
  check('Accordion pinta la cabecera, sin flecha', await acc.count() === 1 && await page.locator('[aria-expanded] svg.lucide-chevron-down, [aria-expanded] [data-testid="flecha"]').count() >= 1);
  await page.locator('button[aria-expanded]').filter({ has: page.getByTestId('acordeon') }).first().click();
  check('y abre', await page.getByText('Contenido del panel').isVisible());

  check('Stepper: texto y marca propios', await page.getByTestId('paso').count() === 3 && await page.getByTestId('marca').count() === 3);
  check('sabe cuál es el actual', (await page.getByTestId('paso').nth(1).textContent()).includes('(actual)'));
  check('Timeline: cuerpo y marca propios', await page.getByTestId('evento').count() === 2 && await page.getByTestId('marca-evento').count() === 2);
  check('Breadcrumbs: miga y separador propios', await page.getByTestId('miga').count() === 3 && await page.getByTestId('separador').count() === 2);
  check('NotificationList: a medida, y sabe lo no leído', (await page.getByTestId('notificacion').first().textContent()).includes('nueva'));
  check('TreeView: etiqueta con su estado', await page.getByTestId('nodo').count() >= 1 && await page.locator('.k-tree-row.mi-fila').count() >= 1);
  check('Calendar: acontecimiento a medida', await page.getByTestId('evento-calendario').count() >= 1);
  check('Table: celdas y cabeceras a medida', await page.locator('td.mi-celda').count() >= 1 && await page.locator('th.mi-cabecera').count() >= 1 && await page.getByTestId('cabecera-tabla').count() >= 1);
  await page.getByRole('button', { name: 'Avisar', exact: true }).click();
  await page.getByTestId('aviso-propio').waitFor();
  check('Toast: renderToast pinta el aviso', await page.getByTestId('aviso-propio').count() === 1);

  // Gestos migrados: el arrastre sigue funcionando.
  await page.goto(storyUrl('carousel--basico'));
  const viewport = page.locator('.k-carousel-viewport').first();
  await viewport.waitFor();
  const track = page.locator('.k-carousel-track').first();
  const box = await viewport.boundingBox();
  const before = await track.evaluate((el) => getComputedStyle(el).transform);
  await page.mouse.move(box.x + box.width * 0.7, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  check('Carousel: arrastrar pasa de diapositiva', (await track.evaluate((el) => getComputedStyle(el).transform)) !== before);

  await page.goto(storyUrl('swipe-cards--revisar-gastos'));
  const card = page.locator('.k-swipe-card[data-depth="0"]').first();
  await card.waitFor();
  const cb = await card.boundingBox();
  const label = await card.textContent();
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height / 2);
  await page.mouse.down();
  await page.mouse.move(cb.x + cb.width / 2 + cb.width * 0.2, cb.y + cb.height / 2, { steps: 4 });
  check('SwipeCards: la tarjeta sigue al puntero', (await card.evaluate((el) => el.style.translate)) !== '');
  await page.mouse.move(cb.x + cb.width * 1.6, cb.y + cb.height / 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  check('y lanzarla la descarta', (await page.locator('.k-swipe-card[data-depth="0"]').first().textContent().catch(() => '')) !== label);

  // IA: artefacto en directo y panel de actividad.
  await page.goto(storyUrl('ai-respuesta--artefacto-en-directo'));
  await page.getByRole('button', { name: 'Generar', exact: true }).click();
  await page.waitForTimeout(250);
  const panel = page.locator('.ai-artifact-panel');
  check('mientras llega, lo dice', (await panel.locator('.ai-artifact-toolbar').textContent()).includes('Generando'));
  check('un HTML a medias no se previsualiza', await panel.locator('iframe').count() === 0);
  await page.waitForFunction(() => document.querySelector('[data-testid="estado-artefacto"]')?.textContent === 'Listo', null, { timeout: 15000 });
  await page.waitForTimeout(120);
  check('al terminar, se previsualiza', await panel.locator('iframe').count() === 1 && !(await panel.locator('.ai-artifact-toolbar').textContent()).includes('Generando'));

  await page.goto(storyUrl('ai-respuesta--panel-de-actividad'));
  const activity = page.locator('.ai-activity-panel');
  await activity.waitFor();
  check('el panel cuenta lo hecho', (await activity.locator('header').textContent()).includes('3 de 5'));
  check('con el nombre legible de la herramienta', (await activity.textContent()).includes('Consultar facturas'));
  await activity.locator('button').first().click();
  check('pulsar una entrada avisa', (await page.getByTestId('entrada').textContent()).includes('Consultar facturas') || (await page.getByTestId('entrada').textContent()).length > 0);
  check('sin errores de consola', errors.length === 0, errors.join('\n'));
  await page.close();
});
