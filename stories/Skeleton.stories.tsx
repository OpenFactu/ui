import * as React from 'react';
import type { Story } from '@ladle/react';
import {
  Skeleton,
  SkeletonCard,
  SkeletonList,
  SkeletonPage,
  SkeletonTable,
} from '../src/components/Skeleton';

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-[10px] font-mono uppercase tracking-[1.5px] text-[var(--fg-subtle,#657486)] mb-2">
    {children}
  </p>
);

export const Variantes: Story = () => (
  <div className="flex flex-col gap-8 max-w-2xl">
    <div>
      <Label>text · una línea y varias</Label>
      <div className="flex flex-col gap-4">
        <Skeleton />
        <Skeleton lines={3} />
      </div>
    </div>
    <div>
      <Label>rect y circle</Label>
      <div className="flex items-center gap-4">
        <Skeleton variant="circle" width={48} />
        <Skeleton variant="rect" width={120} height={48} radius="sm" />
        <Skeleton variant="rect" width={200} height={48} radius="md" />
      </div>
    </div>
    <div>
      <Label>animación: pulse · shimmer · none</Label>
      <div className="flex flex-col gap-3">
        <Skeleton height={16} animation="pulse" />
        <Skeleton height={16} animation="shimmer" />
        <Skeleton height={16} animation="none" />
      </div>
    </div>
  </div>
);

/**
 * El fallo de la versión anterior: `className` sustituía el estilo por
 * completo, así que el bloque se quedaba sin color de fondo. Ahora se compone.
 */
export const ClassNameSeCompone: Story = () => (
  <div className="flex flex-col gap-3 max-w-md">
    <Label>className="h-3 w-1/3" — debe verse el fondo</Label>
    <Skeleton className="h-3 w-1/3" />
    <Label>API antigua: count</Label>
    <Skeleton count={3} className="h-4" />
  </div>
);
ClassNameSeCompone.storyName = 'className se compone';

export const Presets: Story = () => (
  <div className="flex flex-col gap-8 max-w-3xl">
    <div>
      <Label>SkeletonCard</Label>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard showAvatar lines={3} showFooter />
      </div>
    </div>
    <div>
      <Label>SkeletonList</Label>
      <SkeletonList rows={4} variant="bordered" />
    </div>
    <div>
      <Label>SkeletonTable</Label>
      <SkeletonTable
        rows={4}
        columns={[{}, {}, { align: 'center' }, { align: 'right' }]}
      />
    </div>
  </div>
);

export const Pagina: Story = () => <SkeletonPage header kpis={4} columns={12} blocks={4} />;
Pagina.storyName = 'SkeletonPage';
