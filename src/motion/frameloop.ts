type FrameTask = (now: number) => boolean;

const tasks = new Set<FrameTask>();
let scheduled = false;

function tick(now: number): void {
  scheduled = false;
  for (const task of [...tasks]) {
    try {
      if (!task(now)) tasks.delete(task);
    } catch (error) {
      tasks.delete(task);
      console.error(error);
    }
  }
  if (tasks.size) schedule();
}

function schedule(): void {
  if (scheduled) return;
  scheduled = true;
  requestAnimationFrame(tick);
}

/**
 * El único bucle de animación de esta API: por muchas animaciones que haya, un solo `requestAnimationFrame`, y ninguno
 * sin tareas. La tarea devuelve `true` para seguir el siguiente fotograma. Devuelve la función que la quita.
 */
export function addFrameTask(task: FrameTask): () => void {
  tasks.add(task);
  schedule();
  return () => { tasks.delete(task); };
}
