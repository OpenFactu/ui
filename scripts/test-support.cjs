// Load the actual TypeScript sources using the compiler already in devDependencies.
const fs = require('node:fs');
const ts = require('typescript');
for (const extension of ['.ts', '.tsx']) {
  require.extensions[extension] = (module, filename) => {
    const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
      fileName: filename,
    });
    module._compile(output.outputText, filename);
  };
}

/** HTML de servidor de un elemento (`render(Componente, props, ...hijos)`). React se carga solo si se usa. */
function render(type, props, ...children) {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  return renderToStaticMarkup(React.createElement(type, props, ...children));
}

/** Igualdad aproximada para números de coma flotante. */
function near(actual, expected, eps = 1e-6, label = '') {
  const assert = require('node:assert/strict');
  assert.ok(Math.abs(actual - expected) <= eps, `${label ? `${label}: ` : ''}${actual} ≠ ${expected} (±${eps})`);
}

module.exports = { render, near };
