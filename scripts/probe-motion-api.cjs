/**
 * API de animación (con Ladle en marcha): `animate()`, `Motion`, `Presence`, valores de movimiento, `drag` y `layout`.
 * La lógica pura se prueba en `scripts/motion-api.test.cjs`; aquí, lo que solo se ve en un navegador de verdad.
 *
 *   node scripts/probe-motion-api.cjs
 */
const path = require('node:path');
const { run, storyUrl, collectErrors, flick, touch } = require('./probe-kit.cjs');

const MODULE = `/@fs/${path.resolve(__dirname, '../src/motion/index.ts').replace(/\\/g, '/')}`;

/** Lo que se ejecuta dentro de la página: el módulo y unas ayudas. */
const inPage = (page, body, arg) => page.evaluate(async ([modulePath, source, extra]) => {
  const m = await import(modulePath);
  const $ = (id) => document.querySelector(`[data-testid="${id}"]`);
  const css = (el) => getComputedStyle(el);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
  // eslint-disable-next-line no-new-func
  return new Function('m', '$', 'css', 'wait', 'frame', 'extra', `return (${source})(m, $, css, wait, frame, extra);`)(m, $, css, wait, frame, extra);
}, [MODULE, body.toString(), arg]);


async function animateFunction(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = collectErrors(page);
  const warnings = [];
  page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto(storyUrl('animar--pruebas'), { waitUntil: 'networkidle' });

  const arrives = await inPage(page, async (m, $, css) => {
    const el = $('caja');
    const controls = m.animate(el, { x: 100 }, { spring: { duration: 0.15, bounce: 0 } });
    const during = controls.animating;
    const result = await controls.finished;
    return { during, finished: result.finished, translate: css(el).translate, after: controls.animating };
  });
  check('llega al destino y finished se cumple', arrives.finished === true && arrives.translate === '100px', JSON.stringify(arrives));
  check('animating dice si sigue en marcha', arrives.during === true && arrives.after === false);

  const jump = await inPage(page, async (m, $, css, wait, frame) => {
    const el = $('caja');
    m.animate(el, { x: 0 }, { spring: { duration: 0.01, bounce: 0 } });
    await wait(60);
    const read = () => parseFloat(css(el).translate) || 0;
    const samples = [];
    let stop = false;
    const sampler = (async () => { while (!stop) { samples.push(read()); await frame(); } })();
    m.animate(el, { x: 300 }, { spring: { duration: 0.6, bounce: 0 } });
    await wait(180);
    const at = samples.length;
    await m.animate(el, { x: -100 }, { spring: { duration: 0.6, bounce: 0 } }).finished;
    stop = true;
    await sampler;
    const steps = samples.slice(1).map((value, i) => Math.abs(value - samples[i]));
    return { before: Math.max(...steps.slice(0, at - 1)), after: Math.max(...steps.slice(at - 1)) };
  });
  check('interrumpir no salta: el mayor paso entre fotogramas no se dispara', jump.after < jump.before * 3, JSON.stringify(jump));

  const variable = await inPage(page, async (m, $, css, wait) => {
    const el = $('caja-var');
    await m.animate(el, { color: 'var(--bg-card)' }, { spring: { duration: 0.15, bounce: 0 } }).finished;
    const light = css(el).color;
    document.documentElement.classList.add('dark');
    await wait(50);
    const dark = css(el).color;
    document.documentElement.classList.remove('dark');
    return { style: el.style.color, light, dark };
  });
  check('color en var(): el valor final es la variable', variable.style === 'var(--bg-card)', variable.style);
  check('al cambiar a oscuro, el color sigue a la variable', variable.light !== variable.dark, `${variable.light} → ${variable.dark}`);

  const tailwind = await inPage(page, async (m, $, css) => {
    const el = $('caja-tw');
    const before = css(el).transform;
    await m.animate(el, { x: 40 }, { spring: { duration: 0.15, bounce: 0 } }).finished;
    return { before, transform: css(el).transform, translate: css(el).translate };
  });
  check('no pisa el transform de Tailwind', tailwind.before !== 'none' && tailwind.transform === tailwind.before && tailwind.translate === '40px', JSON.stringify(tailwind));

  const removed = await inPage(page, async (m, $, css, wait) => {
    const el = document.createElement('div');
    $('caja').parentElement.append(el);
    const controls = m.animate(el, { x: 100 }, { spring: { duration: 1, bounce: 0 } });
    await wait(60);
    el.remove();
    return (await controls.finished).finished;
  });
  check('quitarlo a mitad no da error y finished es false', removed === false && errors.length === 0);

  const hidden = await inPage(page, async (m, $) => {
    const el = $('caja-oculta');
    const log = [];
    const controls = m.animate(el, { width: 'auto', x: '50%', height: '40%', opacity: 1 }, { spring: { duration: 0.15, bounce: 0 }, onUpdate: () => log.push(el.style.cssText) });
    const result = await controls.finished;
    return { finished: result.finished, nan: log.some((text) => /NaN|Infinity/.test(text)) || /NaN/.test(el.style.cssText), style: el.style.cssText };
  });
  check('oculto hacia auto y %: nunca escribe NaN y llega', hidden.finished && !hidden.nan && /width: auto/.test(hidden.style), hidden.style);

  const handoff = await inPage(page, async (m, $, css, wait, frame) => {
    const value = m.createMotionValue(0);
    m.animate(value, 1000, { spring: { duration: 0.8, bounce: 0 } });
    await wait(120);
    const before = value.velocity();
    m.animate(value, 2000, { spring: { duration: 0.8, bounce: 0 } });
    await frame();
    await frame();
    return { before, after: value.velocity() };
  });
  check('interrumpir hereda la velocidad', handoff.before > 200 && handoff.after > handoff.before * 0.5, JSON.stringify(handoff));

  const reversed = await inPage(page, async (m, $, css, wait, frame) => {
    const el = document.createElement('div');
    document.body.append(el);
    await m.animate(el, { x: [0, 100] }, { timing: { duration: 120, ease: 'linear' }, repeat: 1, repeatType: 'reverse' }).finished;
    const odd = css(el).translate;
    await m.animate(el, { x: [0, 100] }, { timing: { duration: 60, ease: 'linear' }, repeat: 2, repeatType: 'reverse' }).finished;
    const even = css(el).translate;
    const seen = [];
    const loop = m.animate(el, { x: [0, 100, 50] }, { spring: { duration: 0.1, bounce: 0 }, repeat: Infinity, repeatType: 'reverse', onUpdate: () => seen.push(parseFloat(css(el).translate) || 0) });
    await wait(700);
    loop.stop();
    el.remove();
    return { odd, even, min: Math.min(...seen), max: Math.max(...seen) };
  });
  check('repeat impar con reverse acaba donde empezó', reversed.odd === 'none', reversed.odd);
  check('repeat par con reverse acaba en el destino', reversed.even === '100px', reversed.even);
  check('reverse no se sale de lo pedido', reversed.min >= -1 && reversed.max <= 101, JSON.stringify(reversed));

  const variableScale = await inPage(page, async (m, $, css) => {
    const el = document.createElement('div');
    el.style.setProperty('--s', '0.5');
    document.body.append(el);
    await m.animate(el, { scale: 'var(--s)' }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    const first = css(el).scale;
    el.style.setProperty('--s', '2');
    const second = css(el).scale;
    await m.animate(el, { scale: '50%' }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    const percent = css(el).scale;
    el.remove();
    return { first, second, percent };
  });
  check('scale con var() sigue a la variable', variableScale.first === '0.5' && variableScale.second === '2', JSON.stringify(variableScale));
  check('scale con % es una fracción', variableScale.percent === '0.5', variableScale.percent);

  warnings.length = 0;
  const custom = await inPage(page, async (m, $, css, wait) => {
    const el = document.createElement('div');
    document.body.append(el);
    const controls = m.animate(el, { '--progreso': 1 }, { timing: { duration: 200, ease: 'linear' } });
    await wait(100);
    const mid = parseFloat(el.style.getPropertyValue('--progreso'));
    await controls.finished;
    const end = el.style.getPropertyValue('--progreso');
    el.remove();
    return { mid, end };
  });
  check('una variable sin definir se anima desde 0', custom.mid > 0.1 && custom.mid < 0.9 && custom.end === '1' && warnings.length === 0, JSON.stringify(custom));

  const pending = await inPage(page, async (m, $, css) => {
    const el = document.createElement('div');
    el.style.display = 'block';
    document.body.append(el);
    m.animate(el, { opacity: 0, display: 'none' }, { spring: { duration: 0.5, bounce: 0 } });
    await m.animate(el, { opacity: 1 }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    await new Promise((resolve) => setTimeout(resolve, 100));
    const display = css(el).display;
    el.remove();
    return display;
  });
  check('interrumpir un fundido no deja aplicado su display: none', pending === 'block', pending);

  const framesRtl = await inPage(page, async (m, $, css) => {
    const rtl = $('caja-rtl');
    rtl.style.translate = 'none';
    await m.animate(rtl, { inlineX: [0, 50] }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    const value = parseFloat(css(rtl).translate);
    const el = document.createElement('div');
    el.style.translate = '0px 30px';
    document.body.append(el);
    await m.animate(el, { x: [0, 10] }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    const both = css(el).translate;
    el.remove();
    return { value, both };
  });
  check('fotogramas explícitos: inlineX se refleja y no pierde el otro eje', framesRtl.value === -50 && framesRtl.both === '10px 30px', JSON.stringify(framesRtl));

  const kept = await inPage(page, async (m) => {
    const el = document.createElement('div');
    el.style.translate = '5px';
    document.body.append(el);
    await m.animate(el, { scale: 2 }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    const text = el.style.translate;
    el.remove();
    return text;
  });
  check('animar scale no borra un translate ajeno', kept === '5px', kept);

  const zero = await inPage(page, async (m) => {
    const el = document.createElement('div');
    el.style.cssText = 'width:0;height:0';
    document.body.append(el);
    await m.animate(el, { x: ['10px', '50%'] }, { spring: { duration: 0.1, bounce: 0 } }).finished;
    const text = el.style.cssText;
    el.remove();
    return text;
  });
  check('tamaño 0 hacia %: sin NaN', !/NaN|Infinity/.test(zero), zero);

  const staggered = await inPage(page, async (m, $, css, wait, frame) => {
    const items = ['caja-a', 'caja-b', 'caja-c'].map($);
    const starts = [null, null, null];
    const begin = performance.now();
    const controls = m.animate(items, { y: 10 }, { spring: { duration: 0.2, bounce: 0 }, stagger: 60 });
    let running = true;
    void controls.finished.then(() => { running = false; });
    while (running) {
      items.forEach((el, i) => { if (starts[i] === null && css(el).translate !== 'none' && parseFloat(css(el).translate.split(' ')[1]) > 0) starts[i] = performance.now() - begin; });
      await frame();
    }
    return starts;
  });
  check('stagger: cada elemento arranca después', staggered[1] - staggered[0] >= 30 && staggered[2] - staggered[1] >= 30, staggered.map(Math.round).join(', '));

  const auto = await inPage(page, async (m, $, css) => {
    const el = $('caja-b');
    el.style.width = 'auto';
    const natural = el.getBoundingClientRect().width;
    el.style.width = '20px';
    const controls = m.animate(el, { width: 'auto' }, { spring: { duration: 0.15, bounce: 0 } });
    await controls.finished;
    return { style: el.style.width, width: el.getBoundingClientRect().width, natural };
  });
  check('width a auto: mide, anima y restaura auto', auto.style === 'auto' && Math.abs(auto.width - auto.natural) < 1, JSON.stringify(auto));

  const svg = await inPage(page, async (m, $, css) => {
    const path = $('trazo');
    await m.animate(path, { pathLength: [0, 1] }, { spring: { duration: 0.15, bounce: 0 } }).finished;
    const circle = $('circulo');
    await m.animate(circle, { r: 40 }, { spring: { duration: 0.15, bounce: 0 } }).finished;
    return { dash: css(path).strokeDasharray, attr: path.getAttribute('pathLength'), r: circle.getAttribute('r') };
  });
  check('pathLength dibuja el trazo', svg.attr === '1' && svg.dash.startsWith('1'), JSON.stringify(svg));
  check('atributo SVG numérico', svg.r === '40');

  const frames = await inPage(page, async (m, $, css, wait, frame) => {
    const el = $('caja-c');
    await m.animate(el, { x: 30 }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    const seen = [];
    const controls = m.animate(el, { x: [null, 100] }, { timing: { duration: 200, ease: 'linear' }, onUpdate: () => seen.push(parseFloat(css(el).translate)) });
    await controls.finished;
    const timed = m.animate(el, { x: [0, 100, 0] }, { timing: { duration: 400, ease: 'linear', times: [0, 0.75, 1] } });
    await wait(150);
    const mid = parseFloat(css(el).translate);
    await timed.finished;
    return { first: seen[0], mid };
  });
  check('fotogramas con null parten del valor actual', frames.first >= 30 && frames.first < 60, String(frames.first));
  check('timing.times reparte los tramos', frames.mid > 20 && frames.mid < 75, String(frames.mid));

  const discrete = await inPage(page, async (m, $, css) => {
    const el = document.createElement('div');
    el.style.cssText = 'display:none;opacity:0';
    document.body.append(el);
    const showing = m.animate(el, { display: 'block', opacity: 1 }, { spring: { duration: 0.1, bounce: 0 } });
    const shownAtStart = css(el).display === 'block';
    await showing.finished;
    const hiding = m.animate(el, { display: 'none', opacity: 0 }, { spring: { duration: 0.1, bounce: 0 } });
    const stillShown = css(el).display === 'block';
    await hiding.finished;
    const hiddenAtEnd = css(el).display === 'none';
    el.remove();
    return { shownAtStart, stillShown, hiddenAtEnd };
  });
  check('display: se aplica al empezar si muestra y al terminar si oculta', discrete.shownAtStart && discrete.stillShown && discrete.hiddenAtEnd, JSON.stringify(discrete));

  warnings.length = 0;
  const mismatch = await inPage(page, async (m) => {
    const el = document.createElement('div');
    el.style.filter = 'blur(1px)';
    document.body.append(el);
    const controls = m.animate(el, { filter: 'grayscale(1)', opacity: 0 }, { spring: { duration: 0.1, bounce: 0 } });
    const during = el.style.filter;
    await controls.finished;
    const after = el.style.filter;
    el.remove();
    return { during, after };
  });
  check('formas no interpolables saltan al final y avisan', mismatch.during === 'blur(1px)' && mismatch.after === 'grayscale(1)' && warnings.length >= 1, JSON.stringify(mismatch));

  const blur = await inPage(page, async (m, $, css, wait) => {
    const el = document.createElement('div');
    document.body.append(el);
    const controls = m.animate(el, { filter: 'blur(8px)' }, { timing: { duration: 300, ease: 'linear' } });
    await wait(150);
    const mid = parseFloat(css(el).filter.replace('blur(', ''));
    await controls.finished;
    const end = css(el).filter;
    el.remove();
    return { mid, end };
  });
  check('filter desde none se interpola', blur.mid > 1 && blur.mid < 7 && blur.end === 'blur(8px)', JSON.stringify(blur));

  warnings.length = 0;
  await inPage(page, async (m) => {
    const el = document.createElement('div');
    el.style.transition = 'opacity 1s';
    document.body.append(el);
    await m.animate(el, { opacity: 0 }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    await m.animate(el, { opacity: 1 }, { spring: { duration: 0.05, bounce: 0 } }).finished;
    el.remove();
  });
  check('una transición CSS sobre la misma propiedad avisa una vez', warnings.filter((text) => /transici/.test(text)).length === 1, warnings.join(' | '));

  const logical = await inPage(page, async (m, $, css) => {
    const rtl = $('caja-rtl');
    const ltr = $('caja-ltr');
    await Promise.all([m.animate(rtl, { inlineX: 50 }, { spring: { duration: 0.1, bounce: 0 } }).finished, m.animate(ltr, { inlineX: 50 }, { spring: { duration: 0.1, bounce: 0 } }).finished]);
    const inlineRtl = parseFloat(css(rtl).translate);
    const inlineLtr = parseFloat(css(ltr).translate);
    await Promise.all([m.animate(rtl, { inlineX: 0, x: 20 }, { spring: { duration: 0.1, bounce: 0 } }).finished]);
    return { inlineRtl, inlineLtr, xRtl: parseFloat(css(rtl).translate) };
  });
  check('inlineX invierte el signo en RTL; x no', logical.inlineRtl === -50 && logical.inlineLtr === 50 && logical.xRtl === 20, JSON.stringify(logical));

  await page.goto(storyUrl('animar--función'), { waitUntil: 'networkidle' });
  await page.getByTestId('acotado-mover').click();
  await page.waitForTimeout(200);
  const scoped = await inPage(page, async (m, $, css) => ({ inside: parseFloat(css($('dentro')).translate) || 0, outside: css($('fuera')).translate }));
  check('useAnimate: los selectores se quedan dentro de su raíz', scoped.inside > 0 && scoped.outside === 'none', JSON.stringify(scoped));
  await page.getByTestId('acotado-montar').click();
  await page.waitForTimeout(100);
  check('useAnimate: al desmontar detiene lo suyo', (await page.getByTestId('acotado-resultado').textContent()) === 'se detuvo');

  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();
}

async function withoutMotion(browser, { check }) {
  const measure = async (page, prepare) => inPage(page, async (m, $, css, wait, frame, source) => {
    // eslint-disable-next-line no-new-func
    new Function('el', source)($('caja'));
    const el = $('caja');
    const begin = performance.now();
    await m.animate(el, { x: 77, opacity: 0.5 }, { spring: { duration: 2, bounce: 0 } }).finished;
    const forever = m.animate(el, { y: [0, 10] }, { timing: { duration: 500 }, repeat: Infinity, repeatType: 'reverse' });
    const done = await Promise.race([forever.finished.then(() => true), wait(100).then(() => false)]);
    return { ms: performance.now() - begin - (done ? 0 : 100), translate: css(el).translate, opacity: css(el).opacity, done };
  }, prepare);

  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(storyUrl('animar--pruebas'), { waitUntil: 'networkidle' });
  const a = await measure(reduced, '');
  check('movimiento reducido: destino al instante', a.ms < 50 && a.translate.startsWith('77px') && a.opacity === '0.5', JSON.stringify(a));
  check('repeat sin fin con movimiento reducido no se repite', a.done);
  await reduced.close();

  const page = await browser.newPage();
  await page.goto(storyUrl('animar--pruebas'), { waitUntil: 'networkidle' });
  const b = await measure(page, "el.setAttribute('data-motion', 'off');");
  check('data-motion="off": destino al instante', b.ms < 50 && b.translate.startsWith('77px'), JSON.stringify(b));
  await page.goto(storyUrl('animar--pruebas'), { waitUntil: 'networkidle' });
  const c = await measure(page, "document.documentElement.style.setProperty('--k-motion', '0');");
  check('velocidad 0 del tema: destino al instante', c.ms < 50 && c.translate.startsWith('77px'), JSON.stringify(c));
  await page.close();
}

async function motionStates(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar--estados'), { waitUntil: 'networkidle' });
  const boton = page.getByTestId('boton');
  const scale = async () => parseFloat(await boton.evaluate((el) => getComputedStyle(el).scale)) || 1;

  await boton.hover();
  await page.waitForTimeout(300);
  const hovered = await scale();
  await page.mouse.down();
  await page.waitForTimeout(300);
  const pressed = await scale();
  check('prioridad: pulsar gana a pasar', Math.abs(pressed - 0.96) < 0.01, String(pressed));
  await page.mouse.up();
  await page.waitForTimeout(300);
  const back = await scale();
  check('al soltar vuelve a lo de pasar', Math.abs(back - 1.2) < 0.01, String(back));
  await page.mouse.move(800, 700);
  await page.waitForTimeout(300);
  check('hover anima y vuelve', hovered > 1.19 && (await scale()) === 1, `${hovered} → ${await scale()}`);

  await boton.focus();
  await page.keyboard.down('Enter');
  await page.waitForTimeout(250);
  const keyed = await scale();
  await page.keyboard.up('Enter');
  await page.waitForTimeout(250);
  check('Intro activa whileTap en un botón', Math.abs(keyed - 0.96) < 0.01 && (await scale()) === 1, String(keyed));

  await page.goto(storyUrl('animar--pruebas'), { waitUntil: 'networkidle' });
  const vuelta = page.getByTestId('vuelta');
  await vuelta.hover();
  await page.waitForTimeout(250);
  const during = await vuelta.evaluate((el) => ({ color: getComputedStyle(el).color, width: el.getBoundingClientRect().width }));
  await page.mouse.move(800, 700);
  await page.waitForTimeout(300);
  const returned = await vuelta.evaluate((el) => {
    const inline = { width: el.style.width, color: el.style.color };
    el.style.setProperty('--prueba-color', 'rgb(0, 128, 0)');
    const color = getComputedStyle(el).color;
    return { inline, color };
  });
  check('al acabar whileHover no queda fijado: vuelve a seguir a la variable y a su clase', during.width === 200 && returned.inline.width === '' && returned.color === 'rgb(0, 128, 0)', JSON.stringify({ during, returned }));

  const settled = await page.getByTestId('asentado').evaluate((el) => {
    const style = getComputedStyle(el);
    return [style.translate, style.rotate, style.scale].join();
  });
  check('al llegar al reposo no queda un bloque contenedor', settled === 'none,none,none', settled);
  const circle = await page.getByTestId('circulo-motion').evaluate((el) => ({ attr: el.getAttribute('r'), css: getComputedStyle(el).r, box: el.getBBox().width }));
  check('Motion.circle crece de verdad', circle.attr === '30' && circle.box === 60, JSON.stringify(circle));

  const reading = (id) => page.getByTestId(id).evaluate((el) => ({ translate: parseFloat(getComputedStyle(el).translate) || 0, opacity: getComputedStyle(el).opacity, text: el.textContent }));
  await page.waitForTimeout(100);
  const rests = await page.getByTestId('estricto').textContent();
  check('StrictMode no duplica animaciones', rests === '1', rests);
  await page.goto(storyUrl('animar--estados'), { waitUntil: 'load' });
  await page.getByTestId('literal').waitFor();
  await page.waitForTimeout(300);
  const before = await reading('literal');
  await page.getByTestId('rerender').click();
  await page.getByTestId('rerender').click();
  await page.waitForTimeout(50);
  const after = await reading('literal');
  check('repintar el padre no reinicia ni salta', after.translate > before.translate && after.translate - before.translate < 90, `${before.translate} → ${after.translate}`);
  await page.waitForTimeout(400);
  check('style con la misma propiedad no pisa lo animado', (await reading('con-style')).opacity === '1');
  check('Motion.create con un componente propio', (await reading('propio')).opacity === '1');

  const unseen = await reading('vista');
  await page.getByTestId('vista').scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  const seen = await reading('vista');
  check('inView: hasta entrar se ve initial', unseen.opacity === '0' && seen.opacity === '1', `${unseen.opacity} → ${seen.opacity}`);
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const touch = await phone.newPage();
  await touch.goto(storyUrl('animar--estados'), { waitUntil: 'networkidle' });
  await touch.getByTestId('boton').tap();
  await touch.waitForTimeout(350);
  const stuck = await touch.getByTestId('boton').evaluate((el) => parseFloat(getComputedStyle(el).scale) || 1);
  check('en táctil el hover no se queda pegado', stuck === 1, String(stuck));
  await phone.close();
}

async function motionVariants(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto(storyUrl('animar--variantes'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);
  const visible = await page.getByTestId('hijo-2').evaluate((el) => getComputedStyle(el).opacity);
  check('variantes: los hijos heredan el nombre', visible === '1', visible);
  const starts = await inPage(page, async (m, $, css, wait, frame) => {
    $('variantes-cambiar').click();
    const items = [0, 1, 2].map((i) => $(`hijo-${i}`));
    const found = [null, null, null];
    const begin = performance.now();
    while (performance.now() - begin < 900) {
      items.forEach((el, i) => { if (found[i] === null && parseFloat(css(el).opacity) < 1) found[i] = performance.now() - begin; });
      await frame();
    }
    return found;
  });
  check('stagger en el padre escalona a los hijos', starts[1] - starts[0] >= 30 && starts[2] - starts[1] >= 30, starts.map(Math.round).join(', '));
  await page.goto(storyUrl('animar--pruebas'), { waitUntil: 'networkidle' });
  const lone = await inPage(page, async (m, $, css, wait, frame) => {
    const el = $('hijo-suelto');
    const delays = [];
    for (let i = 0; i < 5; i += 1) {
      const from = css(el).translate;
      el.click();
      const begin = performance.now();
      while (css(el).translate === from && performance.now() - begin < 900) await frame();
      delays.push(performance.now() - begin);
      await wait(250);
    }
    return delays;
  });
  check('el retardo de stagger no crece si el padre no se repinta', Math.max(...lone) < 80, lone.map(Math.round).join(', '));
  await page.close();
}

async function motionPresets(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const warnings = [];
  page.on('console', (message) => { if (message.type() === 'warning') warnings.push(message.text()); });
  await page.goto(storyUrl('animar--efectos'), { waitUntil: 'networkidle' });
  await page.goto(storyUrl('animar--pruebas'), { waitUntil: 'load' });
  await page.getByTestId('explicito').waitFor();
  const read = (id) => page.getByTestId(id).evaluate((el) => getComputedStyle(el).translate.split(' ').map(parseFloat));
  const explicit = await read('explicito');
  const [ltr] = await read('ltr-lento');
  const [rtl] = await read('rtl-lento');
  check('efecto con nombre y prop explícita que gana', explicit[1] > 20, explicit.join(' '));
  check('efecto en RTL: fade-start se refleja', ltr < 0 && rtl > 0 && Math.abs(ltr + rtl) < 4, `${ltr} / ${rtl}`);
  check('los efectos de serie se interpolan sin avisos', !warnings.some((text) => /no se puede interpolar/.test(text)), warnings.join(' | '));
  check('nombre desconocido avisa y no anima', warnings.some((text) => /no-existe/.test(text)) && (await page.getByTestId('desconocido').evaluate((el) => el.style.translate)) === '', warnings.join(' | '));
  await page.close();
}

async function motionTheme(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto(storyUrl('animar--pruebas'), { waitUntil: 'networkidle' });
  const themeModule = `/@fs/${path.resolve(__dirname, '../src/theme/index.ts').replace(/\\/g, '/')}`;
  const overshoot = (character) => inPage(page, async (m, $, css, wait, frame, extra) => {
    const { applyTheme } = await import(extra.themeModule);
    applyTheme({ motion: { character: extra.character } }, document.documentElement, { injectFontLink: false });
    const el = $('caja');
    await m.animate(el, { x: 0 }, { spring: { duration: 0.01, bounce: 0 } }).finished;
    const controls = m.animate(el, { x: 100 }, { spring: 'enter' });
    let max = 0;
    let running = true;
    void controls.finished.then(() => { running = false; });
    while (running) { max = Math.max(max, parseFloat(css(el).translate) || 0); await frame(); }
    return max;
  }, { themeModule, character });
  const sober = await overshoot('sober');
  const playful = await overshoot('playful');
  check('cambiar el carácter del tema cambia el movimiento', sober <= 100.5 && playful > 101, `${sober} / ${playful}`);
  await page.close();
}

async function motionMany(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto(storyUrl('animar--muchos'), { waitUntil: 'networkidle' });
  await page.getByTestId('muchos-animar').click();
  await page.waitForTimeout(40);
  const commits = () => page.getByTestId('commits').evaluate((el) => Number(el.textContent));
  const during = await commits();
  await page.waitForTimeout(350);
  const moved = await page.getByTestId('muchos-0').evaluate((el) => parseFloat(getComputedStyle(el).translate.split(' ')[1]) || 0);
  const after = await commits();
  check('200 Motion: ningún commit de React durante la animación', after === during && moved > 0, `${during} → ${after}, y ${moved}`);
  await page.close();
}

async function presence(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar--salidas'), { waitUntil: 'networkidle' });
  const count = (id) => page.getByTestId(id).count();
  const completas = () => page.getByTestId('completas').textContent();

  await page.getByTestId('abrir').click();
  await page.waitForTimeout(60);
  const during = await count('panel');
  const inert = await page.getByTestId('panel').evaluate((el) => el.hasAttribute('inert'));
  await page.waitForTimeout(700);
  check('sale con animación y se desmonta', during === 1 && (await count('panel')) === 0);
  check('lo que sale es inert', inert);
  check('onExitComplete se llama una vez', (await completas()) === '1', await completas());

  await page.getByTestId('abrir').click();
  await page.waitForTimeout(500);
  await page.evaluate(async () => {
    const button = document.querySelector('[data-testid="abrir"]');
    for (let i = 0; i < 12; i += 1) { button.click(); await new Promise((resolve) => setTimeout(resolve, 25)); }
  });
  await page.waitForTimeout(700);
  const quick = await page.getByTestId('panel').evaluateAll((items) => items.map((el) => ({ opacity: getComputedStyle(el).opacity, inert: el.hasAttribute('inert') })));
  check('abrir y cerrar 12 veces en 300 ms: una copia y estado final correcto', quick.length === 1 && quick[0].opacity === '1' && !quick[0].inert, JSON.stringify(quick));

  const lento = page.getByTestId('lento');
  await page.getByTestId('lento-quitar').click();
  await page.waitForTimeout(350);
  const leaving = await lento.evaluate((el) => parseFloat(getComputedStyle(el).translate) || 0);
  await page.getByTestId('lento-quitar').click();
  await page.waitForTimeout(40);
  const turning = await lento.evaluate((el) => parseFloat(getComputedStyle(el).translate) || 0);
  await page.waitForTimeout(1600);
  const home = await lento.evaluate((el) => ({ x: parseFloat(getComputedStyle(el).translate) || 0, inert: el.hasAttribute('inert') }));
  check('la misma key que vuelve invierte desde donde está', leaving > 40 && Math.abs(turning - leaving) < 60 && Math.abs(home.x) < 0.5 && !home.inert && (await count('lento')) === 1, `${leaving} → ${turning} → ${home.x}`);

  await page.getByTestId('cambiar').click();
  await page.waitForTimeout(80);
  const waiting = [await count('espera-a'), await count('espera-b')];
  await page.waitForTimeout(800);
  const swapped = [await count('espera-a'), await count('espera-b')];
  check('mode="wait" espera a que salga', waiting.join() === '1,0' && swapped.join() === '0,1', `${waiting} → ${swapped}`);

  await page.getByTestId('sin-exit-quitar').click();
  check('sin exit se va al momento', (await count('sin-exit')) === 0);

  const present = await page.getByTestId('ya-estaba').evaluate((el) => getComputedStyle(el).opacity);
  check('initial={false} no anima lo que ya estaba', present === '1', present);
  await page.getByTestId('ya-quitar').click();
  await page.waitForTimeout(40);
  await page.getByTestId('ya-quitar').click();
  await page.waitForTimeout(100);
  const again = await page.getByTestId('ya-estaba').evaluate((el) => Number(getComputedStyle(el).opacity));
  check('lo que vuelve a entrar después sí anima', again < 0.9, String(again));

  await page.getByTestId('retardada-quitar').click();
  await page.waitForTimeout(150);
  const held = await page.getByTestId('retardada').textContent();
  await page.waitForTimeout(500);
  check('usePresence retrasa el desmontaje', held === 'Yéndose' && (await count('retardada')) === 0, held);
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();

  const reduced = await browser.newPage({ reducedMotion: 'reduce' });
  await reduced.goto(storyUrl('animar--salidas'), { waitUntil: 'networkidle' });
  await reduced.getByTestId('abrir').click();
  await reduced.waitForTimeout(40);
  check('movimiento reducido: desmonta sin esperar', (await reduced.getByTestId('panel').count()) === 0);
  await reduced.close();
}

async function motionValues(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar--valores'), { waitUntil: 'networkidle' });
  const read = (id) => page.getByTestId(id).evaluate((el) => {
    const style = getComputedStyle(el);
    return { x: parseFloat(style.translate) || 0, y: parseFloat(style.translate.split(' ')[1]) || 0, opacity: style.opacity, background: style.backgroundColor };
  });
  const commits = () => page.getByTestId('valores-commits').evaluate((el) => Number(el.textContent));
  const startCommits = await commits();
  const center = await read('valor-x');
  await page.getByTestId('valor-derecha').click();
  await page.waitForTimeout(20);
  const moved = await read('valor-x');
  const trail = [(await read('valor-suave')).x];
  for (let i = 0; i < 12; i += 1) { await page.waitForTimeout(100); trail.push((await read('valor-suave')).x); }
  check('style con un valor de movimiento escribe sin rerender', moved.x === 100 && (await commits()) === startCommits, `${moved.x}, commits ${startCommits} → ${await commits()}`);
  check('useTransform enlaza la opacidad con x', center.opacity === '1' && moved.opacity === '0.15', `${center.opacity} → ${moved.opacity}`);
  check('motionTemplate cambia el color', center.background !== moved.background, `${center.background} → ${moved.background}`);
  check('useSpringValue sigue con muelle', trail[0] < 100 && Math.abs(trail[trail.length - 1] - 100) < 1, trail.map(Math.round).join(' '));
  await page.mouse.move(200, 300);
  await page.waitForTimeout(30);
  const pointer = await read('puntero');
  check('usePointerValue sigue al puntero', pointer.x === 200 && pointer.y === 300, JSON.stringify(pointer));
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();
}

async function motionScroll(browser, { check }) {
  const scrolled = async (page) => {
    await page.goto(storyUrl('animar--scroll'), { waitUntil: 'networkidle' });
    const bar = () => page.getByTestId('barra').evaluate((el) => { const { scale } = getComputedStyle(el); return scale === 'none' ? 1 : parseFloat(scale); });
    const first = await bar();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight / 2));
    await page.waitForTimeout(80);
    const middle = await bar();
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(80);
    return { first, middle, last: await bar() };
  };
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const whole = await scrolled(page);
  check('useScroll: progress de 0 a 1', whole.first === 0 && whole.middle > 0.2 && whole.middle < 0.8 && whole.last === 1, JSON.stringify(whole));
  await page.evaluate(() => window.scrollTo(0, 0));
  const boxed = await page.evaluate(async () => {
    const container = document.querySelector('[data-testid="contenedor"]');
    const target = document.querySelector('[data-testid="objetivo"]');
    const at = async (ratio) => {
      container.scrollTop = (container.scrollHeight - container.clientHeight) * ratio;
      await new Promise((resolve) => setTimeout(resolve, 80));
      return parseFloat(target.style.getPropertyValue('--paso'));
    };
    return { start: await at(0), middle: await at(0.5), end: await at(1), rotate: getComputedStyle(target).rotate };
  });
  check('useScroll con container y target', boxed.start === 0 && boxed.middle > 0.3 && boxed.middle < 0.7 && boxed.end === 1 && boxed.rotate === '20deg', JSON.stringify(boxed));
  await page.close();

  const reduced = await browser.newPage({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  const still = await scrolled(reduced);
  check('useScroll sigue con movimiento reducido', still.last === 1, JSON.stringify(still));
  await reduced.close();
}

async function motionDrag(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar--arrastre'), { waitUntil: 'networkidle' });
  const read = (id) => page.getByTestId(id).evaluate((el) => {
    const [x, y] = getComputedStyle(el).translate.split(' ');
    return { x: parseFloat(x) || 0, y: parseFloat(y) || 0 };
  });
  const box = await page.getByTestId('arrastre-x').boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx + 60, cy + 40, { steps: 6 });
  const moved = await read('arrastre-x');
  check('arrastra en x y no en y', moved.x === 60 && moved.y === 0, JSON.stringify(moved));
  await page.mouse.move(cx + 260, cy + 40, { steps: 6 });
  const stretched = await read('arrastre-x');
  check('más allá del límite cuesta, con goma', stretched.x > 100 && stretched.x < 260, String(stretched.x));
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(800);
  const settled = await read('arrastre-x');
  check('soltar fuera del límite vuelve con muelle', settled.x === 100, String(settled.x));

  const again = await page.getByTestId('arrastre-x').boundingBox();
  await page.mouse.move(again.x + 30, again.y + 30);
  await page.mouse.down();
  await page.mouse.move(again.x - 30, again.y + 30, { steps: 3 });
  await page.mouse.up();
  const speed = Number(await page.getByTestId('arrastre-velocidad').textContent());
  check('onDragEnd da la velocidad', speed < 0, String(speed));

  await page.goto(storyUrl('animar--pruebas'), { waitUntil: 'networkidle' });
  const valueBox = await page.getByTestId('valor-arrastre').boundingBox();
  await page.mouse.move(valueBox.x + 30, valueBox.y + 30);
  await page.mouse.down();
  await page.mouse.move(valueBox.x - 30, valueBox.y + 30, { steps: 4 });
  const opacityOf = () => page.getByTestId('valor-revelado').evaluate((el) => Number(getComputedStyle(el).opacity));
  const shown = await opacityOf();
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(500);
  const hiddenAgain = await opacityOf();
  check('drag con un valor de movimiento: lo enlazado sigue el gesto y la vuelta', Math.abs(shown - 0.6) < 0.02 && hiddenAgain === 0, `${shown} → ${hiddenAgain}`);
  await page.goto(storyUrl('animar--arrastre'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const limited = await page.getByTestId('arrastre-x').boundingBox();
  await page.mouse.move(limited.x + 30, limited.y + 30);
  await page.mouse.down();
  await page.mouse.move(limited.x + 400, limited.y + 30, { steps: 5 });
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(40);
  const running = await page.getByTestId('arrastre-x').boundingBox();
  await page.mouse.move(running.x + 30, running.y + 30);
  await page.mouse.down();
  await page.mouse.up();
  await page.waitForTimeout(700);
  const inside = await read('arrastre-x');
  check('tocar sin mover durante la vuelta no lo deja fuera de sus límites', inside.x === 100, String(inside.x));

  const fixedBox = await page.getByTestId('arrastre-fijo').boundingBox();
  await page.mouse.move(fixedBox.x + 30, fixedBox.y + 30);
  await page.mouse.down();
  await page.mouse.move(fixedBox.x + 130, fixedBox.y + 30, { steps: 4 });
  const pulled = await read('arrastre-fijo');
  await page.mouse.up();
  await page.waitForTimeout(700);
  const released = await read('arrastre-fijo');
  check('sin recorrido, tira con goma y vuelve', pulled.x > 5 && released.x === 0, `${pulled.x} → ${released.x}`);
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();

  const phone = await browser.newContext({ viewport: { width: 390, height: 800 }, hasTouch: true, isMobile: true });
  const touch = await phone.newPage();
  await touch.goto(storyUrl('animar--arrastre'), { waitUntil: 'networkidle' });
  const target = await touch.getByTestId('arrastre-x').boundingBox();
  const cdp = await phone.newCDPSession(touch);
  await flick(cdp, target.x + 30, target.y + 30, -200, { steps: 6, stepDelay: 16 });
  await touch.waitForTimeout(300);
  const scrolled = await touch.evaluate(() => window.scrollY);
  check('el scroll vertical sigue con drag="x" en táctil', scrolled > 0, String(scrolled));
  await phone.close();

  const reduced = await browser.newPage({ viewport: { width: 1000, height: 800 }, reducedMotion: 'reduce' });
  await reduced.goto(storyUrl('animar--arrastre'), { waitUntil: 'networkidle' });
  const still = await reduced.getByTestId('arrastre-x').boundingBox();
  await reduced.mouse.move(still.x + 30, still.y + 30);
  await reduced.mouse.down();
  await reduced.mouse.move(still.x + 230, still.y + 30, { steps: 4 });
  const followed = await reduced.getByTestId('arrastre-x').evaluate((el) => parseFloat(getComputedStyle(el).translate) || 0);
  await reduced.waitForTimeout(120);
  await reduced.mouse.up();
  await reduced.waitForTimeout(30);
  const direct = await reduced.getByTestId('arrastre-x').evaluate((el) => parseFloat(getComputedStyle(el).translate) || 0);
  check('sin movimiento: drag sigue a mano y al soltar va directo', followed > 100 && direct === 100, `${followed} → ${direct}`);
  await reduced.close();
}

async function motionLayout(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar--cambios-de-sitio'), { waitUntil: 'networkidle' });
  const result = await inPage(page, async (m, $, css, wait, frame) => {
    const uno = $('sitio-Uno');
    const before = uno.getBoundingClientRect().top;
    const dos = $('sitio-Dos');
    $('sitio-invertir').click();
    await frame();
    await frame();
    const early = uno.getBoundingClientRect().top;
    const xDuring = parseFloat(css(dos).translate);
    await wait(1100);
    return { before, early, end: uno.getBoundingClientRect().top, translate: css(uno).translate, x: css(dos).translate.split(' ')[0], xDuring };
  });
  check('layout: al reordenar llega sin saltar', Math.abs(result.early - result.before) < 40 && result.end > result.before + 100, JSON.stringify(result));
  check('layout: al llegar no deja translate', result.translate === 'none', result.translate);
  check('layout no pisa la x del usuario', result.x === '20px', result.x);
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();
}

async function exampleInbox(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar-ejemplos--bandeja'), { waitUntil: 'networkidle' });
  const rows = () => page.locator('[data-testid^="mensaje-"]').count();
  const box = await page.getByTestId('fila-a').boundingBox();
  const y = box.y + box.height / 2;

  await page.mouse.move(box.x + 60, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 20, y, { steps: 4 });
  await page.waitForTimeout(150);
  await page.mouse.up();
  await page.waitForTimeout(600);
  const back = await page.getByTestId('fila-a').evaluate((el) => getComputedStyle(el).translate);
  check('un gesto corto vuelve a su sitio y no archiva', (await rows()) === 4 && back === 'none', back);

  await page.mouse.move(box.x + 200, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 60, y, { steps: 6 });
  const revealed = await page.getByTestId('mensaje-a').locator('span.flex').first().evaluate((el) => Number(getComputedStyle(el).opacity));
  await page.waitForTimeout(120);
  await page.mouse.up();
  await page.waitForTimeout(800);
  check('lo de detrás aparece con el gesto', revealed === 1, String(revealed));
  check('deslizar archiva y la fila se va', (await rows()) === 3 && (await page.getByTestId('mensaje-a').count()) === 0);
  const below = await page.getByTestId('fila-b').boundingBox();
  check('las demás suben a ocupar su sitio', Math.abs(below.y - box.y) < 2, `${below.y} / ${box.y}`);

  await page.getByTestId('deshacer').click();
  await page.waitForTimeout(1600);
  const first = await page.locator('[data-testid^="mensaje-"]').first().getAttribute('data-testid');
  const restored = await page.getByTestId('fila-a').evaluate((el) => getComputedStyle(el).translate);
  check('deshacer la devuelve a su sitio, sin desplazar', first === 'mensaje-a' && (await rows()) === 4 && restored === 'none', `${first} ${restored}`);
  const height = await page.getByTestId('mensaje-a').evaluate((el) => el.style.height);
  check('al entrar restaura la altura automática', height === 'auto', height);

  for (const name of ['Laura Gómez', 'Contabilidad', 'Marcos Ruiz', 'Soporte']) await page.getByRole('button', { name: `Archivar el mensaje de ${name}` }).click();
  await page.waitForTimeout(1000);
  check('el botón archiva, y sin filas sale el estado vacío', (await rows()) === 0 && (await page.getByTestId('bandeja-vacia').count()) === 1, `${await rows()} filas`);
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();

  const phone = await browser.newContext({ viewport: { width: 375, height: 812 }, hasTouch: true, isMobile: true });
  const mobile = await phone.newPage();
  await mobile.goto(storyUrl('animar-ejemplos--bandeja'), { waitUntil: 'networkidle' });
  const row = await mobile.getByTestId('fila-b').boundingBox();
  const cdp = await phone.newCDPSession(mobile);
  const cy = row.y + row.height / 2;
  await touch(cdp, [[row.x + 200, cy], [row.x + 170, cy, 16], [row.x + 130, cy, 16], [row.x + 90, cy, 16], [row.x + 50, cy, 16]]);
  await mobile.waitForTimeout(900);
  check('en táctil también se archiva deslizando', (await mobile.getByTestId('mensaje-b').count()) === 0);
  await phone.close();
}

async function exampleCart(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar-ejemplos--cesta'), { waitUntil: 'networkidle' });
  const digits = async () => Number((await page.getByTestId('cesta-total').textContent()).replace(/\D/g, ''));
  const units = () => page.getByTestId('cesta-unidades').textContent();
  await page.getByTestId('anadir-plan').click();
  await page.getByTestId('anadir-plan').click();
  await page.getByTestId('anadir-soporte').click();
  const flying = await page.getByTestId('vuelo').count();
  const early = await units();
  check('cada pulsación lanza su vuelo', flying === 3, String(flying));
  check('la cesta no cambia hasta que llega', early === '0', early);
  await page.waitForTimeout(1500);
  check('al llegar cuenta las unidades y el total', (await units()) === '3' && (await digits()) === 600, `${await units()} / ${await digits()}`);
  check('no quedan vuelos en pantalla', (await page.getByTestId('vuelo').count()) === 0);
  check('sale cada línea', (await page.getByTestId('linea-plan').count()) === 1 && (await page.getByTestId('linea-soporte').count()) === 1);
  await page.getByTestId('menos-soporte').click();
  await page.waitForTimeout(900);
  check('quitar la última unidad se lleva la línea y baja el total', (await page.getByTestId('linea-soporte').count()) === 0 && (await digits()) === 480, String(await digits()));
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();
}

async function exampleWizard(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar-ejemplos--asistente'), { waitUntil: 'networkidle' });
  const step = () => page.getByTestId('asistente-paso').textContent();
  await page.getByTestId('asistente-seguir').click();
  await page.waitForTimeout(60);
  const shaking = await page.locator('[data-testid="asistente-empresa"]').evaluate((el) => {
    let node = el;
    while (node) { if (node.style?.translate && node.style.translate !== 'none') return true; node = node.parentElement; }
    return false;
  });
  check('seguir sin nombre no avanza, avisa y se nota', (await step()).startsWith('Paso 1') && shaking && (await page.getByText('Escribe el nombre de tu empresa.').count()) === 1);
  await page.waitForTimeout(400);
  await page.getByTestId('asistente-empresa').fill('Acme');
  await page.getByTestId('asistente-seguir').click();
  await page.waitForTimeout(2400);
  check('avanza al siguiente paso', (await step()).startsWith('Paso 2') && (await page.getByTestId('plan-total').count()) === 1, await step());
  const progress = await page.getByTestId('asistente-progreso').evaluate((el) => parseFloat(getComputedStyle(el).scale));
  check('la barra sigue al paso', Math.abs(progress - 2 / 3) < 0.01, String(progress));
  const panel = await page.getByTestId('plan-total').evaluate((el) => {
    const outer = el.closest('.overflow-hidden');
    return { outer: outer.getBoundingClientRect().height, inner: outer.firstElementChild.getBoundingClientRect().height };
  });
  check('el panel se adapta a la altura del paso', Math.abs(panel.outer - panel.inner) < 1, JSON.stringify(panel));
  await page.getByTestId('plan-total').click();
  await page.getByTestId('asistente-atras').click();
  await page.waitForTimeout(800);
  check('volver atrás conserva lo escrito', (await step()).startsWith('Paso 1') && (await page.getByTestId('asistente-empresa').inputValue()) === 'Acme');
  await page.getByTestId('asistente-seguir').click();
  await page.waitForTimeout(800);
  await page.getByTestId('asistente-seguir').click();
  await page.waitForTimeout(800);
  await page.getByTestId('asistente-seguir').click();
  await page.waitForTimeout(2200);
  const drawn = await page.getByTestId('hecho').locator('path').evaluate((el) => getComputedStyle(el).strokeDasharray);
  check('al terminar se dibuja la marca', parseFloat(drawn) > 0.99 && (await page.getByText('Todo listo, Acme').count()) === 1, drawn);
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();
}

async function exampleReport(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar-ejemplos--informe'), { waitUntil: 'networkidle' });
  const header = () => page.getByTestId('informe-cabecera').evaluate((el) => el.getBoundingClientRect().height);
  const scrollTo = async (top) => { await page.getByTestId('informe').evaluate((el, value) => { el.scrollTop = value; }, top); await page.waitForTimeout(100); };
  const tall = await header();
  const start = await page.getByTestId('informe-ingresos').textContent();
  await scrollTo(200);
  const short = await header();
  const scrollTop = await page.getByTestId('informe').evaluate((el) => el.scrollTop);
  check('la cabecera se encoge con el scroll, sin que el navegador lo corrija', tall === 150 && short === 64 && scrollTop === 200, `${tall} → ${short}, scroll ${scrollTop}`);
  check('la cifra aún no ha contado antes de verse', start.replace(/\D/g, '') === '0', start);
  await page.getByTestId('informe-ingresos').scrollIntoViewIfNeeded();
  await page.waitForTimeout(1700);
  const counted = (await page.getByTestId('informe-ingresos').textContent()).replace(/\D/g, '');
  check('al verse, la cifra cuenta hasta su valor', counted === '361000', counted);
  const before = await page.getByTestId('barra-5').evaluate((el) => getComputedStyle(el).scale);
  await page.getByTestId('informe').evaluate((el) => { el.scrollTop = el.scrollHeight; });
  await page.waitForTimeout(1900);
  const after = await page.getByTestId('barra-5').evaluate((el) => getComputedStyle(el).scale);
  const bar = await page.getByTestId('informe-progreso').evaluate((el) => getComputedStyle(el).scale);
  check('las barras crecen al llegar', before.startsWith('0') && after === 'none', `${before} → ${after}`);
  check('la barra de progreso llega al final', bar === 'none', bar);
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();
}

async function examplePointer(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar-ejemplos--puntero'), { waitUntil: 'networkidle' });
  const scale = (id) => page.getByTestId(id).evaluate((el) => { const value = getComputedStyle(el).scale; return value === 'none' ? 1 : parseFloat(value); });
  const icon = await page.getByTestId('dock-Agenda').boundingBox();
  await page.mouse.move(icon.x + icon.width / 2, icon.y + icon.height / 2);
  await page.waitForTimeout(400);
  const near = await scale('dock-Agenda');
  const far = await scale('dock-Ajustes');
  check('el icono bajo el puntero crece y el lejano no', near > 1.45 && far === 1, `${near} / ${far}`);
  await page.mouse.move(icon.x, 800);
  await page.waitForTimeout(500);
  check('al salir vuelven todos', (await scale('dock-Agenda')) === 1, String(await scale('dock-Agenda')));
  const light = await page.getByTestId('foco').boundingBox();
  await page.mouse.move(light.x + 30, light.y + 20);
  await page.waitForTimeout(400);
  const lit = await page.getByTestId('foco').evaluate((el) => ({ opacity: Number(getComputedStyle(el).opacity), background: el.style.background }));
  check('el foco aparece y sigue al puntero', lit.opacity > 0.9 && /at 3\dpx 2\dpx/.test(lit.background), JSON.stringify(lit));
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();
}

async function exampleModes(browser, { check }) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 1400 } });
  const errors = collectErrors(page);
  await page.goto(storyUrl('animar-ejemplos--comparar'), { waitUntil: 'networkidle' });
  await page.waitForTimeout(1600);
  const peaks = await page.evaluate(async () => {
    const ids = ['sober', 'smooth', 'expressive', 'playful'];
    const balls = ids.map((id) => document.querySelector(`[data-testid="bola-${id}"]`));
    const max = ids.map(() => 0);
    document.querySelector('[data-testid="comparar-otra"]').click();
    await new Promise((resolve) => setTimeout(resolve, 1500));
    document.querySelector('[data-testid="comparar-otra"]').click();
    const begin = performance.now();
    while (performance.now() - begin < 1400) {
      balls.forEach((el, i) => { max[i] = Math.max(max[i], parseFloat(getComputedStyle(el).translate) || 0); });
      await new Promise(requestAnimationFrame);
    }
    return max;
  });
  check('comparar: cada modo se pasa más que el anterior', peaks[0] <= 200.5 && peaks[1] > peaks[0] && peaks[2] > peaks[1] + 5 && peaks[3] > peaks[2] + 5, peaks.map(Math.round).join(' / '));

  const stepPeak = async (name) => {
    await page.goto(storyUrl('animar-ejemplos--asistente'), { waitUntil: 'networkidle' });
    await page.getByText(name, { exact: true }).click();
    await page.getByTestId('asistente-empresa').fill('Acme');
    return page.evaluate(async () => {
      document.querySelector('[data-testid="asistente-seguir"]').click();
      let max = 0;
      const begin = performance.now();
      while (performance.now() - begin < 1800) {
        const el = document.querySelector('[data-testid="asistente-contenido"]');
        if (el && document.querySelector('[data-testid="plan-total"]')) {
          const { scale } = getComputedStyle(el);
          max = Math.max(max, scale === 'none' ? 1 : parseFloat(scale));
        }
        await new Promise(requestAnimationFrame);
      }
      return max;
    });
  };
  const sober = await stepPeak('Sobrio');
  const playful = await stepPeak('Juguetón');
  check('el modo elegido cambia el ejemplo', sober <= 1.001 && playful > 1.02, `${sober} / ${playful}`);

  const kick = async (name) => {
    await page.goto(storyUrl('animar-ejemplos--cesta'), { waitUntil: 'networkidle' });
    await page.getByText(name, { exact: true }).click();
    await page.getByTestId('anadir-plan').click();
    return page.evaluate(async () => {
      const el = document.querySelector('[data-testid="cesta"]');
      let min = 0;
      let positives = 0;
      const begin = performance.now();
      while (performance.now() - begin < 2200) {
        const y = parseFloat(getComputedStyle(el).translate.split(' ')[1]) || 0;
        min = Math.min(min, y);
        if (y > 0.5) positives += 1;
        await new Promise(requestAnimationFrame);
      }
      return { min, positives };
    });
  };
  const calm = await kick('Sobrio');
  const lively = await kick('Juguetón');
  check('la cesta acusa la llegada según el modo', calm.min < -3 && calm.positives === 0 && lively.positives > 0, `${JSON.stringify(calm)} / ${JSON.stringify(lively)}`);
  check('sin errores de página', errors.length === 0, errors.join(' | '));
  await page.close();
}

const SECTIONS = [exampleModes, animateFunction, withoutMotion, motionStates, motionVariants, motionPresets, motionTheme, motionMany, presence, motionValues, motionScroll, motionDrag, motionLayout, exampleInbox, exampleCart, exampleWizard, exampleReport, examplePointer];

run(async ({ browser, check }) => {
  for (const section of SECTIONS) {
    console.log(`\n${section.name}`);
    await section(browser, { check });
  }
});

