import * as React from 'react';

/**
 * Pila de superposiciones abiertas. Escape solo debe cerrar la de arriba: si
 * cada una escuchara en `document` por su cuenta, una sola pulsación las
 * cerraría todas — incluida la de debajo, que nadie quería cerrar.
 *
 * Es una pila **compartida** por todas las superposiciones de la librería
 * (diálogos, paleta de comandos, paneles). Tener una por componente vuelve a
 * traer el mismo problema en cuanto se anidan dos distintos.
 */
const pila: string[] = [];

/**
 * Cierra con Escape mientras `activo`, pero solo si es la superposición de
 * arriba. El identificador debe ser estable durante la vida del componente
 * (`React.useId()` sirve).
 */
export function useEscapeStack(id: string, activo: boolean, alCerrar: () => void): void {
  React.useEffect(() => {
    if (!activo) return;
    pila.push(id);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pila[pila.length - 1] !== id) return;
      e.stopPropagation();
      alCerrar();
    };
    // En `document`, no en un elemento concreto: si se escucha solo en el campo
    // de texto, en cuanto se pulsa cualquier botón de dentro el foco se va y
    // Escape deja de funcionar.
    document.addEventListener('keydown', onKey);
    return () => {
      const i = pila.lastIndexOf(id);
      if (i !== -1) pila.splice(i, 1);
      document.removeEventListener('keydown', onKey);
    };
  }, [id, activo, alCerrar]);
}
