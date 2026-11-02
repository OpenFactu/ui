import * as React from 'react';
import type { Story } from '@ladle/react';
import { ScrollText, TextLink, TextMorph, TextRotate, WaveText } from '../src/components/TextFx';
import { GradientText, Highlight } from '../src/components/TextEffects';
import { Heading } from '../src/components/Typography';
import { Button } from '../src/components/Button';

export const Ola: Story = () => (
  <div className="flex flex-col gap-6">
    <Heading level={2}><WaveText text="Pasa por encima de este título" /></Heading>
    <p className="m-0 text-[length:calc(20px*var(--k-text-scale,1))]"><WaveText mode="loop" text="Esperando respuesta" amplitude={0.18} /></p>
    <p className="m-0 text-[length:calc(20px*var(--k-text-scale,1))]"><WaveText key={Math.random()} mode="once" text="Una sola vez al aparecer" /></p>
  </div>
);

export const PalabraQueSeTurna: Story = () => (
  <Heading level={1} size="display">
    Gestiona tus <TextRotate words={['facturas', 'presupuestos', 'albaranes', 'clientes']} /> sin esfuerzo
  </Heading>
);

export const TextoQueSeTransforma: Story = () => {
  const states = ['Guardar', 'Guardando', 'Guardado'];
  const [i, setI] = React.useState(0);
  const [word, setWord] = React.useState(0);
  const words = ['listen', 'silent', 'enlist', 'tinsel'];
  return (
    <div className="flex flex-col items-start gap-6">
      <Button onClick={() => setI((n) => (n + 1) % states.length)}><TextMorph>{states[i]}</TextMorph></Button>
      <button type="button" className="border-0 bg-transparent p-0 font-display text-[length:calc(40px*var(--k-text-scale,1))] font-bold text-[var(--fg-default,#0a1628)]" onClick={() => setWord((n) => (n + 1) % words.length)}>
        <TextMorph>{words[word]}</TextMorph>
      </button>
    </div>
  );
};

export const Enlaces: Story = () => (
  <p className="m-0 max-w-xl text-[length:calc(16px*var(--k-text-scale,1))] leading-relaxed">
    Un <TextLink href="#a">enlace que dibuja su subrayado</TextLink> al pasar por encima y lo retira por el otro lado, y otro que <TextLink href="#b" underline="rest">ya lo lleva y lo redibuja</TextLink>. Se combinan con <Highlight>un marcador</Highlight> y con <GradientText animated>un degradado</GradientText>.
  </p>
);

export const EncenderAlBajar: Story = () => (
  <div className="flex flex-col">
    <p className="m-0 text-[length:calc(13px*var(--k-text-scale,1))] text-[var(--fg-muted,#52606f)]">Baja poco a poco.</p>
    <div style={{ height: '70vh' }} />
    <ScrollText
      className="m-0 max-w-3xl font-display text-[length:calc(34px*var(--k-text-scale,1))] font-semibold leading-tight text-[var(--fg-default,#0a1628)]"
      text="Cada documento que emites cuenta una historia de tu negocio: a quién sirves, cuánto cuesta lo que haces y qué has aprendido por el camino. Nuestro trabajo es que esa historia se escriba sola."
    />
    <div style={{ height: '90vh' }} />
  </div>
);
