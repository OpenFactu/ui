# Derecha a izquierda

Para árabe, hebreo y otros idiomas de derecha a izquierda, pon `dir="rtl"` en `<html>` o en la parte de la página que lo necesite. Los márgenes, rellenos, bordes, alineaciones y flechas se reflejan solos, porque la librería usa propiedades lógicas de CSS. Requiere Tailwind 3.3 o superior en la app.

```tsx
<html dir="rtl" lang="ar">
```

**Lo que se refleja:** menús y selectores, tablas, formularios, pestañas, el chat, los componentes de IA, listas y paneles. Las flechas de navegación se giran. Los iconos que no indican dirección se quedan como están.

**Lo que sigue de izquierda a derecha, a propósito:** son cosas con un eje propio o con matemáticas ligadas a la posición en pantalla.

- `CodeEditor`: el código se lee de izquierda a derecha.
- `TileMap`: un mapa no se refleja.
- `Gantt`: el tiempo avanza hacia la derecha.
- `Slider`, `SplitPane`, `Carousel`, `CompareSlider` y `SignaturePad`: sus cuentas usan la posición horizontal.
- Los gráficos.

Si alguno necesita reflejarse en tu producto, dímelo y lo trabajamos por componente: reflejar sus cuentas es un cambio aparte.

**Traducciones:** el catálogo no trae ningún idioma de derecha a izquierda. Se añaden con `registerTranslations`, como cualquier otro. Ver [Traducciones](traducciones.md).

**Estado:** se comprueba con la sonda `scripts/probe-rtl.cjs` en Chrome, sobre la story **Dirección**. No se ha revisado con usuarios ni con texto real en árabe o hebreo.
