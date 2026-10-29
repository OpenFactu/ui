const test = require('node:test');
const assert = require('node:assert/strict');
const jsQR = require('jsqr');
const { render } = require('./test-support.cjs');
const qr = require('../src/qr/matrix.ts');

/** Pinta la matriz (sin ojos ni hueco, igual que los trazados) a píxeles y la lee con un lector real. */
function decode(matrix, hole) {
  const scale = 4; const margin = 4;
  const side = (matrix.size + margin * 2) * scale;
  const pixels = new Uint8ClampedArray(side * side * 4).fill(255);
  const gap = qr.qrHole(matrix.size, hole);
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (!matrix.data[y][x] || qr.inHole(gap, x, y)) continue;
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const i = (((y + margin) * scale + dy) * side + (x + margin) * scale + dx) * 4;
          pixels[i] = pixels[i + 1] = pixels[i + 2] = 0;
        }
      }
    }
  }
  return jsQR(pixels, side, side)?.data ?? null;
}

test('qrMatrix: versión 1 mide 21 módulos y crece con el texto', () => {
  const small = qr.qrMatrix('hola', 'L');
  assert.equal(small.version, 1);
  assert.equal(small.size, 21);
  assert.equal(small.data.length, 21);
  const big = qr.qrMatrix('x'.repeat(400), 'M');
  assert.ok(big.size > 21 && big.size === big.version * 4 + 17);
});

test('qrMatrix: lo que se codifica se lee, también con acentos y emojis', () => {
  for (const value of ['https://openfactu.es/f/2026-0042', 'Factura nº 42 · Señor Muñoz 🧾', 'A'.repeat(120)]) {
    for (const level of ['L', 'M', 'Q', 'H']) assert.equal(decode(qr.qrMatrix(value, level)), value, `${level}: ${value}`);
  }
});

test('qrMatrix: lanza si el texto no cabe', () => {
  assert.throws(() => qr.qrMatrix('x'.repeat(8000), 'H'));
});

test('qrHole: centrado, misma paridad y con tope del 30 %', () => {
  const hole = qr.qrHole(25, 0.22);
  assert.equal(hole.to - hole.from, 5 + 2);
  assert.equal(hole.from, 25 - hole.to);
  assert.equal((25 - (hole.to - hole.from)) % 2, 0);
  const capped = qr.qrHole(101, 0.9);
  assert.ok(capped.to - capped.from <= Math.round(101 * 0.3) + 1);
  assert.equal(qr.qrHole(25, 0), null);
});

test('el hueco del logo con nivel H sigue leyéndose', () => {
  const value = 'https://openfactu.es/verifactu?nif=B12345678&num=2026-0042&fecha=29-10-2026&importe=121.00';
  assert.equal(decode(qr.qrMatrix(value, 'H'), 0.22), value);
  assert.equal(decode(qr.qrMatrix(value, 'H'), 0.3), value);
});

test('isFinder marca las tres esquinas y no la cuarta', () => {
  assert.ok(qr.isFinder(21, 0, 0) && qr.isFinder(21, 20, 6) && qr.isFinder(21, 6, 20));
  assert.ok(!qr.isFinder(21, 20, 20) && !qr.isFinder(21, 7, 7));
});

test('qrPaths: los ojos van aparte y el hueco quita módulos', () => {
  const matrix = qr.qrMatrix('openfactu', 'H');
  const plain = qr.qrPaths(matrix);
  const holed = qr.qrPaths(matrix, { hole: 0.25 });
  assert.ok(plain.modules.length > holed.modules.length);
  assert.equal((plain.eyes.match(/M/g) || []).length, 9);
  assert.ok(!/NaN|undefined/.test(plain.modules + plain.eyes));
  for (const modules of ['square', 'rounded', 'dots']) {
    for (const eyes of ['square', 'rounded', 'circle']) {
      const p = qr.qrPaths(matrix, { modules, eyes });
      assert.ok(p.modules.length > 0 && !/NaN|undefined/.test(p.modules + p.eyes), `${modules}/${eyes}`);
    }
  }
});

test('qrToSvg: SVG autónomo con margen en el viewBox', () => {
  const svg = qr.qrToSvg('hola', { margin: 4, size: 300, color: '#112233' });
  assert.match(svg, /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" width="300" height="300" viewBox="-4 -4 29 29">/);
  assert.match(svg, /fill="#112233"/);
  assert.doesNotMatch(svg, /var\(/);
});

test('QRCode: marcado accesible y respaldo si no cabe', () => {
  const { QRCode } = require('../src/qr/QRCode.tsx');
  const React = require('react');
  const html = render(QRCode, { value: 'hola', size: 120 });
  assert.match(html, /role="img"/);
  assert.match(html, /aria-label="Código QR: hola"/);
  assert.match(html, /viewBox="-2 -2 25 25"/);
  const logo = render(QRCode, { value: 'hola', logo: React.createElement('b', null, 'K') });
  assert.match(logo, /k-qr-logo/);
  const tooLong = render(QRCode, { value: 'x'.repeat(8000) });
  assert.match(tooLong, /role="alert"/);
});
