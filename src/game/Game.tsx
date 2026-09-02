import { Cloud, Clouds } from '@react-three/drei';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, TiltShift2, Vignette } from '@react-three/postprocessing';
import { Suspense, useEffect, useMemo, useRef } from 'react';
import { BackSide, MeshBasicMaterial } from 'three';
import { world } from '../data';
import { useGameStore } from '../store/gameStore';
import { DioramaCamera } from './DioramaCamera';
import { LIGHT, PALETTE } from './palette';
import { Player, type PlayerRef } from './Player';
import { useInput } from './input/useInput';
import { Buildings } from './world/Buildings';
import { Island } from './world/Island';
import { Nature } from './world/Nature';

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

  const open = useGameStore((state) => state.open);

  // A tecla de interação chega como um pulso; aqui ela é consumida e traduzida
  // em "abrir o diálogo da zona onde eu estou".
  useEffect(() => {
    let frame = 0;

    const poll = () => {
      if (input.current.interact) {
        input.current.interact = false;
        const state = useGameStore.getState();
        if (state.activeZone && !state.openDialog) open(state.activeZone);
      }
      frame = window.requestAnimationFrame(poll);
    };

    frame = window.requestAnimationFrame(poll);
    return () => window.cancelAnimationFrame(frame);
  }, [input, open]);

  return (
    <Canvas
      // 2 é desperdício num mundo de faces chapadas; 1.5 já elimina o serrilhado.
      dpr={[1, 1.5]}
      // Fixo em "always": alternar esta prop reconfigura o loop do renderizador
      // em tempo de execução e era uma das causas do canvas sumir. Com o diálogo
      // aberto quem pausa é a lógica de movimento, não o renderizador.
      frameloop="always"
      gl={{ antialias: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => gl.setClearColor(PALETTE.sky)}
    >
      <DioramaCamera target={playerPosition} />

      <Sky />
      <Lighting />

      <Suspense fallback={null}>
        <Island />
        <Nature />
        <Buildings />
      </Suspense>

      <Player input={input} position={playerPosition} />

      <Effects />
    </Canvas>
  );
}

/**
 * Iluminação.
 *
 * Sem shadow map: as sombras são discos pintados no chão sob cada objeto. Num
 * estilo de cores chapadas isso lê melhor que sombra projetada, custa quase
 * nada e evita o problema clássico de o frustum da luz não acompanhar o jogador.
 *
 * O volume vem do contraste entre uma direcional cálida e um hemisfério frio,
 * com o verde do chão devolvendo luz por baixo.
 */
function Lighting() {
  return (
    <>
      <hemisphereLight args={[LIGHT.skyBounce, LIGHT.groundBounce, 1.4]} />
      <directionalLight position={[18, 26, 12]} intensity={1.5} color={LIGHT.sun} />
      {/* Preenchimento oposto, para o lado escuro não virar um bloco chapado. */}
      <directionalLight position={[-14, 10, -10]} intensity={0.35} color={LIGHT.skyBounce} />
      <ambientLight intensity={0.4} />
    </>
  );
}

/** Cúpula de céu e algumas nuvens acima do horizonte. */
function Sky() {
  // A cúpula não recebe luz: é o fundo, e sombrear o céu só o sujaria.
  const material = useMemo(
    () => new MeshBasicMaterial({ color: PALETTE.sky, side: BackSide, fog: false }),
    [],
  );

  return (
    <group>
      <mesh material={material}>
        <sphereGeometry args={[180, 24, 16]} />
      </mesh>

      <Clouds material={MeshBasicMaterial} limit={60}>
        <Cloud
          seed={11}
          segments={20}
          bounds={[40, 3, 40]}
          volume={9}
          position={[0, 32, -20]}
          color="#ffffff"
          opacity={0.5}
          speed={0.08}
        />
        <Cloud
          seed={4}
          segments={14}
          bounds={[32, 2.5, 32]}
          volume={7}
          position={[22, 28, 16]}
          color={PALETTE.skyHorizon}
          opacity={0.4}
          speed={0.06}
        />
      </Clouds>
    </group>
  );
}

/**
 * Pós-processamento.
 *
 * O tilt-shift é o que fecha o estilo: desfocar as faixas de cima e de baixo
 * engana a percepção de escala e faz o mundo parecer uma maquete de mesa em vez
 * de um cenário em tamanho real. É o mesmo recurso que o remake de Link's
 * Awakening usa o tempo todo.
 */
function Effects() {
  return (
    <EffectComposer enableNormalPass={false}>
      <TiltShift2 blur={0.2} taper={0.4} start={[0.5, 0.28]} end={[0.5, 0.78]} samples={6} />
      <Vignette offset={0.32} darkness={0.35} />
    </EffectComposer>
  );
}
