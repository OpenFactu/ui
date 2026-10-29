import type { Story } from '@ladle/react';
import { CompareSlider } from '../src/components/CompareSlider';
import { beforeAfter } from './shared/demoImages';

export const Basico: Story = () => {
  const { before, after } = beforeAfter();
  return (
    <div className="max-w-2xl">
      <CompareSlider before={<img src={before} alt="Antes" />} after={<img src={after} alt="Después" />} />
    </div>
  );
};
