import { Canvas } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { world } from '../data';
import { useGameStore } from '../store/gameStore';
import { Buildings } from './Buildings';
import { Ground } from './Ground';
import { IsometricCamera } from './IsometricCamera';
import { Player, type PlayerRef } from './Player';
import { Props } from './Props';
import { useInput } from './input/useInput';

/**
 * Raiz da cena 3D.
 *
 * Este módulo é carregado sob demanda (`React.lazy` em GamePage): o
 * @react-three/fiber toca `window` já no import, então ele nunca pode fazer
 * parte da árvore pré-renderizada.
 */
export function Game() {
  const { input } = useInput();
  const playerPosition = useRef<PlayerRef>({ x: world.spawn[0], z: world.spawn[1] });

  const activeZone = useGameStore((state) => state.activeZone);
  const open = useGameStore((state) => state.open);

  // A tecla de interação é registrada pelo useInput como um pulso; aqui ela é
  // consumida e traduzida em "abrir o diálogo da zona onde eu estou".
  useEffect(() => {
    let frame = 0;

    const poll = () => {
      if (input.current.interact) {
        input.current.interact = false;
        const zone = useGameStore.getState().activeZone;
        if (zone && !useGameStore.getState().openDialog) open(zone);
      }
      frame = window.requestAnimationFrame(poll);
    };

    frame = window.requestAnimationFrame(poll);
    return () => window.cancelAnimationFrame(frame);
  }, [input, open, activeZone]);

  return (
    <Canvas
      orthographic
      // 2 é desperdício num mundo de faces chapadas; 1.5 já elimina o serrilhado.
      dpr={[1, 1.5]}
      // Fixo em "always": alternar esta prop reconfigura o loop do renderizador
      // em tempo de execução e era uma das causas do canvas sumir. Com o diálogo
      // aberto quem pausa é a lógica de movimento, não o renderizador.
      frameloop="always"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor('#0d1117')}
    >
      <IsometricCamera target={playerPosition} />

      {/* Sem shadow map: as sombras são quads assados em Ground.tsx. */}
      <hemisphereLight args={['#c9e6ff', '#26303f', 1.15]} />
      <directionalLight position={[8, 14, 6]} intensity={1.35} color="#fff6e0" />
      <ambientLight intensity={0.35} />

      <Ground />
      <Props />
      <Buildings />
      <Player input={input} position={playerPosition} />

      <fog attach="fog" args={['#0d1117', 34, 62]} />
    </Canvas>
  );
}
