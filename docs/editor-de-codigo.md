# Editor de código

`CodeEditor`: resaltado propio sobre un `textarea` nativo.

## Editor de código

`CodeEditor` edita un documento con resaltado léxico propio: no descarga
gramáticas, fuentes ni motores de terceros. Usa React y un `textarea` nativo.
Importa `@openfactu/ui/styles.css`, como para el resto de la librería.

```tsx
import { CodeEditor, type CodeEditorThemeValue } from '@openfactu/ui';

const [code, setCode] = useState('const total = 120;');
const [editorTheme, setEditorTheme] = useState<CodeEditorThemeValue>('auto');

<CodeEditor
  label="Código"
  value={code}
  onChange={setCode}
  language="typescript"
  theme={editorTheme}
  onThemeChange={setEditorTheme}
  height={320}
  tabSize={2}
/>
```

El contenido es controlado (`value` / `onChange`). También admite `ref` al
`textarea`, `readOnly`, `disabled`, `required`, `placeholder`, `helperText`,
`error` y atributos accesibles nativos. Un cambio externo de `value` reinicia
el historial; devolver el valor recibido en `onChange` lo conserva.
El historial mantiene hasta 100 entradas con un límite de memoria aproximado.

Incluye `javascript`, `typescript`, `html`, `css`, `json`, `sql`, `yaml` y
`plaintext`. Un identificador desconocido usa texto plano. El resaltado es
léxico: no valida sintaxis, tipos ni código incrustado de otros lenguajes.

| Atajo | Acción |
|---|---|
| Tab / Mayús+Tab | Sangrar / quitar sangría, también en bloques |
| Intro | Mantener sangría; añadir nivel después de una apertura |
| Ctrl+Espacio | Sugerencias de palabras clave y del documento |
| ↑ / ↓, Intro o Tab | Elegir y aceptar una sugerencia |
| Ctrl/Cmd+Z / Ctrl/Cmd+Mayús+Z | Deshacer / rehacer |
| Ctrl/Cmd+F o Ctrl/Cmd+H | Buscar y reemplazar texto literal |
| Esc | Cerrar sugerencias/búsqueda; después liberar Tab para salir |

También hay botones para buscar, deshacer y rehacer. Se permite redimensionar
verticalmente y desplazar horizontalmente; las líneas no se ajustan.
En documentos largos, el resaltado y los números se dibujan solo para las líneas
visibles; el texto completo sigue disponible para editar, buscar y copiar.

### Temas del editor

`auto` sigue los tokens de la aplicación. Además de `light`, `dark` y
`high-contrast`, incluye `monokai`, `dracula`, `nord`, `one-dark`,
`github-light`, `solarized-light` y `solarized-dark`.
Cambiar el tema del editor no modifica el de la app ni
el de otros editores, y conserva contenido, selección, posición e historial.

Con `defaultTheme="dark"` el editor gestiona internamente su tema. Para
controlarlo desde la aplicación, usa `theme` y `onThemeChange`. El selector
está visible por defecto; `showThemeSelector={false}` lo oculta.

Para mostrar solo el área de código, usa `minimal`. Oculta las herramientas,
el selector de temas, los números y la barra de estado; mantiene la edición,
el autocompletado (incluido `getCompletions`) y los atajos. `label`,
`helperText` y `error` siguen siendo opcionales.

```tsx
<CodeEditor value={code} onChange={setCode} theme="monokai" minimal />
```

### Movimiento opcional

`motion` activa un cursor que acompaña los cambios de posición, una transición
corta de la línea activa y una selección de texto animada. También funciona
en modo `minimal`:

```tsx
<CodeEditor value={code} onChange={setCode} theme="monokai" minimal motion />
```

Está desactivado por defecto. Las transiciones duran 100 ms y se pueden
interrumpir con la siguiente acción. El arrastre y el desplazamiento del
documento siguen directamente al ratón, sin retraso añadido.
Al escribir, borrar o pegar, el cursor se coloca al instante; solo se anima
al navegar por el texto. La composición
de texto, el movimiento reducido y los colores forzados conservan el cursor y
la selección nativos. La escritura, los atajos y el historial siguen siendo
los del mismo editor.

Un tema personalizado hereda una base y sobreescribe solo los colores necesarios:

```tsx
<CodeEditor
  label="Configuración"
  value={code}
  onChange={setCode}
  defaultTheme={{
    label: 'Bosque',
    base: 'dark',
    colors: { background: '#10251c', keyword: '#bef264', foreground: '#f0fdf4' },
  }}
/>
```

`CodeEditorColors` permite ajustar `background`, `foreground`, `muted`,
`border`, `selection`, `selectionForeground`, `cursor`, `activeLine`,
`keyword`, `string`, `number`, `comment`, `operator`, `punctuation`, `tag`
y `attribute`. Los presets se exportan como `CODE_EDITOR_THEMES`. Las
paletas incluidas tienen contraste AA; quien personaliza colores controla
el contraste de su paleta.

Las paletas se adaptan de [Monokai en VS Code](https://github.com/microsoft/vscode/blob/main/extensions/theme-monokai/themes/monokai-color-theme.json),
[Dracula](https://github.com/dracula/draculatheme.com/blob/main/content/spec.mdx),
[Nord](https://www.nordtheme.com/docs/colors-and-palettes/),
[One Dark](https://github.com/atom/one-dark-syntax/blob/master/styles/colors.less),
[GitHub](https://github.com/primer/github-vscode-theme) y
[Solarized](https://ethanschoonover.com/solarized/), ajustando algunos tonos
para que el texto pequeño siga siendo legible, también en la línea activa.

### Lenguajes y sugerencias personalizados

```tsx
const formula: CodeLanguageDefinition = {
  id: 'formula',
  label: 'Fórmula',
  keywords: ['SUMA', 'IVA'],
  pairs: { '(': ')' },
  indentAfter: ['('],
  tokenize: text => [...text.matchAll(/\b(SUMA|IVA)\b/g)].map(match => ({
    start: match.index!, end: match.index! + match[0].length, type: 'keyword',
  })),
};

<CodeEditor
  value={code}
  onChange={setCode}
  aria-label="Fórmula"
  language="formula"
  languages={[formula]}
  getCompletions={({ prefix }) => prefix.startsWith('SU')
    ? [{ label: 'SUMA', insertText: 'SUMA()', detail: 'Función' }]
    : []}
/>
```

Importa `CodeLanguageDefinition` desde la entrada principal. También puedes
pasar la definición directamente en `language`. Los rangos del tokenizador
usan posiciones UTF-16, con final exclusivo, ordenadas y sin solaparse; los
huecos se muestran como texto normal. Si el tokenizador falla o devuelve
rangos inválidos, el documento sigue siendo editable como texto plano.
`CODE_LANGUAGES` exporta las definiciones incluidas. `getCompletions` es una
función local y síncrona; sus sugerencias prevalecen sobre las automáticas
cuando comparten etiqueta.

No incluye gestión de archivos, ejecución, terminal ni análisis semántico.
Las pruebas de navegador aceptan `LADLE_URL` y `CHROME_PATH` si el playground
o Chrome están en otra ubicación. Reinicia Ladle si estaba abierto antes de
añadir las stories del editor.
