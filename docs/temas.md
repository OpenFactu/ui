# Temas

El tema, sus presets y plugins, y cómo elegir colores.

## Temas

Un tema son, en lo esencial, **dos colores y un modo**; el resto se deriva
(hover, colores de texto contrastados, superficies del modo oscuro, escala del
acento). Todo lo derivado se puede sobreescribir.

```tsx
import { applyTheme } from '@openfactu/ui';

applyTheme({
  mode: 'dark',
  colors: { primary: '#1E102C', accent: '#EC4899' },
});
```

`applyTheme` escribe las variables sobre `<html>` y alterna la clase `dark`.
Acepta un segundo argumento para tematizar solo un subárbol, útil para
previsualizar un tema dentro de la propia interfaz.

También hay un provider opcional, para manejar el tema con estado de React:

```tsx
<ThemeProvider defaultTheme={{ mode: 'light', colors: { primary: '#0A1628', accent: '#0D9488' } }}>
  <App />
</ThemeProvider>
```

Los componentes **nunca** leen ese contexto: consumen variables CSS, así que
montar el provider es opcional y no es un requisito para usar la librería.

### Evitar el parpadeo inicial

`resolveTheme` es una función pura, de modo que el tema se puede precalcular y
aplicar antes de que arranque React:

```ts
import { resolveTheme, themeToCssText } from '@openfactu/ui';

const css = themeToCssText(resolveTheme(temaDelTenant)); // string de :root { … }
```

Un tema no son solo colores: también define la **redondez** y la tipografía, y
todos los componentes las siguen.

```tsx
applyTheme({
  mode: 'light',
  colors: { primary: '#0A1628', accent: '#0D9488' },
  radius: 'lg',                          // 'none' | 'sm' | 'md' | 'lg', o { xs, sm, md, lg }
  typography: { fontFamily: 'geist' },   // id de FONT_OPTIONS
});
```

### Presets y plugins

`THEME_PRESETS` trae dieciséis temas de fábrica, pero el catálogo es **abierto**: un
plugin puede aportar los suyos en tiempo de ejecución.

```ts
import { registerThemePreset, registerTokens } from '@openfactu/ui';

// Al activar el plugin
const baja = registerThemePreset({
  id: 'acme-corporativo',
  label: 'Acme corporativo',
  description: 'Azul de marca sobre fondo claro.',
  theme: { mode: 'light', colors: { primary: '#1e3a8a', accent: '#2563eb' } },
}, { source: 'plugin-acme' });

registerTokens('plugin-acme', { '--acme-ancho-panel': '280px' });

baja();                        // al desactivarlo
unregisterThemeSource('plugin-acme');   // o de golpe, todo lo suyo
```

El registro **comprueba el tema antes de aceptarlo**: un color mal formado lo
rechaza, y si el contraste no llega al mínimo avisa por consola diciendo qué
combinación falla. `validateTheme(theme)` devuelve ese mismo informe si
prefieres enseñarlo en tu interfaz.

En React, `useThemePresets()` devuelve el catálogo y se repinta solo cuando
entra o sale un tema. `detectPreset(theme)` dice cuál está activo (o `null` si
es a medida).

### Material, fondo, densidad, movimiento y texto

Además de colores, radio y tipografía, un tema puede cambiar cómo se *sienten*
las superficies y cuánto espacio y movimiento hay. Con los valores de fábrica no
cambia nada; cada eje es opcional.

```ts
registerThemePreset({
  id: 'cristal', label: 'Cristal', description: 'Translúcido sobre una aurora.',
  theme: {
    mode: 'dark',
    colors: { primary: '#0d0a24', accent: '#8b7bff' },
    radius: 'lg',
    material: { blur: 22, alpha: 0.58, saturate: 1.5,          // superficies de cristal
                border: 'rgb(255 255 255 / .16)', highlight: 'inset 0 1px 0 rgb(255 255 255 / .14)' },
    backdrop: 'radial-gradient(60% 55% at 12% 8%, #4c2fb8, transparent 70%), #0d0a24', // lo que se difumina
    density: 'compact',                                         // 'compact' | 'normal' | 'comfortable' | número
    motion: { speed: 'fast', easing: 'cubic-bezier(.23, 1, .32, 1)' }, // 'none' | 'fast' | 'normal' | 'slow' | número
    typography: { scale: 1.05 },                                // escala del texto
  },
});
```

- **Cristal**: con `blur > 0` o `alpha < 1`, `applyTheme` pone `data-k-material` y las
  paneles (tarjetas, diálogos, hojas, cajones, avisos, el espacio de trabajo y el compositor
  de IA) se vuelven translúcidos y difuminan el fondo. Lo de dentro se funde con ellos,
  salvo los controles: campos, botones y grupos de opciones conservan su fondo (marca
  `data-k-solid` en lo que pinte tu propio control). Menús y listas desplegables se quedan
  opacos, con su borde y su sombra, para separarse del panel que tapan. Un `backdrop` activa
  `data-k-backdrop`. Para tematizar un subárbol: `<div style={themeToStyle(t)} {...themeToAttrs(t)}>`.
  Con `prefers-reduced-transparency` o colores forzados las superficies vuelven a ser opacas.
- **Densidad, movimiento y texto** actúan a través del preset de Tailwind: el espaciado
  (`p-4`, `gap-2`, `h-9`…), las duraciones (`duration-200`) y los tamaños con nombre
  (`text-sm`) se multiplican por `--k-density`, `--k-motion` y `--k-text-scale`. Los
  valores arbitrarios (`px-[10px]`, `text-[12px]`) no se escalan.
- **Fundido al cambiar de tema**: `applyTheme(tema, undefined, { transition: true })` (o un número de ms) anima colores,
  bordes y sombras durante el cambio. Respeta `prefers-reduced-motion` y `motion.speed`.
- **Sombras**: `shadows: { sm, md, lg, xl, overlay }`. Las utilidades `shadow-*` del preset de Tailwind leen
  estos tokens (con los valores de fábrica son las mismas de Tailwind), así que un tema de sombras duras
  alcanza también a diálogos, paneles y menús.
- **Bordes, foco y selección**: `border: { width }` cambia el grosor de `border` y `divide-*`
  (vía el preset); `focus: { width, offset, color, style }` unifica el anillo de foco de teclado
  y `selection: { background, color }` colorea la selección de texto. Si el tema no define
  `focus` o `selection`, cada componente conserva el suyo.
- **Fondo en movimiento**: `backdropMotion: 'drift'` desplaza despacio el `backdrop` (solo
  `transform`, sin repintar). Se corta con `prefers-reduced-motion` y con `motion.speed: 'none'`.
- **Exportar e importar**: `themeToJson(tema)`, `themeFromJson(texto)` (solo datos, con los avisos de
  `validateTheme`) y `themeToPresetSource({ id, label }, tema)`, que genera el
  `registerThemePreset(…)` listo para pegar. La story `ThemeEditor → Editor` los usa para ajustar
  cada eje en vivo.
- `validateTheme` avisa de un cristal sin fondo o de texto ilegible sobre el cristal
  (mide la superficie translúcida sobre los colores hexadecimales del `backdrop`).

### Cómo elegir el color de un texto

La escala `--k-ink-*` es una **paleta fija**: sirve igual para texto que para
fondos (el degradado del `Avatar`), así que no cambia con el modo. Lo que
responde al tema es la capa semántica, y es a la que deben apuntar los textos:

| Token | Para qué |
|---|---|
| `--fg-default` | títulos y texto principal |
| `--fg-body` | texto corriente |
| `--fg-muted` | texto secundario, metadatos |
| `--fg-subtle` | marcadores de posición, iconos, texto de ayuda |

Lo mismo con los colores de estado: `--k-danger` es para **rellenos y marcas**;
como texto va `--k-danger-fg`, que en modo oscuro sube el tono para seguir
siendo legible.
