import type { Story } from '@ladle/react';
import { Bot } from 'lucide-react';
import { Avatar, AvatarGroup } from '../src/components/Avatar';

export const Tamanos: Story = () => (
  <div className="flex items-center gap-4">
    <Avatar name="Ángel Acedo" size="xs" />
    <Avatar name="Ángel Acedo" size="sm" />
    <Avatar name="Ángel Acedo" size="md" />
    <Avatar name="Ángel Acedo" size="lg" />
  </div>
);
Tamanos.storyName = 'Tamaños';

export const ConEstado: Story = () => (
  <div className="flex items-center gap-4">
    <Avatar name="Ana García" status="online" />
    <Avatar name="Luis Pérez" status="busy" />
    <Avatar name="Marta Ruiz" status="away" />
    <Avatar name="Juan Gómez" status="offline" />
  </div>
);

// Imagen embebida: una URL remota haría la story no determinista (y dependiente
// de la red) en las capturas de regresión visual.
const SAMPLE_IMAGE =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%230d9488"/><stop offset="1" stop-color="%230a1628"/></linearGradient></defs><rect width="80" height="80" fill="url(%23g)"/><circle cx="40" cy="30" r="14" fill="rgba(255,255,255,.85)"/><ellipse cx="40" cy="70" rx="24" ry="18" fill="rgba(255,255,255,.85)"/></svg>`,
  );

export const ConImagen: Story = () => (
  <div className="flex items-center gap-4">
    <Avatar name="Con imagen" src={SAMPLE_IMAGE} />
    <Avatar name="Imagen rota" src="data:image/png;base64,not-a-png" status="online" />
  </div>
);

const GENTE = ['Ana López', 'Luis Romero', 'Marta Ruiz', 'Ángel Acedo', 'Adrián Mora', 'Clínica Sol', 'Talleres Ruiz', 'Prueba humo', 'user_prueba', 'Ventas', 'Soporte', 'Dirección'];

/** Cada persona sale siempre del mismo tono, y se lee igual de bien en claro y en oscuro. */
export const Colores: Story = () => (
  <div className="flex flex-col gap-5">
    <div className="flex flex-wrap gap-3">{GENTE.map((name) => <Avatar key={name} name={name} />)}</div>
    <div className="flex flex-wrap items-center gap-3">
      <Avatar name="Tema" color="accent" />
      <Avatar name="Tinta" color="ink" />
      <Avatar name="Propio" color="#7c3aed" />
      <Avatar name="Con icono" color="accent" fallback={<Bot size={18} />} />
    </div>
  </div>
);

export const Formas: Story = () => (
  <div className="flex items-center gap-4">
    <Avatar name="Ana López" size="xl" />
    <Avatar name="Clínica Sol" size="xl" shape="rounded" />
    <Avatar name="Talleres Ruiz" size="xl" shape="square" status="online" />
  </div>
);

export const Grupo: Story = () => (
  <div className="flex flex-col items-start gap-5">
    <AvatarGroup aria-label="Equipo" people={GENTE.map((name) => ({ name }))} />
    <AvatarGroup aria-label="Pequeño" size="xs" max={3} people={GENTE.map((name) => ({ name }))} />
    <AvatarGroup aria-label="Muestra" size="md" total={128} people={GENTE.slice(0, 3).map((name) => ({ name }))} />
  </div>
);

export const ImagenQueFalla: Story = () => <Avatar name="Ana López" src="data:image/png;base64,AAAA" size="lg" />;
