/**
 * Comprueba el infinite scroll donde de verdad importa: que traiga la página
 * siguiente al llegar al final, que NO dispare una petición por fotograma
 * mientras el centinela sigue en pantalla, y que pare al acabarse los datos.
 *
 * El fallo clásico de esto no es que no cargue: es que cargue treinta veces.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = process.env.LADLE_URL ?? 'http://localhost:61000';
const TOTAL = 84;

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1000, height: 620 } });

let failures = 0;
const check = (label, ok, detail = '') => {
  console.log(`  ${ok ? 'OK  ' : 'FALLA'} ${label}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failures += 1;
};

const estado = () =>
  page.evaluate(() => ({
    filas: Number(document.querySelector('[data-filas]').textContent),
    peticiones: Number(document.querySelector('[data-peticiones]').textContent),
  }));

/**
 * Lleva el centinela a la vista. `scrollIntoView` desplaza todos los
 * contenedores que hagan falta, que es justo lo que hace una persona al bajar:
 * fijar a mano un `scrollTop` obliga a adivinar cuál de los contenedores
 * anidados es el que se desplaza.
 */
const alFinal = () =>
  page.evaluate(() => {
    const centinelas = [...document.querySelectorAll('[aria-hidden="true"]')].filter(
      (e) => e.classList.contains('h-px') || e.className.includes('h-px'),
    );
    const ult = centinelas[centinelas.length - 1];
    ult?.scrollIntoView({ block: 'end' });
    return Boolean(ult);
  });

async function recorrer(nombre, story, avisaFinal = true) {
  console.log(`\n${nombre}`);
  await page.goto(`${BASE}/?story=${story}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  const inicio = await estado();
  check('arranca con la primera página', inicio.filas === 20, `${inicio.filas} filas`);

  // Bajar al final y esperar a que llegue la siguiente.
  await alFinal();
  await page.waitForTimeout(1100);
  const tras1 = await estado();
  check('al llegar al final trae la siguiente', tras1.filas === 40, `${tras1.filas} filas`);
  check('y pide una sola vez', tras1.peticiones === 2, `${tras1.peticiones} peticiones`);

  // Quedarse quieto al final: no debe pedir nada más por su cuenta.
  await page.waitForTimeout(1200);
  const quieto = await estado();
  check(
    'quedarse parado no dispara peticiones en bucle',
    quieto.peticiones <= tras1.peticiones + 1,
    `${quieto.peticiones} peticiones`,
  );

  // Bajar hasta agotar los datos.
  for (let i = 0; i < 8; i += 1) {
    await alFinal();
    await page.waitForTimeout(800);
    const s = await estado();
    if (s.filas >= TOTAL) break;
  }
  const fin = await estado();
  check('llega hasta el final de los datos', fin.filas === TOTAL, `${fin.filas} de ${TOTAL}`);
  check(
    'sin pedir de más',
    fin.peticiones === Math.ceil(TOTAL / 20),
    `${fin.peticiones} peticiones para ${Math.ceil(TOTAL / 20)} páginas`,
  );

  // Agotado: ni una petición más, y se dice que no queda nada.
  await alFinal();
  await page.waitForTimeout(1200);
  const agotado = await estado();
  check('agotado, deja de pedir', agotado.peticiones === fin.peticiones, `${agotado.peticiones}`);
  if (avisaFinal) {
    check('y avisa de que no queda nada', (await page.getByText(/No hay más/i).count()) >= 1);
  }
}

await recorrer('Tabla', 'infinite-scroll--en-tabla');
await recorrer('Lista (contenedor con scroll propio)', 'infinite-scroll--en-lista');
// El hook no pinta interfaz: el mensaje final es cosa de quien lo usa.
await recorrer('Hook suelto (root propio)', 'infinite-scroll--hook-suelto', false);

await browser.close();
console.log(failures === 0 ? '\nTodo correcto.' : `\n${failures} comprobaciones fallidas.`);
process.exit(failures ? 1 : 0);
