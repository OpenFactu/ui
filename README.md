# @openfactu/ui

Librería de componentes React del sistema de diseño Keirost.

```bash
npm install @openfactu/ui
```

## Puesta en marcha

La librería ya no depende de que la aplicación defina sus tokens: los publica ella.
Son dos líneas, una en el CSS y otra en la configuración de Tailwind.

```css
/* index.css — antes de las directivas @tailwind */
@import '@openfactu/ui/styles.css';
```

```js
// tailwind.config.js
import uiPreset from '@openfactu/ui/tailwind-preset';

export default {
  presets: [uiPreset],
  content: [
    './src/**/*.{ts,tsx}',
    './node_modules/@openfactu/ui/dist/**/*.{js,jsx}', // para que el JIT vea las clases del paquete
  ],
  plugins: [animated], // tailwindcss-animated, si usas las clases animate-in
};
```

`@openfactu/ui/styles.css` equivale a `tokens.css` (las variables) más
`keyframes.css` (las animaciones que los componentes referencian por nombre).
Si solo necesitas las variables, importa `@openfactu/ui/tokens.css`.

## Documentación

| Área | Qué hay |
| --- | --- |
| [Temas](docs/temas.md) | Tema, presets, material, densidad y colores |
| [Componentes](docs/componentes.md) | Catálogo, personalización, avatares, controles, iconos y avisos |
| [Movimiento](docs/movimiento.md) | Muelles, gestos táctiles, efectos de texto y microinteracciones |
| [Planificación](docs/planificacion.md) | Gantt, Kanban y calendario |
| [Pantallas de ERP](docs/erp.md) | Tablas, formularios, documentos y operaciones |
| [Chat](docs/chat.md) | Mensajería entre personas |
| [IA](docs/ia.md) | Respuesta, herramientas, preguntas y elementos del agente |
| [Editor de código](docs/editor-de-codigo.md) | `CodeEditor` |
| [Gráficos y QR](docs/graficos.md) | Las entradas opcionales `./charts` y `./qr` |
| [Traducciones](docs/traducciones.md) | Catálogo e idiomas |
| [Móvil](docs/mobile.md) | Cómo se adapta cada familia |
| [Derecha a izquierda](docs/rtl.md) | Árabe y hebreo |

Los cambios de cada versión están en [CHANGELOG.md](CHANGELOG.md). Para ver los componentes en vivo, `npm run dev`.

## Desarrollo

```bash
npm run dev        # playground (Ladle) en http://localhost:61000
npm run build      # compila a dist/
npm run typecheck  # comprueba también las stories
npm test           # edición, lenguajes, temas y contraste automático
npm run test:browser # regresiones reales; requiere Ladle en marcha y Chrome
npm run test:design # estilos, variantes y navegación de AppShell (con Ladle abierto)
npm run shots -- .shots/base   # capturas de todas las stories, claro y oscuro
npx tsx scripts/check-contrast.mts        # contraste real de los textos bajo un tema
npx tsx scripts/check-tokens.mjs          # el CSS publicado y el motor TS coinciden
```

Las stories viven en `stories/`, una por componente. `scripts/shots.mjs`
captura todas en ambos modos y compara dos carpetas
(`node scripts/shots.mjs --diff .shots/base .shots/nuevo`), que es la red de
seguridad para cambios transversales. `scripts/check-tokens.mjs` comprueba que
el CSS publicado y el motor de temas en TypeScript producen los mismos valores,
y `scripts/check-contrast.mts` mide el contraste real de cada texto bajo el tema
que se le indique (compone las capas translúcidas y congela las transiciones,
para no medir colores a mitad de camino).

## Convenciones

La librería se adapta automáticamente a móvil: navegación inferior, paneles, controles táctiles y tablas en tarjetas. Consulta [la guía móvil](docs/mobile.md) para configurar las presentaciones y conservar una tabla desplazable.

- **Clases Tailwind literales**: nunca construidas por concatenación
  (`bg-${variante}` no funciona con el JIT del consumidor). Se usan mapas de
  cadenas completas.
- **Variables con valor de reserva**: `bg-[var(--bg-card,#ffffff)]`, para que un
  consumidor que no importe la hoja de estilos siga viendo la marca por defecto.
- La escala `--k-ink-*` / `--k-line*` / `--k-surface` es una **paleta fija**; lo
  que responde al modo claro/oscuro es la capa semántica (`--bg-*`, `--fg-*`,
  `--border-*`). Los componentes deben apuntar a esta última.
