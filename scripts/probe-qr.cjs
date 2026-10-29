/**
 * Códigos QR en Chrome real (con Ladle en marcha): cada QR pintado se rasteriza a un canvas y se lee con jsQR, así
 * se comprueba que las formas (puntos, ojos redondos) y el logo no lo dejan ilegible.
 *
 *   node scripts/probe-qr.cjs
 */
const path = require('node:path');
const { run, storyUrl, collectErrors } = require('./probe-kit.cjs');

/** Lee todos los QR de la página: SVG → imagen → canvas → jsQR (con el logo HTML pintado encima como un bloque). */
const readAll = (page) => page.evaluate(async () => {
  const out = [];
  for (const svg of document.querySelectorAll('svg[data-k-qr]')) {
    const box = svg.getBoundingClientRect();
    const scale = Math.max(1, 400 / box.width);
    const w = Math.round(box.width * scale); const h = Math.round(box.height * scale);
    const clone = svg.cloneNode(true);
    clone.setAttribute('width', String(w)); clone.setAttribute('height', String(h));
    // Las variables CSS no existen dentro de una imagen: se fijan los colores ya resueltos.
    clone.querySelectorAll('rect, path').forEach((el, i) => {
      el.setAttribute('fill', getComputedStyle(svg.querySelectorAll('rect, path')[i]).fill);
    });
    const img = new Image();
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(clone))}`;
    await img.decode();
    const canvas = document.createElement('canvas'); canvas.width = w + 40; canvas.height = h + 40;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 20, 20, w, h);
    const logo = svg.parentElement.querySelector('.k-qr-logo');
    if (logo) {
      const l = logo.getBoundingClientRect();
      ctx.fillStyle = '#7f7f7f';
      ctx.fillRect(20 + (l.left - box.left) * scale, 20 + (l.top - box.top) * scale, l.width * scale, l.height * scale);
    }
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
    out.push({ label: svg.getAttribute('aria-label'), read: window.jsQR(data.data, canvas.width, canvas.height)?.data ?? null });
  }
  return out;
});

run(async ({ browser, check }) => {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = collectErrors(page);
  const open = async (id) => {
    await page.goto(storyUrl(id), { waitUntil: 'load' });
    await page.waitForSelector('svg[data-k-qr], .k-qr-fallback');
    await page.addScriptTag({ path: path.join(__dirname, '../node_modules/jsqr/dist/jsQR.js') });
  };

  for (const id of ['qr-code--formas', 'qr-code--con-logo', 'qr-code--colores', 'qr-code--factura']) {
    console.log(`\n${id}`);
    await open(id);
    const results = await readAll(page);
    check('hay códigos en la historia', results.length > 0);
    for (const r of results) {
      const expected = r.label.startsWith('Código QR: ') ? r.label.slice('Código QR: '.length) : null;
      check(`se lee: ${r.label.slice(0, 60)}`, expected ? r.read === expected : !!r.read, String(r.read));
    }
  }

  console.log('\nBásico');
  await open('qr-code--basico');
  await page.getByLabel('Contenido').fill('Factura nº 42 · Señor Muñoz');
  await page.waitForTimeout(200);
  check('cambiar el texto regenera el código', (await readAll(page))[0].read === 'Factura nº 42 · Señor Muñoz');

  console.log('\nTexto demasiado largo');
  await page.goto(storyUrl('qr-code--texto-demasiado-largo'), { waitUntil: 'load' });
  await page.waitForTimeout(500);
  check('muestra el aviso en vez de romperse', await page.getByRole('alert').isVisible());

  check('sin errores de página', errors.length === 0, errors.join(' | '));
});
