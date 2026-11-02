# Traducciones

El catálogo de textos y cómo añadir idiomas.

## Traducciones

Todos los textos de la interfaz (botones, etiquetas accesibles, mensajes vacíos, avisos, meses y días…) salen de un
catálogo: `esMessages`, en español, que es el idioma por defecto. La librería no trae otros idiomas; cualquier idioma,
o un cambio de unos pocos textos, se añade sin tocar los componentes.

```tsx
import { I18nProvider, registerTranslations } from '@openfactu/ui';
import en from './i18n/en.json';

registerTranslations('en', en);                    // un idioma entero (o solo una parte)
<I18nProvider locale="en"><App /></I18nProvider>   // el idioma de la app

// Solo unos textos en una zona: se funden sobre el idioma activo.
<I18nProvider messages={{ table: { empty: 'Todavía no hay clientes.' } }}>…</I18nProvider>
```

- **Plantilla para traducir.** `translationTemplate()` devuelve el catálogo español entero, listo para guardar como JSON
  (`npm run i18n:template -- es.json`). Quien traduce rellena las claves que quiera; lo que falte sale del idioma base
  (`fr` para `fr-CA`) y, si tampoco, del español.
- **Formato de los textos.** Texto con `{variables}` (`'Quitar {name}'`), plurales con las reglas del idioma
  (`{ one: '# fila', other: '# filas' }`, `#` es el número, `zero` opcional para el 0) y listas para meses y días.
  Todo cabe en un JSON.
- **Con tipos.** `defineTranslations({...})` autocompleta y comprueba claves al escribir un catálogo en TypeScript.
  Al registrar, `validateTranslations` avisa por consola de claves que no existen, `{variables}` distintas de las del
  español o plurales sin `other`.
- **Prioridad.** La prop del componente (`emptyMessage`, `cancelLabel`, `labels` de la IA…) → el `I18nProvider` más
  cercano → el catálogo registrado del idioma → el español. Sin proveedor, `setDefaultTranslationLocale('en')` cambia
  el idioma de toda la app.
- **En tus componentes.** `useI18n()` da `{ locale, messages, t, format }`: `t('table.selected', { count: 3 })`, con
  las claves tipadas. `useMessages('table')` devuelve un espacio entero.
- **Solo textos.** Los números e importes siguen el `locale` de cada componente (por defecto `es-ES`); las palabras de
  las fechas («julio», «Hoy», «Semana del…») sí están en el catálogo (`dates`).
- **Para encontrar lo que falta.** `pseudoMessages()` envuelve cada texto en `⟦…⟧`: regístralo como un idioma
  (`registerTranslations('pseudo', pseudoMessages())`) y todo lo que se vea sin corchetes no está traducido. En Ladle,
  añade `&k-locale=pseudo` a la URL de cualquier historia.
