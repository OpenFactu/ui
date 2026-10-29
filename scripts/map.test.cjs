const test = require('node:test');
const assert = require('node:assert/strict');
const { near } = require('./test-support.cjs');
const geo = require('../src/map/geo.ts');

test('project/unproject are inverse at every zoom, including fractional', () => {
  for (const zoom of [0, 3, 7.5, 14, 18.25]) {
    for (const p of [{ lat: 40.4168, lng: -3.7038 }, { lat: -33.8688, lng: 151.2093 }, { lat: 0, lng: 0 }, { lat: 64.1466, lng: -21.9426 }]) {
      const back = geo.unproject(geo.project(p, zoom), zoom);
      near(back.lat, p.lat, 1e-7); near(back.lng, p.lng, 1e-7);
    }
  }
});

test('known Web Mercator values', () => {
  const origin = geo.project({ lat: 0, lng: 0 }, 0);
  near(origin.x, 128); near(origin.y, 128);
  const madrid = geo.project({ lat: 40.4168, lng: -3.7038 }, 10);
  // Fórmula estándar de teselas (wiki de OSM), independiente de la nuestra.
  const lat = 40.4168; const lng = -3.7038; const n = 2 ** 10;
  const tx = Math.floor(((lng + 180) / 360) * n);
  const ty = Math.floor(((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * n);
  assert.equal(Math.floor(madrid.x / 256), tx);
  assert.equal(Math.floor(madrid.y / 256), ty);
  near(geo.worldSize(3), 2048);
});

test('latitude is clamped to the projection limits', () => {
  const top = geo.project({ lat: 90, lng: 0 }, 5);
  assert.ok(Number.isFinite(top.y) && Math.abs(top.y) < 1e-3);
  const bottom = geo.project({ lat: -90, lng: 0 }, 5);
  near(bottom.y, geo.worldSize(5), 1e-3);
});

test('wrapLng and wrapTileX repeat the world', () => {
  near(geo.wrapLng(190), -170); near(geo.wrapLng(-190), 170); near(geo.wrapLng(180), -180); near(geo.wrapLng(0), 0);
  assert.equal(geo.wrapTileX(-1, 3), 7); assert.equal(geo.wrapTileX(8, 3), 0); assert.equal(geo.wrapTileX(5, 3), 5);
});

test('visibleTiles covers the viewport and clips latitude', () => {
  const tiles = geo.visibleTiles({ lat: 40.4168, lng: -3.7038 }, 10, 10, 800, 600);
  assert.ok(tiles.length >= 12 && tiles.length <= 20, String(tiles.length));
  assert.ok(tiles.every((t) => t.z === 10 && t.y >= 0 && t.y < 1024));
  const c = geo.project({ lat: 40.4168, lng: -3.7038 }, 10);
  assert.ok(tiles.some((t) => t.x === Math.floor(c.x / 256) && t.y === Math.floor(c.y / 256)), 'incluye la tesela del centro');
  // Ampliando (zoom 10,5 con teselas de z=10) hacen falta menos teselas que a 1:1.
  assert.ok(geo.visibleTiles({ lat: 40, lng: -3 }, 11, 10, 800, 600).length < tiles.length + 1);
  // Polo: nunca salen índices fuera del mundo en vertical.
  assert.ok(geo.visibleTiles({ lat: 85, lng: 0 }, 3, 3, 1200, 900).every((t) => t.y >= 0 && t.y < 8));
});

test('fitBounds frames the points inside the window', () => {
  const points = [{ lat: 36, lng: -9 }, { lat: 43.8, lng: 3.3 }];
  const b = geo.boundsOf(points);
  assert.deepEqual(b, { south: 36, west: -9, north: 43.8, east: 3.3 });
  const { center, zoom } = geo.fitBounds(b, 800, 600, 32);
  for (const p of points) {
    const c = geo.project(center, zoom); const q = geo.project(p, zoom);
    assert.ok(Math.abs(q.x - c.x) <= 400 - 32 + 1 && Math.abs(q.y - c.y) <= 300 - 32 + 1, 'cabe con margen');
  }
  // Un solo punto no tiene tamaño: el zoom se queda en el máximo.
  assert.equal(geo.fitBounds(geo.boundsOf([points[0]]), 800, 600).zoom, 19);
  assert.equal(geo.boundsOf([]), null);
});

test('clusterPoints groups nearby points, is pan-stable and splits when zooming in', () => {
  const points = [
    { id: 'a', lat: 40.4168, lng: -3.7038 }, { id: 'b', lat: 40.4170, lng: -3.7040 }, { id: 'c', lat: 40.4165, lng: -3.7035 },
    { id: 'd', lat: 41.3874, lng: 2.1686 },
  ];
  const far = geo.clusterPoints(points, 6, 60);
  assert.equal(far.reduce((n, c) => n + c.count, 0), 4);
  assert.ok(far.some((c) => c.count === 3), 'los tres de Madrid juntos');
  const madrid = far.find((c) => c.count === 3);
  near(madrid.lat, (40.4168 + 40.4170 + 40.4165) / 3, 1e-9);
  const close = geo.clusterPoints(points, 19, 60);
  assert.equal(close.length, 4, 'a zoom máximo cada punto va solo');
  assert.ok(close.every((c) => c.count === 1 && c.id.startsWith('p:')));
  assert.deepEqual(geo.clusterPoints([], 5), []);
});

test('distance, pathLength, formatDistance and metersPerPixel', () => {
  const madrid = { lat: 40.4168, lng: -3.7038 }; const barcelona = { lat: 41.3874, lng: 2.1686 };
  const km = geo.distance(madrid, barcelona) / 1000;
  assert.ok(km > 500 && km < 510, String(km)); // ~505 km en línea recta
  near(geo.distance(madrid, madrid), 0);
  near(geo.distance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }), 111195, 60);
  near(geo.pathLength([madrid, barcelona, madrid]), 2 * geo.distance(madrid, barcelona), 1e-6);
  assert.equal(geo.pathLength([madrid]), 0);
  assert.equal(geo.formatDistance(850), '850 m');
  assert.match(geo.formatDistance(12400), /^12,4 km$/);
  near(geo.metersPerPixel(0, 0), 156543.03392, 1e-4);
  assert.ok(geo.metersPerPixel(60, 10) < geo.metersPerPixel(0, 10), 'los píxeles abarcan menos lejos del ecuador');
});

test('map style registry: built-ins, register, replace, unregister and validation', () => {
  const styles = require('../src/map/styles.ts');
  const ids = styles.getMapStyles().map((s) => s.id);
  for (const id of ['standard', 'light', 'dark', 'mono', 'mono-dark']) assert.ok(ids.includes(id), id);
  assert.equal(styles.getMapStyle('mono').filter.includes('grayscale'), true);
  assert.equal(styles.getMapStyle('mono-dark').tone, 'dark');
  assert.equal(styles.getMapStyle('no-existe').id, 'standard', 'cae en el estándar');
  const off = styles.registerMapStyle({ id: 'empresa', label: 'Empresa', tileUrl: 'https://t.example.com/{z}/{x}/{y}.png' });
  assert.ok(styles.getMapStyles().some((s) => s.id === 'empresa'));
  off();
  assert.ok(!styles.getMapStyles().some((s) => s.id === 'empresa'));
  styles.unregisterMapStyle('standard');
  assert.ok(styles.getMapStyles().some((s) => s.id === 'standard'), 'los incluidos no se quitan');
  assert.throws(() => styles.registerMapStyle({ id: 'malo', label: 'Malo', tileUrl: 'https://t.example.com/tile.png' }), /\{z\}/);
});

test('localGeocoder is accent-insensitive and capped; combineGeocoders survives failures', async () => {
  const { localGeocoder, combineGeocoders } = require('../src/map/geocode.ts');
  const sedes = [{ lat: 1, lng: 1, name: 'Málaga Centro' }, { lat: 2, lng: 2, name: 'Madrid' }, { lat: 3, lng: 3, name: 'Malaga Puerto' }];
  const g = localGeocoder(sedes, (s) => ({ id: s.name, label: s.name }), 2);
  const signal = new AbortController().signal;
  assert.deepEqual((await g('malaga', signal)).map((r) => r.id), ['Málaga Centro', 'Malaga Puerto']);
  assert.deepEqual(await g('   ', signal), []);
  assert.equal((await g('ma', signal)).length, 2, 'respeta el límite');
  const broken = async () => { throw new Error('caído'); };
  const all = combineGeocoders(broken, g);
  assert.equal((await all('madrid', signal)).length, 1);
});
