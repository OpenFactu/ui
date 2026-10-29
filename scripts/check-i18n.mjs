/**
 * Falla si un componente pinta un texto visible escrito a mano en vez de sacarlo del catálogo de traducciones
 * (`src/i18n/catalog`). Así cualquier texto de la interfaz se puede traducir o cambiar.
 *
 *   node scripts/check-i18n.mjs          # lista lo que queda
 *   node scripts/check-i18n.mjs --count  # solo el recuento por archivo
 *
 * Mira, con el analizador de TypeScript:
 *   - texto JSX (`<p>Cargando</p>`);
 *   - textos en atributos visibles o accesibles (`aria-label`, `title`, `placeholder`, `alt`, `*Label`, `*Message`…);
 *   - valores por defecto de props con esos nombres (`emptyMessage = 'Sin datos'`);
 *   - textos sueltos dentro de una expresión JSX (`{abierto ? 'Cerrar' : 'Abrir'}`);
 *   - propiedades `label`/`title`/`description`/`placeholder`/`message` de objetos (`{ label: 'Cómoda' }`).
 * Ignora mensajes de consola y errores para quien desarrolla, y una línea con `// i18n-ignore`.
 */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const NOMBRE_VISIBLE = /(^(aria-label|aria-roledescription|aria-valuetext|aria-description|title|placeholder|alt|label|description|message|text|hint|heading|caption|tooltip|empty)$)|(Label|Message|Text|Title|Placeholder|Hint|Description)$/;
const PROP_OBJETO = /^(label|title|description|placeholder|message|hint|text|name|heading|caption|empty)$/;
/** Ficheros cuyo contenido son nombres propios o datos, no textos de interfaz. */
const PERMITIDOS = [/^src\/i18n\//, /^src\/icons\//, /^src\/theme\//, /^src\/charts\/palette\.ts$/, /^src\/components\/code-editor\/(languages|themes)\.ts$/, /^src\/motion\/presets\.ts$/];

/** ¿Parece un texto para personas? Letras, y además mayúscula inicial, un espacio, una tilde o puntuación española. */
const pareceTexto = (s) => {
  const t = s.trim();
  if (t.length < 2 || !/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2}/.test(t)) return false;
  if (/^(https?:|mailto:|data:|#|\.|\/)/.test(t)) return false;
  if (/^[a-z0-9]+([-_:][a-z0-9]+)*$/.test(t)) return false; // ids, claves, tokens
  const tokens = t.split(/\s+/);
  if (tokens.some((k) => /[-:[]/.test(k)) && tokens.every((k) => /^[a-z0-9!:\-[\]()/.%#,_]+$/.test(k))) return false; // clases
  return /[ÁÉÍÓÚÜÑáéíóúüñ¿¡…«»]/.test(t) || /\s/.test(t) || /^[A-ZÁÉÍÓÚ][a-záéíóúñ]/.test(t);
};

const hallazgos = [];

function dentroDe(node, test) {
  for (let p = node.parent; p; p = p.parent) if (test(p)) return p;
  return undefined;
}
const esLlamadaExcluida = (n) => ts.isCallExpression(n) && /^(console\.\w+|require)$/.test(n.expression.getText());
const esErrorDev = (n) => ts.isNewExpression(n) && /Error$/.test(n.expression.getText());
const esClase = (n) => (ts.isJsxAttribute(n) && /^(className|class|key|role|type|id|name|href|src|htmlFor|data-[\w-]+|style|slot|lang|dir|inputMode|autoComplete|rel|target|method|accept|pattern|variant|size|tone|align|side|sizes|loading|decoding|draggable)$/.test(n.name.getText()))
  || (ts.isCallExpression(n) && /^(cn|clsx|cx|classNames)$/.test(n.expression.getText()));

function informar(sf, node, texto, por) {
  const { line } = sf.getLineAndCharacterOfPosition(node.getStart(sf));
  const linea = sf.text.split('\n')[line] ?? '';
  if (linea.includes('i18n-ignore')) return;
  hallazgos.push({ file: sf.fileName, line: line + 1, texto: texto.trim().replace(/\s+/g, ' ').slice(0, 70), por });
}

function textoDe(node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  if (ts.isTemplateExpression(node)) return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' ');
  return undefined;
}

function revisar(sf) {
  const visitar = (node) => {
    if (ts.isJsxText(node)) {
      if (/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}/.test(node.text)) informar(sf, node, node.text, 'texto JSX');
    } else {
      const texto = textoDe(node);
      // En atributos accesibles cualquier palabra cuenta («carrusel» en `aria-roledescription`).
      const accesible = (n) => ts.isJsxAttribute(n.parent) && /^(aria-[\w-]+|title|placeholder|alt)$/.test(n.parent.name.getText()) && /[A-Za-zÁÉÍÓÚáéíóúñ]{2}/.test(textoDe(n) ?? '');
      if (texto !== undefined && (pareceTexto(texto) || accesible(node)) && !dentroDe(node, (p) => esLlamadaExcluida(p) || esErrorDev(p) || esClase(p) || ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || (ts.isElementAccessExpression(p) && p.argumentExpression !== undefined))) {
        const p = node.parent;
        // Dónde acaba el texto: se sube por ternarios, `&&`/`??`, paréntesis y plantillas hasta su contenedor real.
        let x = node;
        while (x.parent && (ts.isConditionalExpression(x.parent) || ts.isBinaryExpression(x.parent) || ts.isParenthesizedExpression(x.parent) || ts.isTemplateSpan(x.parent) || ts.isTemplateExpression(x.parent))) x = x.parent;
        const cont = x.parent;
        const attr = ts.isJsxAttribute(cont) ? cont : ts.isJsxExpression(cont) && ts.isJsxAttribute(cont.parent) ? cont.parent : undefined;
        if (attr) {
          // El valor de un atributo: cuenta si es visible o accesible (no `className`, `key`…).
          if (NOMBRE_VISIBLE.test(attr.name.getText())) informar(sf, node, texto, `atributo ${attr.name.getText()}`);
        } else if (ts.isJsxExpression(cont)) {
          // Un texto suelto dentro de `{…}` entre etiquetas: lo que acaba pintado.
          informar(sf, node, texto, 'texto en JSX');
        } else if (ts.isBindingElement(p) && p.initializer === node && NOMBRE_VISIBLE.test(p.name.getText())) informar(sf, node, texto, `por defecto de ${p.name.getText()}`);
        else if (ts.isParameter(p) && p.initializer === node && NOMBRE_VISIBLE.test(p.name.getText())) informar(sf, node, texto, `por defecto de ${p.name.getText()}`);
        else if (ts.isPropertyAssignment(p) && p.initializer === node && PROP_OBJETO.test(p.name.getText())) informar(sf, node, texto, `propiedad ${p.name.getText()}`);
        else if (ts.isVariableDeclaration(p) && /LABEL|TEXT|MESSAGE|COPY|NAMES/i.test(p.name.getText())) informar(sf, node, texto, `constante ${p.name.getText()}`);
        else if (ts.isPropertyAssignment(p) && p.initializer === node && dentroDe(node, (x) => ts.isVariableDeclaration(x) && /LABEL|TEXT|MESSAGE|NAMES|COPY/i.test(x.name.getText()))) informar(sf, node, texto, 'mapa de textos');
        else if (ts.isArrayLiteralExpression(p) && dentroDe(node, (x) => ts.isVariableDeclaration(x) && /LABEL|MESES|DIAS|MONTH|WEEKDAY|DAYS|NAMES/i.test(x.name.getText()))) informar(sf, node, texto, 'lista de textos');
        else if ((ts.isConditionalExpression(p) || ts.isBinaryExpression(p) || ts.isReturnStatement(p) || ts.isArrowFunction(p)) && /[ÁÉÍÓÚÜÑáéíóúüñ¿¡…«»]|\b(de|del|la|el|los|las|sin|con|para|por|más|hoy|ayer)\b/i.test(texto)) informar(sf, node, texto, 'texto calculado');
        else if (ts.isTemplateSpan(p) || ts.isTemplateExpression(p)) { /* el padre ya se informa */ }
      }
    }
    ts.forEachChild(node, visitar);
  };
  visitar(sf);
}

function recorrer(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) { recorrer(full); continue; }
    if (!/\.tsx?$/.test(e.name) || /\.d\.ts$/.test(e.name)) continue;
    const rel = full.replace(/\\/g, '/');
    if (PERMITIDOS.some((re) => re.test(rel))) continue;
    const sf = ts.createSourceFile(rel, fs.readFileSync(full, 'utf8'), ts.ScriptTarget.Latest, true, rel.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    revisar(sf);
  }
}

recorrer('src');

if (process.argv.includes('--count')) {
  const por = new Map();
  for (const h of hallazgos) por.set(h.file, (por.get(h.file) ?? 0) + 1);
  for (const [f, n] of [...por].sort((a, b) => b[1] - a[1])) console.log(String(n).padStart(4), f);
  console.log(`\n${hallazgos.length} textos en ${por.size} archivos.`);
  process.exit(hallazgos.length ? 1 : 0);
}
if (hallazgos.length) {
  for (const h of hallazgos) console.log(`${h.file}:${h.line}  ${h.por}: «${h.texto}»`);
  console.log(`\n${hallazgos.length} textos visibles sin pasar por el catálogo (src/i18n/catalog). Añádelos allí y léelos con useMessages/useI18n.`);
  process.exit(1);
}
console.log('Ningún texto visible escrito a mano en src/: todo pasa por el catálogo de traducciones.');
